from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import requests
import os
import models as models
import app.schemas as schemas
from database import get_db

routes = APIRouter(prefix="/user",tags=["Authentication"])


@routes.post("/signup", response_model=schemas.UserResponse)
def signup(email: str, pat: str, password: str, level: str, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email Already Registered")
        
    new_user = models.User(email=email, github_pat=pat if pat else None, password=password, experience_lvl=level)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    response = schemas.UserResponse.model_validate(new_user)
    response.raw_pat = pat if pat else ""
    return response


@routes.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user or user.password != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    return {"message": "Login Successful", "email": user.email}

@routes.post("/google-login")
def google_login(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
        
    token = auth_header.split(" ")[1]
    
    # We use Google's Identity Toolkit API to verify the Firebase ID token
    api_key = os.getenv("FIREBASE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Firebase API key not configured")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}"
    resp = requests.post(url, json={"idToken": token})
    
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
        
    data = resp.json()
    users = data.get("users", [])
    if not users:
        raise HTTPException(status_code=401, detail="User not found in token")
        
    email = users[0].get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email associated with this Google account")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        # Sign up the user automatically
        new_user = models.User(
            email=email, 
            github_pat=None, 
            password="oauth_managed", 
            experience_lvl="Intermediate"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
    return {"message": "Login Successful", "email": email}


#To update the exp lvl
@routes.put("/{email}/experience")
def updated_exp(email: str, updated_data: schemas.ExperienceUpdate, db: Session = Depends(get_db)): 
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
        
    user.experience_lvl = updated_data.experience_lvl
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Experience level updated successfully!",
        "current_level": user.experience_lvl
    }


@routes.put("/save-pat")
def save_pat(pat_data: schemas.PATUpdate, db: Session = Depends(get_db)):
    # 1. Find the user by their email
    user = db.query(models.User).filter(models.User.email == pat_data.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
        
    # 2. Save the PAT they just submitted
    user.github_pat = pat_data.pat
    db.commit()
    
    return {"message": "GitHub PAT securely linked to your account!"}