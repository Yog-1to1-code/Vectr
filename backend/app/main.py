from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware #To prevent Network Error 
from app.routers import auth,dashboard
#TO import Local Modules 
import models


from database import engine
models.Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  # Allows all headers (like your GitHub PAT)
)

#Plugin in the routers
app.include_router(auth.routes)
app.include_router(dashboard.routes)

# API ROUTES
@app.get('/')
def read_root():
    return {'Hello': 'Amazon Nova'}



