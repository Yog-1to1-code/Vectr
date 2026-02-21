import os
from pathlib import Path
from dotenv import load_dotenv

# Get the directory of the current file
BASE_DIR = Path(__file__).resolve().parent.parent.parent
dot_env = BASE_DIR / ".env"

load_dotenv(dotenv_path=dot_env)

class Settings:
    PROJECT_NAME: str = "Vectr Backend"
    
    # AWS Configuration
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "mock_key")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "mock_secret")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    
    # Local Proxy Configuration
    AWS_ENDPOINT_URL: str = os.getenv("AWS_ENDPOINT_URL", "http://localhost:8000")
    
    # Database Configuration
    # Default to a local SQLite database for zero-config development if no DATABASE_URL is provided
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

settings = Settings()
