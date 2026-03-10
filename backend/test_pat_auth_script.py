import os
import sys
import unittest.mock
import sqlalchemy

original_create_engine = sqlalchemy.create_engine
sqlalchemy.create_engine = unittest.mock.MagicMock()

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock

from fastapi import FastAPI

# Ensure the backend directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.routers.PAT_auth import routes as pat_routes
from database import get_db, Base
import models
from app.utils.encryption import decrypt_pat

app = FastAPI()
app.include_router(pat_routes)

# Set up the test database (SQLite in-memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = original_create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

from app.schemas import PATUpdate
from app.routers.PAT_auth import validate_and_save_pat

def setup_test_user(db):
    user = models.User(email="test@example.com", password="hashed_password", experience_lvl="Beginner")
    db.add(user)
    db.commit()
    db.refresh(user)

def test_validate_and_save_pat_success():
    db = TestingSessionLocal()
    setup_test_user(db)
    
    pat_to_test = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
    
    with patch("app.routers.PAT_auth.requests.get") as mock_get:
        # Mock GitHub user response
        mock_response = MagicMock()
        mock_response.json.return_value = {"login": "testuser"}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        pat_data = PATUpdate(email="test@example.com", pat=pat_to_test)
        response = validate_and_save_pat(pat_data=pat_data, db=db)
        
        assert response["message"] == "GitHub PAT validated and saved successfully"
        assert response["github_username"] == "testuser"
        
        # Verify database entry and encryption
        user_in_db = db.query(models.User).filter(models.User.email == "test@example.com").first()
        assert user_in_db is not None, "User not found in database"
        
        # Encrypted PAT should not be equal to plain text PAT
        assert user_in_db.github_pat != pat_to_test, "PAT was saved as plain text!"
        assert user_in_db.github_pat is not None, "PAT was not saved"
        
        # Decrypted PAT should match original
        decrypted_pat = decrypt_pat(user_in_db.github_pat)
        assert decrypted_pat == pat_to_test, "Decrypted PAT does not match the original PAT"
        
    print("✅ test_validate_and_save_pat_success passed! Database entry and encryption works correctly.")
    db.close()

if __name__ == "__main__":
    test_validate_and_save_pat_success()
