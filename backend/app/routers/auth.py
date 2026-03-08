from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models as models
import app.schemas as schemas
from database import get_db

routes = APIRouter(prefix="/user",tags=["Authentication"])


@routes.post("/signup", response_model=schemas.UserResponse)
def signup(email: str, pat: str, password: str, level: str, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email Already Registered")
        
    new_user = models.User(email=email, github_pat=pat, password=password, experience_lvl=level)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    response = schemas.UserResponse.model_validate(new_user)
    response.raw_pat = pat
    return response


@routes.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user or user.password != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    return {"message": "Login Successful", "email": user.email}

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

