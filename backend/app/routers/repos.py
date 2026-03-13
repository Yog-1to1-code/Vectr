from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models as models
import app.schemas as schemas
from database import get_db
import requests as rq
from app.utils.encryption import decrypt_pat
from typing import Optional

routes = APIRouter(prefix="/repos", tags=["Repository & Issues"])

def get_github_headers(email: str, db: Session):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.github_pat:
        raise HTTPException(status_code=400, detail="User's Github PAT is missing")
    pat = decrypt_pat(user.github_pat)
    return {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json"
    }

@routes.get("/{org_name}", response_model=schemas.RepoListResponse)
def get_org_repos(
    org_name: str, 
    email: str,
    language: Optional[str] = Query(None, description="Filter repos by language"),
    db: Session = Depends(get_db)):
    """Fetch repositories for a selected Organization"""
    
    headers = get_github_headers(email, db)
    
    try:
        # Fetch repos for the org
        # https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-organization-repositories
        repos_url = f"https://api.github.com/orgs/{org_name}/repos?sort=updated&per_page=30"
        res = rq.get(repos_url, headers=headers)
        
        # If it's a user instead of an org (GitHub API returns 404 for users on /orgs/ route)
        if res.status_code == 404:
             repos_url = f"https://api.github.com/users/{org_name}/repos?sort=updated&per_page=30"
             res = rq.get(repos_url, headers=headers)
             
        res.raise_for_status()
        
        raw_repos = res.json()
        repos = []
        
        for repo in raw_repos:
            # Optionally filter by language if the user is a beginner and selected one
            if language:
                search_language = "HTML" if language == "HTML/CSS" else language
                repo_language = repo.get("language")
                if repo_language and repo_language.lower() != search_language.lower():
                    continue
                
            repos.append(
                schemas.RepoItem(
                    name=repo["name"],
                    full_name=repo["full_name"],
                    description=repo.get("description"),
                    language=repo.get("language"),
                    open_issues_count=repo.get("open_issues_count", 0),
                    stars=repo.get("stargazers_count", 0)
                )
            )
            
        return schemas.RepoListResponse(
            org_name=org_name,
            repos=repos
        )
        
    except rq.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub PAT token.")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch repos: {str(e)}")

@routes.get("/{org_name}/{repo_name}/issues", response_model=schemas.IssueListResponse)
def get_repo_issues(
    org_name: str, 
    repo_name: str, 
    email: str,
    db: Session = Depends(get_db)):
    """Fetch open issues for a selected Repository"""
    
    headers = get_github_headers(email, db)
    
    try:
        # Fetch open issues
        # https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues
        issues_url = f"https://api.github.com/repos/{org_name}/{repo_name}/issues?state=open&per_page=30&sort=updated"
        res = rq.get(issues_url, headers=headers)
        res.raise_for_status()
        
        raw_issues = res.json()
        issues = []
        
        for issue in raw_issues:
            # GitHub API returns pull requests as issues too; filter them out
            if "pull_request" in issue:
                continue
                
            labels = [label["name"] for label in issue.get("labels", [])]
                
            issues.append(
                schemas.IssueItem(
                    number=issue["number"],
                    title=issue["title"],
                    state=issue["state"],
                    html_url=issue["html_url"],
                    body=issue.get("body", "")[:500], # Trucate body to save bandwidth/prompt space
                    labels=labels
                )
            )
            
        return schemas.IssueListResponse(
            repo_name=f"{org_name}/{repo_name}",
            issues=issues
        )
        
    except rq.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub PAT token.")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch issues: {str(e)}")
