import boto3
import psycopg2
import time
from botocore.config import Config

# --- CONFIGURATION ---
# Point to your local mock server
MOCK_RDS_URL = "http://localhost:8000"

# Dummy credentials (required by boto3, but not validated by our mock)
AWS_CREDENTIALS = {
    "aws_access_key_id": "test",
    "aws_secret_access_key": "test",
    "region_name": "us-east-1"
}

def main():
    print("1. Initialize boto3 client pointing to local mock...")
    # This is the KEY step: setting endpoint_url to your local proxy
    rds = boto3.client(
        "rds",
        endpoint_url=MOCK_RDS_URL,
        **AWS_CREDENTIALS
    )

    db_identifier = "my-local-app-db"
    db_name = "appdb"
    master_user = "admin"
    master_pass = "secret123"

    print(f"2. Requesting new RDS instance '{db_identifier}'...")
    try:
        response = rds.create_db_instance(
            DBInstanceIdentifier=db_identifier,
            DBInstanceClass="db.t3.micro",
            Engine="postgres",
            MasterUsername=master_user,
            MasterUserPassword=master_pass,
            DBName=db_name
        )
        
        # In real AWS, you'd wait for status to be 'available'. 
        # Our mock is fast, but let's grab the connection info.
        db_instance = response["DBInstance"]
        endpoint = db_instance["Endpoint"]
        host = endpoint["Address"]
        port = endpoint["Port"]
        
        print(f"   SUCCESS! Database created.")
        print(f"   Connection Info: host={host}, port={port}, db={db_name}, user={master_user}")

    except Exception as e:
        print(f"   Error (maybe it already exists?): {e}")
        # If it exists, we need to find its port
        response = rds.describe_db_instances(DBInstanceIdentifier=db_identifier)
        endpoint = response["DBInstances"][0]["Endpoint"]
        host = endpoint["Address"]
        port = endpoint["Port"]
        print(f"   Found existing instance at {host}:{port}")

    # 3. Connect to the ACTUAL database using a standard driver (psycopg2)
    # This proves we are talking to a real Postgres container spinning locally
    print("\n3. Connecting to the database instance...")
    try:
        conn = psycopg2.connect(
            host="localhost", # The mock returns 'localhost'
            port=port,
            database=db_name,
            user=master_user,
            password=master_pass
        )
        
        cur = conn.cursor()
        
        # Create a table
        print("   Creating table 'users'...")
        cur.execute("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(50));")
        
        # Insert data
        print("   Inserting dummy data...")
        cur.execute("INSERT INTO users (name) VALUES ('Alice'), ('Bob');")
        
        # Query data
        print("   Querying data...")
        cur.execute("SELECT * FROM users;")
        rows = cur.fetchall()
        print(f"   Results: {rows}")
        
        conn.commit()
        cur.close()
        conn.close()
        print("\nDONE: Successfully interacted with local 'AWS RDS' database!")
        
    except Exception as e:
        print(f"\nConnection Failed: {e}")
        print("Make sure you have psycopg2 installed: pip install psycopg2-binary")

if __name__ == "__main__":
    main()
