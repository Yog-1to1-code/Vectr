from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware #To prevent Network Error 
from app.routers import auth,dashboard,PAT_auth,contribution_flow,repos,ask_nova
#TO import Local Modules 
import models


from database import engine
from dotenv import load_dotenv

load_dotenv()
try:
    models.Base.metadata.create_all(bind=engine)
except Exception:
    pass  # Already handled in database.py

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173", 
        "http://localhost:5174", "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

#Plugin in the routers
app.include_router(auth.routes)
app.include_router(dashboard.routes)
app.include_router(PAT_auth.routes)
app.include_router(contribution_flow.routes)
app.include_router(repos.routes)
app.include_router(ask_nova.routes)

# API ROUTES
@app.get('/')
def read_root():
    return {'Hello': 'Amazon Nova'}



