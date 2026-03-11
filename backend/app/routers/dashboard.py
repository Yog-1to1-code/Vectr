from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models as models
import app.schemas as schemas
from database import get_db
import requests as rq

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models as models
import app.schemas as schemas
from database import get_db
import requests as rq
from app.utils.encryption import decrypt_pat
from datetime import datetime, timedelta

routes = APIRouter(prefix="/user", tags=["Dashboard"])

@routes.get("/dashboard", response_model=schemas.MainDashboardResponse)
def user_dashboard(email: str, db: Session = Depends(get_db)):
    # 1. Fetch User from DB
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    if not user.github_pat:
        raise HTTPException(status_code=400, detail="User's Github PAT is missing")
        
    # 2. Extract and Decrypt PAT
    pat = decrypt_pat(user.github_pat)
    exp_level = user.experience_lvl.capitalize()
    
    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    try:
        # 3. Get User Profile from GitHub (to get standard Github Username)
        profile_res = rq.get("https://api.github.com/user", headers=headers)
        profile_res.raise_for_status()
        github_username = profile_res.json().get("login", "Unknown")
        
        # 4. Fetch actual GitHub Commit Map using GraphQL API
        graphql_url = "https://api.github.com/graphql"
        query = """
        query($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionCalendar {
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
        """
        graphql_res = rq.post(
            graphql_url,
            json={"query": query, "variables": {"login": github_username}},
            headers=headers
        )
        
        commit_map = []
        if graphql_res.status_code == 200:
            data = graphql_res.json()
            try:
                weeks = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]["weeks"]
                # Extract all days of contributions (usually up to 365 days)
                days = [day for week in weeks for day in week["contributionDays"]]
                for day in days:
                    commit_map.append(
                        schemas.CommitMapData(
                            date=day["date"],
                            count=day["contributionCount"]
                        )
                    )
            except KeyError:
                pass
        
        # Fallback if GraphQL fails or history is empty
        if not commit_map:
            today = datetime.now()
            for i in range(364):
                day = today - timedelta(days=363-i)
                commit_map.append(
                    schemas.CommitMapData(
                        date=day.strftime("%Y-%m-%d"),
                        count=0
                    )
                )

        # 5. Fetch "My Contributions", "Working Issues", "Pull Requests" 
        # Query the DB for actual contributions
        db_contributions = db.query(models.Contributions).filter(models.Contributions.user_email == email).all()
        
        my_contributions = []
        working_issues = []
        pull_requests = []

        for contrib in db_contributions:
            # Map DB entries to ContributionItem
            my_contributions.append(
                schemas.ContributionItem(
                    repo_name=contrib.repo_name,
                    issue_title=f"Issue #{contrib.issue_number}: {contrib.issue_title}",
                    status=contrib.status or "Unknown"
                )
            )
            
            # Map "Working" or "Currently Working" statuses to WorkingIssueItem
            if contrib.status and contrib.status.lower() in ["working", "currently working", "in progress"]:
                working_issues.append(
                    schemas.WorkingIssueItem(
                        repo_name=contrib.repo_name,
                        issue_title=f"Issue #{contrib.issue_number}: {contrib.issue_title}",
                        language=contrib.language or "Unknown"
                    )
                )
                
            # If a PR has been generated/submitted, it usually has a specific status like "Waiting" or "Reviewed"
            if contrib.status and contrib.status.lower() in ["waiting", "submitted", "in review"]:
                 pull_requests.append(
                     schemas.PullRequestItem(
                         repo_name=contrib.repo_name,
                         issue_title=f"#{contrib.issue_number}: {contrib.issue_title}",
                         date_of_submission="Recent",  # We don't have a date column in Contributions yet
                         status=contrib.status.capitalize()
                     )
                 )

        # 6. Assemble Final Response
        return schemas.MainDashboardResponse(
            user_name=github_username,
            experience_level=exp_level,
            my_contributions=my_contributions,
            working_issues=working_issues,
            commit_map=commit_map,
            pull_requests=pull_requests
        )

    except rq.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub PAT token. Please update it.")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch data from GitHub.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")
