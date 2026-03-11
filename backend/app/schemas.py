#PYDANTIC SCHEMAS IN THE FOLLOWING ORDER(HOMEPAGE,DASHBOARD,My Contributions)
from pydantic import BaseModel, computed_field
from typing import List,Optional 


# Tier 1 - User Settings 
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

class PATUpdate(BaseModel):
    email: str
    pat: str
    
class GoogleAtuhentication(BaseModel):
    email: str
    name: Optional[str] = None


# Tier 2 - Main Dashboard Schemas (Matched to UI)

class ContributionItem(BaseModel):
    """Used for 'My Contributions' section"""
    repo_name: str # e.g. "Org_name/Repo_name"
    issue_title: str # e.g. "Issue #167: Issue title"
    status: str # e.g. "Accepted", "Waiting", "Rejected", "Currently Working"

class WorkingIssueItem(BaseModel):
    """Used for 'Working Issues' section"""
    repo_name: str 
    issue_title: str
    language: str # e.g. "C", "Java"

class PullRequestItem(BaseModel):
    """Used for 'Pull Requests' section"""
    repo_name: str
    issue_title: str
    date_of_submission: str # e.g. "12/03/2026"
    status: str # e.g. "Waiting"

class CommitMapData(BaseModel):
     """Used for generating the contribution graph"""
     date: str
     count: int

class MainDashboardResponse(BaseModel):
    """The complete payload for Main_Dashboard_screen"""
    user_name: str # e.g. "Yog-1to1-code", gotten from Github
    experience_level: str # e.g. "Beginner"
    my_contributions: List[ContributionItem]
    working_issues: List[WorkingIssueItem]
    commit_map: List[CommitMapData]
    pull_requests: List[PullRequestItem]


# Tier 3 - Start Contributing Flow

class OrganizationItem(BaseModel):
    name: str # e.g. "facebook"
    description: Optional[str]
    avatar_url: Optional[str]
    url: str # github html url
    language: Optional[str]

class StartContributionResponse(BaseModel):
    """
    If next_step is 'SELECT_LANGUAGE', languages will be populated.
    If next_step is 'SELECT_ORG', organizations will be populated.
    """
    next_step: str # "SELECT_LANGUAGE" or "SELECT_ORG"
    languages: Optional[List[str]] = None
    organizations: Optional[List[OrganizationItem]] = None


# Tier 4 - Issue Selection Flow

class RepoItem(BaseModel):
    name: str # e.g. "react"
    full_name: str # e.g. "facebook/react"
    description: Optional[str]
    language: Optional[str]
    open_issues_count: int
    stars: int

class IssueItem(BaseModel):
    number: int
    title: str
    state: str
    html_url: str
    body: Optional[str] # Might be needed for Nova
    labels: List[str]

class RepoListResponse(BaseModel):
    org_name: str
    repos: List[RepoItem]

class IssueListResponse(BaseModel):
    repo_name: str
    issues: List[IssueItem]
# Tier 5 - AWS Bedrock Nova Integration

# Tier 5 - AWS Bedrock Nova Integration

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str
    
class CondensedIssue(BaseModel):
    number: int
    title: str
    state: str
    labels: List[str]

class AskNovaRequest(BaseModel):
    repo_name: str
    issues_context: List[CondensedIssue] # Provide the list of currently open issues here
    messages: List[ChatMessage] # Conversation history

class AskNovaResponse(BaseModel):
    reply: str

class SummarizeIssueRequest(BaseModel):
    repo_name: str
    issue_number: int
    issue_title: str
    issue_body: str
    comments: List[str]

class SummarizeIssueResponse(BaseModel):
    summary: str
    approach: str
    commands: str