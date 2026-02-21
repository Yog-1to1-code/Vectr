from pathlib import Path
import os

def find_docs():
    print(f"Path.home(): {Path.home()}")
    print(f"os.path.expanduser('~'): {os.path.expanduser('~')}")
    
    docs = Path.home() / "Documents"
    print(f"Docs exists: {docs.exists()} at {docs}")
    
    if docs.exists():
        vectr_rds = docs / "VectrRDS"
        print(f"VectrRDS exists: {vectr_rds.exists()} at {vectr_rds}")
        if vectr_rds.exists():
            print(f"Contents of VectrRDS: {list(vectr_rds.iterdir())}")

    # Check for OneDrive redirection
    onedrive_docs = Path.home() / "OneDrive" / "Documents"
    if onedrive_docs.exists():
        print(f"OneDrive Docs exists: {onedrive_docs.exists()} at {onedrive_docs}")
        vectr_rds = onedrive_docs / "VectrRDS"
        print(f"VectrRDS in OneDrive exists: {vectr_rds.exists()} at {vectr_rds}")
        if vectr_rds.exists():
            print(f"Contents of VectrRDS in OneDrive: {list(vectr_rds.iterdir())}")

if __name__ == "__main__":
    find_docs()
