from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
load_dotenv()


#DATABASE SETUP & MODELS
DB_USER = "postgres"
DB_PASSWORD = os.getenv("DB_PASSWORD")
ENDPOINT = os.getenv("ENDPOINT")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL =  f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{ENDPOINT}:5432/{DB_NAME}?sslmode=require"
engine = create_engine(
    DATABASE_URL,
    pool_recycle=280,      # Recycle connections before cloud DB timeout (usually 300s)
    pool_pre_ping=True,    # Test connections before use, auto-reconnect stale ones
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
Base.metadata.create_all(bind=engine) 



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()