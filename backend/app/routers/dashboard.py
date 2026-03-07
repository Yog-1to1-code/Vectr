from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models as models
import app.schemas as schemas
from database import get_db
import requests as rq

routes = APIRouter(prefix="/user",tags=["Authentication"])
#Dashnoard routes
@routes.get("/user/dasboard", response_model = schemas.DashboardResponse)
def user_dashboard(email:str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    if not user.github_pat:
        raise HTTPException(status_code=400,detail="User's Github PAT is missing")
    pat = user.github_pat
    exp_level = user.experience_lvl.lower()
    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json"
    }
    try:
        repos_url = "https://api.github.com/user/repos?sort=updated&per_page=15"
        repos_res = rq.get(repos_url, headers=headers)
        repos_res.raise_for_status()

        languages = [repo.get("language") for repo in repos_res.json() if repo.get("language")]
        top_language = max(set(languages), key=languages.count) if languages else "Python"

#Fetches Top 15 Repos from and returns Top5 to the frontend 
        if exp_level == "beginner":
            search_url = f"https://api.github.com/search/repositories?q=language:{top_language}+topic:good-first-issue&sort=stars&order=desc"
        else:
            search_url = f"https://api.github.com/search/repositories?q=language:{top_language}+stars:>1000&sort=updated&order=desc"
    
        #If user is new on Github we choose Python as defalut language 
        languages = [repo.get("language") for repo in repos_res.json() if repo.get("language")]
        
        if not languages:
            top_language = "Python" 
        else:
            top_language = max(set(languages), key=languages.count)
        
        search_res = rq.get(search_url,headers=headers)
        search_res.raise_for_status() #Checks for any unknown errors
        raw_items = search_res.json().get("items", [])[:10] # Grab top 10 results
        recommended_projects = []
        
        for item in raw_items:
            recommended_projects.append(
                schemas.DashboardProject(
                    org_name=item["owner"]["login"],
                    project_name=item["name"],
                    github_link=item["html_url"],
                    description=item.get("description"),
                    tech_stack=item.get("language", "Unknown"),
                    stars=item.get("stargazers_count", 0),
                    is_good_first_issue_friendly=(exp_level == "beginner")
                )
            )
        return schemas.DashboardResponse(
            user_email=email,
            experience_level=exp_level.capitalize(),
            primary_language=top_language,
            recommended_projects=recommended_projects
        )
    except rq.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub PAT token. Please update it.")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch data from GitHub.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")
