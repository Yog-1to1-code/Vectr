import logging
import os
import docker
import time
import random
import uuid
import sqlite3
from pathlib import Path
from fastapi import Request
from fastapi.responses import Response

logger = logging.getLogger("aws-mock-rds")

# Initialize Docker client
docker_client = None
try:
    docker_client = docker.from_env()
    docker_client.ping() # Check connectivity
except Exception as e:
    logger.warning(f"Failed to initialize Docker client: {e}. Running in Mock Metadata Mode.")
    docker_client = None

DEFAULT_RDS_PORT_START = 5433
active_rds_ports = set()
MOCK_DB_INSTANCES = {} # In-memory store for fallback mode
MOCK_RDS_PORT = int(os.getenv("MOCK_RDS_PORT", "5432"))

# Map engine to docker image
ENGINE_MAP = {
    "postgres": "postgres:latest",
    "mysql": "mysql:latest"
}

def get_free_port():
    if not docker_client:
        return MOCK_RDS_PORT
        
    port = DEFAULT_RDS_PORT_START
    while port in active_rds_ports:
        port += 1
    active_rds_ports.add(port)
    return port

async def handle_rds_request(request: Request):
    try:
        # Check both query params (GET) and form data (POST)
        # AWS CLI uses POST with form-urlencoded, but some SDKs might use GET
        values = {}
        if request.method == "POST":
            form = await request.form()
            values = dict(form)
        else:
            values = dict(request.query_params)
            
        action = values.get("Action")
        
        if action == "CreateDBInstance":
            return await create_db_instance(values)
        elif action == "DescribeDBInstances":
            return await describe_db_instances(values)
        elif action == "DeleteDBInstance":
            return await delete_db_instance(values)
        else:
            return Response(content=f"<Error><Code>InvalidAction</Code><Message>Action {action} not supported</Message></Error>", media_type="application/xml", status_code=400)
    except Exception as e:
        logger.error(f"Error handling RDS request: {e}", exc_info=True)
        return Response(content=f"<Error><Code>InternalError</Code><Message>{str(e)}</Message></Error>", media_type="application/xml", status_code=500)

async def create_db_instance(params):
    db_id = params.get("DBInstanceIdentifier")
    engine = params.get("Engine", "postgres")
    master_username = params.get("MasterUsername", "postgres")
    master_password = params.get("MasterUserPassword", "password")
    db_name = params.get("DBName", "mydb")
    
    port = get_free_port()
    
    # Try Docker if available
    if docker_client:
        image = ENGINE_MAP.get(engine)
        if not image:
            return Response(content=f"<Error><Code>InvalidParameterValue</Code><Message>Engine {engine} not supported</Message></Error>", media_type="application/xml", status_code=400)

        container_name = f"aws-mock-rds-{db_id}"
        env_vars = {}
        if engine == "postgres":
            env_vars = {"POSTGRES_USER": master_username, "POSTGRES_PASSWORD": master_password, "POSTGRES_DB": db_name}
        elif engine == "mysql":
            env_vars = {"MYSQL_ROOT_PASSWORD": master_password, "MYSQL_DATABASE": db_name, "MYSQL_USER": master_username, "MYSQL_PASSWORD": master_password}

        try:
            try:
                existing = docker_client.containers.get(container_name)
                if existing.status == "running":
                     return Response(content=f"<Error><Code>DBInstanceAlreadyExists</Code><Message>DB Instance {db_id} already exists</Message></Error>", media_type="application/xml", status_code=400)
                existing.remove()
            except docker.errors.NotFound:
                pass

            docker_client.containers.run(
                image,
                name=container_name,
                environment=env_vars,
                ports={5432 if engine == "postgres" else 3306: port},
                detach=True
            )
        except Exception as e:
            logger.error(f"Failed to create container: {e}")
            return Response(content=f"<Error><Code>InternalFailure</Code><Message>{str(e)}</Message></Error>", media_type="application/xml", status_code=500)
    else:
        # Falback to mock
        if db_id in MOCK_DB_INSTANCES:
             return Response(content=f"<Error><Code>DBInstanceAlreadyExists</Code><Message>DB Instance {db_id} already exists</Message></Error>", media_type="application/xml", status_code=400)
             
        # Create SQLite file in Documents if requested
        documents_path = Path.home() / "Documents" / "VectrRDS"
        try:
            documents_path.mkdir(parents=True, exist_ok=True)
            db_path = documents_path / f"{db_id}.sqlite"
            
            # Initialize SQLite DB
            conn = sqlite3.connect(db_path)
            conn.close()
            logger.info(f"Created mocked SQLite database at {db_path}")
        except Exception as e:
            logger.error(f"Failed to create SQLite database file: {e}")
            # Continue but warn? Or fail? Let's treat as success for API call but log error.
            db_path = "memory"

        MOCK_DB_INSTANCES[db_id] = {
            "DBInstanceIdentifier": db_id,
            "DBInstanceClass": "db.t3.micro",
            "Engine": engine,
            "DBInstanceStatus": "available",
            "MasterUsername": master_username,
            "DBName": db_name,
            "Endpoint": {"Address": "localhost", "Port": port}, # Ensure user knows the port
            "AllocatedStorage": 20,
            "InstanceCreateTime": "2023-01-01T00:00:00Z",
            "AvailabilityZone": "us-east-1a",
            "LocalPath": str(db_path)
        }
    
    # Return XML
    response_xml = f"""
    <CreateDBInstanceResponse xmlns="http://rds.amazonaws.com/doc/2014-10-31/">
      <CreateDBInstanceResult>
        <DBInstance>
          <DBInstanceIdentifier>{db_id}</DBInstanceIdentifier>
          <DBInstanceClass>db.t3.micro</DBInstanceClass>
          <Engine>{engine}</Engine>
          <DBInstanceStatus>available</DBInstanceStatus>
          <MasterUsername>{master_username}</MasterUsername>
          <DBName>{db_name}</DBName>
          <Endpoint>
            <Address>localhost</Address>
            <Port>{port}</Port>
          </Endpoint>
        </DBInstance>
      </CreateDBInstanceResult>
      <ResponseMetadata>
        <RequestId>{uuid.uuid4()}</RequestId>
      </ResponseMetadata>
    </CreateDBInstanceResponse>
    """
    return Response(content=response_xml.strip(), media_type="application/xml")

async def describe_db_instances(params):
    db_id = params.get("DBInstanceIdentifier")
    
    instances = []
    
    if docker_client:
        containers = docker_client.containers.list(filters={"name": "aws-mock-rds-"})
        for c in containers:
            name = c.name.replace("aws-mock-rds-", "")
            if db_id and name != db_id: continue
            
            c.reload()
            ports = c.attrs['NetworkSettings']['Ports']
            host_port = 5432
            # Very basic extraction
            for p_list in ports.values():
                if p_list:
                    host_port = p_list[0]['HostPort']
                    break
            
            instances.append({
                "DBInstanceIdentifier": name,
                "Engine": "postgres", # Simplified
                "DBInstanceStatus": c.status,
                "Endpoint": {"Address": "localhost", "Port": host_port}
            })
    else:
        if db_id:
            if db_id in MOCK_DB_INSTANCES:
                instances.append(MOCK_DB_INSTANCES[db_id])
            else:
                 return Response(content=f"<Error><Code>DBInstanceNotFound</Code><Message>DBInstance {db_id} not found</Message></Error>", media_type="application/xml", status_code=404)
        else:
            instances = list(MOCK_DB_INSTANCES.values())

    instances_xml = ""
    for i in instances:
        instances_xml += f"""
        <DBInstance>
          <DBInstanceIdentifier>{i['DBInstanceIdentifier']}</DBInstanceIdentifier>
          <DBInstanceClass>db.t3.micro</DBInstanceClass>
          <Engine>{i['Engine']}</Engine>
          <DBInstanceStatus>{i['DBInstanceStatus']}</DBInstanceStatus>
          <Endpoint>
            <Address>{i['Endpoint']['Address']}</Address>
            <Port>{i['Endpoint']['Port']}</Port>
          </Endpoint>
        </DBInstance>
        """

    response_xml = f"""
    <DescribeDBInstancesResponse xmlns="http://rds.amazonaws.com/doc/2014-10-31/">
      <DescribeDBInstancesResult>
        <DBInstances>
          {instances_xml}
        </DBInstances>
      </DescribeDBInstancesResult>
      <ResponseMetadata>
        <RequestId>{uuid.uuid4()}</RequestId>
      </ResponseMetadata>
    </DescribeDBInstancesResponse>
    """
    return Response(content=response_xml.strip(), media_type="application/xml")

async def delete_db_instance(params):
    db_id = params.get("DBInstanceIdentifier")
    
    if docker_client:
        container_name = f"aws-mock-rds-{db_id}"
        try:
            container = docker_client.containers.get(container_name)
            container.stop()
            container.remove()
        except docker.errors.NotFound:
            return Response(content=f"<Error><Code>DBInstanceNotFound</Code><Message>DBInstance {db_id} not found</Message></Error>", media_type="application/xml", status_code=404)
    else:
        if db_id in MOCK_DB_INSTANCES:
            instance = MOCK_DB_INSTANCES[db_id]
            # Try to delete file
            if "LocalPath" in instance:
                try:
                    p = Path(instance["LocalPath"])
                    if p.exists():
                        p.unlink()
                        logger.info(f"Deleted mocked SQLite database at {p}")
                except Exception as e:
                    logger.error(f"Failed to delete SQLite file: {e}")
            
            del MOCK_DB_INSTANCES[db_id]
        else:
             return Response(content=f"<Error><Code>DBInstanceNotFound</Code><Message>DBInstance {db_id} not found</Message></Error>", media_type="application/xml", status_code=404)
        
    response_xml = f"""
    <DeleteDBInstanceResponse xmlns="http://rds.amazonaws.com/doc/2014-10-31/">
      <DeleteDBInstanceResult>
        <DBInstance>
          <DBInstanceIdentifier>{db_id}</DBInstanceIdentifier>
          <DBInstanceStatus>deleted</DBInstanceStatus>
        </DBInstance>
      </DeleteDBInstanceResult>
      <ResponseMetadata>
        <RequestId>{uuid.uuid4()}</RequestId>
      </ResponseMetadata>
    </DeleteDBInstanceResponse>
    """
    return Response(content=response_xml.strip(), media_type="application/xml")
