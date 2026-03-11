from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import requests
import os
import models as models
import app.schemas as schemas
from database import get_db
from app.utils.encryption import encrypt_pat

routes = APIRouter(prefix="/user", tags=["Validation"])

@routes.post("/validate-pat")
def validate_and_save_pat(pat_data: schemas.PATUpdate, db: Session = Depends(get_db)):
    # 1. Validate the GitHub PAT
    headers = {
        "Authorization": f"token {pat_data.pat}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    try:
        res = requests.get("https://api.github.com/user", headers=headers)
        res.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub PAT.")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to connect to GitHub.")
        
    # 2. Save Encrypted PAT to the User database
    user = db.query(models.User).filter(models.User.email == pat_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Encrypt the PAT before saving it to the database
    encrypted_pat = encrypt_pat(pat_data.pat)
    user.github_pat = encrypted_pat
    
    db.commit()
    db.refresh(user)
    
    github_user = res.json()
    
    return {
        "message": "GitHub PAT validated and saved successfully",
        "github_username": github_user.get("login")
    }
