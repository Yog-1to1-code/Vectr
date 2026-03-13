from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models as models
import app.schemas as schemas
from database import get_db
import requests as rq
from app.utils.encryption import decrypt_pat
from typing import Optional

routes = APIRouter(prefix="/contribution", tags=["Contribution Flow"])

# Popular Orgs fallback
POPULAR_ORGS = ["facebook", "vercel", "microsoft", "google", "freeCodeCamp"]

@routes.get("/start", response_model=schemas.StartContributionResponse)
def start_contribution(
    email: str, 
    language: Optional[str] = Query(None, description="Optional. If provided, filters orgs by this language."),
    search_query: Optional[str] = Query(None, description="Optional. Seach for specific Github Orgs"),
    db: Session = Depends(get_db)):
    
    # 1. Fetch User 
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
        
    exp_level = user.experience_lvl.lower()
    
    # BEGINNER FLOW: Prompt for Language Selection first (unless they already provided one)
    if exp_level == "beginner" and not language and not search_query:
        # Return a list of supported or popular languages for them to choose from
        supported_languages = ["Python", "JavaScript", "TypeScript", "Java", "C++", "Go", "Rust", "HTML/CSS"]
        return schemas.StartContributionResponse(
            next_step="SELECT_LANGUAGE",
            languages=supported_languages
        )
        
    # INTERMEDIATE / EXPERT / BEGINNER (WITH LANGUAGE): Proceed to Org Selection
    if not user.github_pat:
        raise HTTPException(status_code=400, detail="User's Github PAT is missing")
        
    pat = decrypt_pat(user.github_pat)
    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json"
    }

    organizations = []
    
    try:
        if search_query:
            # SEARCH ORGS: https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28#search-users
            search_url = "https://api.github.com/search/users"
            params = {
                "q": f"{search_query} type:org",
                "per_page": 10
            }
            res = rq.get(search_url, headers=headers, params=params)
            res.raise_for_status()
            
            items = res.json().get("items", [])
            for item in items:
                organizations.append(
                    schemas.OrganizationItem(
                        name=item["login"],
                        description=None, # Search API doesn't return full details
                        avatar_url=item["avatar_url"],
                        url=item["html_url"],
                        language=None
                    )
                )
        elif language:
            # FIND ORGS BY LANGUAGE (Query Github Repos by Language, then extract orgs)
            search_language = "HTML" if language == "HTML/CSS" else language
            search_url = "https://api.github.com/search/repositories"
            params = {
                "q": f"language:{search_language}",
                "sort": "stars",
                "order": "desc",
                "per_page": 20
            }
            res = rq.get(search_url, headers=headers, params=params)
            res.raise_for_status()
            
            items = res.json().get("items", [])
            seen_orgs = set()
            for item in items:
                org_name = item["owner"]["login"]
                if item["owner"]["type"] == "Organization" and org_name not in seen_orgs:
                    seen_orgs.add(org_name)
                    organizations.append(
                        schemas.OrganizationItem(
                            name=org_name,
                            description=item["owner"].get("description"), # Note: Repo search might not include org description directly
                            avatar_url=item["owner"]["avatar_url"],
                            url=item["owner"]["html_url"],
                            language=language
                        )
                    )
                    if len(organizations) >= 10:
                         break
        else:
            # DEFAULT: Return Popular Orgs
            for org_name in POPULAR_ORGS:
                res = rq.get(f"https://api.github.com/users/{org_name}", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    organizations.append(
                        schemas.OrganizationItem(
                            name=data["login"],
                            description=data.get("description", "A popular Open Source Organization."),
                            avatar_url=data.get("avatar_url"),
                            url=data.get("html_url"),
                            language=None
                        )
                    )

        return schemas.StartContributionResponse(
            next_step="SELECT_ORG",
            organizations=organizations
        )
            
    except rq.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub PAT token.")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch data from GitHub.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching organizations: {str(e)}")
