import boto3
import time
import sys
import os
from sqlalchemy import create_engine, text

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings

def test_proxy_integration():
    print("--- RDS Proxy + SQLAlchemy Integration Test ---")
    
    # 1. Initialize boto3 client pointing to our proxy
    rds = boto3.client(
        'rds',
        endpoint_url=settings.AWS_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )
    
    db_id = f"int-test-{int(time.time())}"
    user = "testuser"
    password = "testpassword"
    db_name = "testdb"
    
    try:
        # Check if any old instances need cleanup (optional)
        print("Checking for existing instances...")
        existing = rds.describe_db_instances()
        for inst in existing['DBInstances']:
             if inst['DBInstanceIdentifier'].startswith("int-test-"):
                  print(f"Cleaning up old instance: {inst['DBInstanceIdentifier']}")
                  rds.delete_db_instance(DBInstanceIdentifier=inst['DBInstanceIdentifier'], SkipFinalSnapshot=True)

        # 2. Create DB Instance via Proxy
        print(f"Creating DB Instance '{db_id}' via proxy...")
        resp = rds.create_db_instance(
            DBInstanceIdentifier=db_id,
            DBInstanceClass="db.t3.micro",
            Engine="postgres",
            MasterUsername=user,
            MasterUserPassword=password,
            DBName=db_name
        )
        
        endpoint = resp['DBInstance']['Endpoint']
        address = endpoint['Address']
        port = endpoint['Port']
        print(f"Proxy returned endpoint: {address}:{port}")
        
        # 3. Verify instance exists and get details
        print(f"Describing DB Instance '{db_id}'...")
        desc = rds.describe_db_instances(DBInstanceIdentifier=db_id)
        print(f"Describe response: {desc['DBInstances'][0]}")
        
        endpoint = desc['DBInstances'][0]['Endpoint']
        # Use describe response for address/port
        address = endpoint['Address']
        port = endpoint['Port']
        print(f"Proxy returned endpoint: {address}:{port}")
        
        # 4. Construct SQLAlchemy URL
        db_url = f"postgresql://{user}:{password}@{address}:{port}/{db_name}"
        print(f"Attempting SQLAlchemy connection to: {db_url}")
        
        engine = create_engine(db_url)
        
        # 4. Test connection via SQLAlchemy with retries
        max_retries = 10
        connected = False
        print("Waiting for database to be ready (this can take up to 20 seconds)...")
        for i in range(max_retries):
            try:
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    print(f"SUCCESS: SQLAlchemy connected to Proxy-managed RDS! Result: {result.fetchone()}")
                    connected = True
                    break
            except Exception as e:
                print(f"  Attempt {i+1}/{max_retries} failed, waiting 3s...")
                time.sleep(3)
        
        if not connected:
            print("PG Connection failed after retries.")
            
            # Check for local_path if we can (though boto3 response doesn't usually include it)
            # We'll just try to find the sqlite file in common locations
            possible_paths = [
                os.path.join(os.path.expanduser("~"), "Documents", "VectrRDS", f"{db_id}.sqlite"),
                os.path.join(os.path.expanduser("~"), "OneDrive", "Documents", "VectrRDS", f"{db_id}.sqlite"),
                os.path.abspath(os.path.join(os.getcwd(), f"{db_id}.sqlite"))
            ]
            
            found = False
            for sqlite_path in possible_paths:
                if os.path.exists(sqlite_path):
                    sqlite_url = f"sqlite:///{sqlite_path}"
                    print(f"Found SQLite fallback at {sqlite_path}. Testing...")
                    sqlite_engine = create_engine(sqlite_url)
                    with sqlite_engine.connect() as conn:
                        result = conn.execute(text("SELECT 1"))
                        print(f"SUCCESS: SQLAlchemy connected to Proxy-managed SQLite ! Result: {result.fetchone()}")
                        found = True
                        break
            
            if not found:
                print("No SQLite fallback found in common locations.")

    except Exception as e:
        print(f"Integration test failed: {e}")
    # Cleanup removed for debugging

if __name__ == "__main__":
    test_proxy_integration()
