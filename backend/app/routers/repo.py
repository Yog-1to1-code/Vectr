from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional

# Import the services we just made
from app.services.github_service import fetch_org_catalog, fetch_repo_summary
from app.services.ai_service import ask_nova_about_issues

router = APIRouter(
    prefix="/api/repo",
    tags=["Repository Issues"]
)

# This model defines what the React frontend will send us
class ChatRequest(BaseModel):
    org_name: str # e.g., "facebook" or your org
    repo_name: Optional[str] = None # Optional: If the user already selected a repo
    label: Optional[str] = None # Optional: Filter explicitly by label (e.g. 'good first issue')
    message: str # what the user typed in
    chat_history: Optional[List[Dict]] = None # Previous messages so Nova Remembers

@router.post("/chat")
async def chat_with_nova(request: ChatRequest):
    """
    The main endpoint. 
    It fetches the Github catalog, feeds it to Nova Lite, and returns the response.
    """
    try:
        # 1. Fetch the entire catalog for the chosen org
        # (Bonus points: In a real app, cache this for 10 mins so you don't hit rate limits every message!)
        catalog = fetch_org_catalog(
            org_name=request.org_name,
            repo_name=request.repo_name,
            label=request.label
        )
        
        if not catalog:
            return {"reply": f"Hmm, I couldn't find any open issues for '{request.org_name}'. Are you sure they have public repos with open issues?"}

        # 2. Ask Nova the question
        nova_reply = ask_nova_about_issues(
            catalog=catalog,
            user_message=request.message,
            chat_history=request.chat_history
        )

        # 3. Check if Nova selected an issue 
        # Remember our system prompt: "SELECTED_ISSUE: RepoName/#123"
        if "SELECTED_ISSUE:" in nova_reply:
            print("USER SELECTED AN ISSUE! Trigger Frontend transition here.")
            # Depending on how you want React to handle it, you can return a flag:
            return {
                "reply": nova_reply,
                "is_selected": True
            }

        return {
            "reply": nova_reply,
            "is_selected": False
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
async def get_repo_summary(org_name: str, repo_name: str):
    """
    Fetches a high-level summary of a specific repository natively from GitHub.
    Use this to give Nova context about a repository without burning 
    tens of thousands of LLM tokens on reading the codebase!
    """
    try:
        summary = fetch_repo_summary(org_name, repo_name)
        if "Repository data unavailable" in summary:
            raise HTTPException(status_code=404, detail="Repository not found or data unavailable")
        
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
