import boto3
import time
import pprint

# Configuration
PROXY_URL = "http://localhost:8000"
REGION_NAME = "us-east-1"
AWS_ACCESS_KEY_ID = "test"
AWS_SECRET_ACCESS_KEY = "test"

def test_rds_proxy():
    print(f"Connecting to RDS Proxy at {PROXY_URL}...")
    
    # Create an RDS client pointing to our local proxy
    rds = boto3.client(
        service_name="rds",
        region_name=REGION_NAME,
        endpoint_url=PROXY_URL,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )

    db_instance_id = "test-db-1"

    print("\n--- 1. Creating DB Instance ---")
    try:
        response = rds.create_db_instance(
            DBInstanceIdentifier=db_instance_id,
            DBInstanceClass="db.t3.micro",
            Engine="postgres",
            MasterUsername="postgres",
            MasterUserPassword="password",
            DBName="testdb"
        )
        print("Create Response:")
        pprint.pprint(response['DBInstance'])
    except Exception as e:
        print(f"Error creating DB instance: {e}")

    print("\n--- 2. Describing DB Instances ---")
    try:
        response = rds.describe_db_instances()
        print("Describe Response:")
        instances = response.get('DBInstances', [])
        for i in instances:
            pprint.pprint(i)
            
        found = any(i['DBInstanceIdentifier'] == db_instance_id for i in instances)
        if found:
            print(f"SUCCESS: Found instance {db_instance_id}")
        else:
            print(f"FAILURE: Instance {db_instance_id} not found")
            
    except Exception as e:
         print(f"Error describing DB instances: {e}")

    # Wait a bit if actual docker containers are spinning up (though local mock is fast)
    time.sleep(2)

    print("\n--- 3. Deleting DB Instance ---")
    try:
        response = rds.delete_db_instance(
            DBInstanceIdentifier=db_instance_id,
            SkipFinalSnapshot=True
        )
        print("Delete Response:")
        pprint.pprint(response['DBInstance'])
    except Exception as e:
        print(f"Error deleting DB instance: {e}")
        
    print("\n--- 4. Verify Deletion ---")
    try:
        # Give it a moment if docker is stopping
        time.sleep(2)
        response = rds.describe_db_instances()
        instances = response.get('DBInstances', [])
        # Check if it's gone or marked as deleted (implementation details vary)
        # Our implementation might just stop showing it or show status=deleted
        found = False
        for i in instances:
             if i['DBInstanceIdentifier'] == db_instance_id:
                 print(f"Instance still visible with status: {i['DBInstanceStatus']}")
                 found = True
        
        if not found:
            print("SUCCESS: Instance no longer listed (deleted)")

    except Exception as e:
        print(f"Error verifying deletion: {e}")

if __name__ == "__main__":
    test_rds_proxy()
