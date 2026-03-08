#PYDANTIC SCHEMAS IN THE FOLLOWING ORDER(HOMEPAGE,DASHBOARD,My Contributions)
from pydantic import BaseModel, computed_field
from typing import List,Optional 


#Tier 1 - User Settings 
class UserResponse(BaseModel):
    email: str
    raw_pat: str = "" 
    experience_lvl: str
    
    @computed_field
    def three_chara(self) -> str:
         if self.raw_pat:
            return f"{self.raw_pat[:3]}"
         else:
            return "Not set"

    class Config:
        from_attributes = True

class ExperienceUpdate(BaseModel):
    experience_lvl: str



#Tier - 2 (Repo Fetcher)
class DashboardProject  (BaseModel):
    org_name: str
    project_name: str
    github_link: str
    description: Optional[str] = "No description provided."
    tech_stack: str
    stars: int
    is_good_first_issue_friendly: bool


#Tier - 3 (Tracking Users Progress)

class Contribution(BaseModel):
    repo_name: str
    issue_title: str
    issue_number: int
    language: Optional[str] = "Unknown"
    status: str

class ContributionResponse(Contribution):
    id: int
    user_email: str

    class Config:
        from_attributes = True


#Tier-5  (Shipper to show on dashboard)
#What backend sends to frontend!
class DashboardResponse(BaseModel):
    user_email: str
    experience_level: str
    primary_language: str #User Selected Programming language
    recommended_projects: List[DashboardProject] #User Selected project
    active_contributions: List[ContributionResponse]
    working_contributions: List[ContributionResponse]

class GoogleAtuhentication(BaseModel):
    email: str
    name: Optional[str] = None

class PATUpdate(BaseModel):
    email: str
    pat: str