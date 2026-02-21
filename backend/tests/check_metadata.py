import sqlite3
import os

def check_metadata():
    db_path = "aws_mock_metadata.db"
    if not os.path.exists(db_path):
        print(f"{db_path} not found.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, engine, port, local_path FROM rds_instances")
        rows = cursor.fetchall()
        print(f"RDS Instances in Metadata ({len(rows)}):")
        for row in rows:
            print(f" ID: {row[0]}, Engine: {row[1]}, Port: {row[2]}, LocalPath: {row[3]}")
    except Exception as e:
        print(f"Error querying metadata: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_metadata()
