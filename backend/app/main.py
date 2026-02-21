from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.core.database import engine, get_db, Base
from app.core.config import settings

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

@app.get("/")
async def root():
    return {"message": "Welcome to Vectr API", "project": settings.PROJECT_NAME}

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Simple check to see if we can query the DB
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
