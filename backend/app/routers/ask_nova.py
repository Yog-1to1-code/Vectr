from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import app.schemas as schemas
import models
from database import get_db
from sqlalchemy.orm import Session
from app.utils.repo_analyzer import analyze_and_cache_repo, evaluate_local_commits
import boto3
import json
import os
import asyncio
from typing import List

routes = APIRouter(prefix="/nova", tags=["Bedrock AI Chat"])

# Initialize AWS Bedrock Runtime Client
def get_bedrock_client():
    try:
        # Relies on the host environment having AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
        # or having an IAM role assigned to the EC2 instance reading from .env
        client_kwargs = {
            "service_name": "bedrock-runtime",
            "region_name": os.getenv("AWS_REGION", "us-east-1")
        }
        endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        if endpoint_url:
            client_kwargs["endpoint_url"] = endpoint_url
            
        client = boto3.client(**client_kwargs)
        return client
    except Exception as e:
        print(f"Error initializing Bedrock client: {e}")
        return None

@routes.post("/ask", response_model=schemas.AskNovaResponse)
async def ask_nova(request: schemas.AskNovaRequest, db: Session = Depends(get_db)):
    """
    Given a repository context, a list of open issues, and chat history,
    requests Amazon Nova to help the user select an issue and understand how to tackle it.
    """
    client = get_bedrock_client()
    if not client:
        raise HTTPException(status_code=500, detail="Failed to initialize AWS Bedrock Client. Check AWS credentials.")
        
    if os.getenv("USE_NOVA", "True").lower() == "false":
        return schemas.AskNovaResponse(reply="Amazon Nova AI features are currently disabled in the backend configuration.")
        
    # Format the issues for the system prompt
    issues_text = ""
    for issue in request.issues_context:
        issues_text += f"- Issue #{issue.number}: {issue.title} (Labels: {', '.join(issue.labels)})\n"
        
    if not issues_text:
        issues_text = "No open issues currently available."
        
    # Get cached repo analysis context
    repo_analysis = ""
    cached = db.query(models.RepoAnalysis).filter(models.RepoAnalysis.repo_name == request.repo_name).first()
    if cached:
        repo_analysis = f"\n\n--- REPOSITORY CONTEXT ---\n{cached.system_prompt_context}\n"

    # Evaluate local commits and testing if an issue is actively selected
    local_evaluation = ""
    if request.active_issue_number:
        local_evaluation = await evaluate_local_commits(request.repo_name, request.active_issue_number)
        
    # Construct System Prompt with Context
    system_prompt = (
        f"You are Vectr Nova, an expert open source contribution assistant.\n"
        f"The user is currently browsing the repository '{request.repo_name}'.\n\n"
        f"Here is the list of currently open issues in this repository:\n"
        f"{issues_text}\n"
        f"{repo_analysis}"
        f"{local_evaluation}"
        f"Your goals:\n"
        f"1. Help the user select the best issue for their skill level. If they ask for something easy, look for 'good first issue' or 'beginner' labels.\n"
        f"2. Once an issue is selected, briefly explain what it entails and suggest the first files they should check to get started.\n"
        f"3. Be concise, friendly, and highly technical in your answers. Do not explain git commands unless asked; focus on the code and logic."
    )
    
    # Format messages for Amazon Nova models
    formatted_messages = []
    for msg in request.messages:
        formatted_messages.append({
            "role": msg.role,
            "content": [{"text": msg.content}]
        })
        
    # Bedrock Nova request body format
    # Reference: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html
    body = {
        "system": [{"text": system_prompt}],
        "messages": formatted_messages,
        "inferenceConfig": {
            "maxTokens": 1000,
            "temperature": 0.5,
            "topP": 0.9,
        }
    }
    try:
        endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        if endpoint_url and "localhost" in endpoint_url or "127.0.0.1" in endpoint_url:
            # INTERCEPT: Instead of using AWS/Bedrock, forward directly to local Ollama via standard HTTP
            import requests as req
            ollama_url = "http://127.0.0.1:11434/api/chat"
            ollama_messages = [{"role": "system", "content": system_prompt}]
            for msg in request.messages:
                ollama_messages.append({"role": msg.role, "content": msg.content})
                
            payload = {
                "model": "us.amazon.nova-2-lite:v1.0",  # Optional: Fallback model based on Ollama tags
                "messages": ollama_messages,
                "stream": False,
                "options": {
                    "temperature": 0.5,
                    "top_p": 0.9,
                }
            }
            res = req.post(ollama_url, json=payload)
            res.raise_for_status()
            reply_text = res.json().get('message', {}).get('content', "Ollama couldn't generate a response.")
            return schemas.AskNovaResponse(reply=reply_text)
            
        else:
            client = boto3.client(**client_kwargs)
            body = {
                "system": [{"text": system_prompt}],
                "messages": formatted_messages,
                "inferenceConfig": {"maxTokens": 1000, "temperature": 0.5, "topP": 0.9}
            }
            response = client.invoke_model(
                modelId=os.getenv("NOVA_MODEL_ID", "amazon.nova-lite-v1:0"),
                body=json.dumps(body),
                accept="application/json",
                contentType="application/json"
            )
            response_body = json.loads(response.get('body').read())
            reply_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', "")
            return schemas.AskNovaResponse(reply=reply_text)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI invocation error: {str(e)}")



#Summarizer Route
@routes.post("/summarize", response_model=schemas.SummarizeIssueResponse)
async def summarize_issue(request: schemas.SummarizeIssueRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    client = get_bedrock_client()
    if not client:
        raise HTTPException(status_code=500, detail="Failed to initialize AWS Bedrock Client.")

    repo_short_name = request.repo_name.split('/')[-1] if '/' in request.repo_name else request.repo_name
    programmatic_commands = (
        f"# 1. Clone the repository\n"
        f"git clone https://github.com/{request.repo_name}.git\n"
        f"cd {repo_short_name}\n\n"
        f"# 2. Create a new branch for the issue\n"
        f"git checkout -b fix/issue-{request.issue_number}"
    )

    if os.getenv("USE_NOVA", "True").lower() == "false":
        return schemas.SummarizeIssueResponse(
            summary=request.issue_body or "No issue description provided.",
            approach="Please set USE_NOVA=True in the backend environment to enable AI-powered approach suggestions.",
            commands=programmatic_commands
        )

    # Note: We must create a wrapper function for the background task to use its own database session DB thread safely, 
    # but since this is synchronous SQLAlchemy and background tasks run after response, we'll dispatch it asynchronously using asyncio.create_task 
    # Or just await it synchronously to guarantee context availability right away.
    # Since clone + analysis might take 10s+, we'll still do it as an asyncio task but let the frontend wait? 
    # Actually, we can use background_tasks with a fresh session generator, but let's just use the current db directly in run_in_executor if needed, 
    # or just await it if we don't want complex thread management.
    # We will await it synchronously to ensure the context is ready for the very first question.
    try:
        await analyze_and_cache_repo(request.repo_name, db, client)
    except Exception as e:
        print(f"Failed to analyze repo in summarize step: {str(e)}")

    # 1. Combine all the GitHub comments into a single block of text
    discussion = "\n".join(request.comments)
    if not discussion:
        discussion = "No comments on this issue yet."

    # 2. Craft a strict System Prompt for Nova
    system_prompt = f"""
    You are Vectr Nova, an expert AI coding assistant. The user wants to start working on Issue #{request.issue_number} titled "{request.issue_title}" in repository '{request.repo_name}'.
    
    Issue Description: 
    {request.issue_body}
    
    Discussion/Comments:
    {discussion}
    
    Your task is to analyze this issue and output a RAW JSON object with NO markdown formatting, NO backticks, and NO conversational text. It MUST contain exactly these 2 keys:
    {{
        "summary": "A 2-3 sentence overview of what the bug/feature is.",
        "approach": "A step-by-step logical explanation of how to fix this, noting what files to check."
    }}
    """

    # 3. Request structure for Amazon Nova
    body = {
        "system": [{"text": system_prompt}],
        "messages": [{"role": "user", "content": [{"text": "Please provide the summary JSON."}]}],
        "inferenceConfig": {
            "temperature": 0.2, # Keeps the model highly factual and strict
            "topP": 0.9,
            "maxTokens": 1000
        }
    }

    try:
        endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        if endpoint_url and "localhost" in endpoint_url or "127.0.0.1" in endpoint_url:
            import requests as req
            ollama_url = "http://127.0.0.1:11434/api/chat"
            payload = {
                "model": "us.amazon.nova-2-lite:v1.0",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Please provide the summary JSON."}
                ],
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9,
                }
            }
            res = req.post(ollama_url, json=payload)
            res.raise_for_status()
            reply_text = res.json().get('message', {}).get('content', "")
        else:
            response = client.invoke_model(
                modelId=os.getenv("NOVA_MODEL_ID", "amazon.nova-lite-v1:0"),
                body=json.dumps(body),
                accept="application/json",
                contentType="application/json"
            )
            response_body = json.loads(response.get('body').read())
            reply_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', "")

        # 4. Clean and Parse the JSON from AI's text response
        reply_text = reply_text.strip()
        if reply_text.startswith("```json"):
            reply_text = reply_text[7:-3].strip()
        elif reply_text.startswith("```"):
            reply_text = reply_text[3:-3].strip()

        parsed_json = json.loads(reply_text)

        # 5. Return the exact matching schema back to the frontend
        return schemas.SummarizeIssueResponse(
            summary=parsed_json.get("summary", "Summary not generated."),
            approach=parsed_json.get("approach", "Approach not generated."),
            commands=programmatic_commands
        )

    except json.JSONDecodeError:
         raise HTTPException(status_code=500, detail="Nova failed to format the response as JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bedrock invocation error: {str(e)}")

# Commits Route
@routes.post("/commits", response_model=schemas.FetchCommitsResponse)
async def fetch_commits(request: schemas.FetchCommitsRequest):
    """
    Checks the local workspace for the issue branch and returns the commit log messages.
    """
    from app.utils.repo_analyzer import WORKSPACES_DIR, run_cmd_async
    
    repo_dir = os.path.join(WORKSPACES_DIR, request.repo_name.replace("/", "_"))
    if not os.path.exists(repo_dir):
        return schemas.FetchCommitsResponse(commits=[])
        
    branch_name = f"fix/issue-{request.active_issue_number}"
    
    # 1. Pull latest from remote
    await run_cmd_async(f"git fetch origin", cwd=repo_dir)
    
    # Check if branch exists locally
    code, out, err = await run_cmd_async(f"git branch --list {branch_name}", cwd=repo_dir)
    if not out.strip():
        # Try to checkout the remote branch if it exists, otherwise it might not exist at all yet
        chk_code, chk_out, chk_err = await run_cmd_async(f"git checkout -b {branch_name} origin/{branch_name}", cwd=repo_dir)
        if chk_code != 0:
             # Branch doesn't exist on remote either
             return schemas.FetchCommitsResponse(commits=[])
    else:
        # Branch exists locally, pull latest
        await run_cmd_async(f"git checkout {branch_name}", cwd=repo_dir)
        await run_cmd_async(f"git pull origin {branch_name}", cwd=repo_dir)
         
    # 2. Find default branch
    code, def_branch_out, err = await run_cmd_async("git symbolic-ref refs/remotes/origin/HEAD", cwd=repo_dir)
    if code != 0:
         default_branch = "main" # Fallback
    else:
         default_branch = def_branch_out.strip().split('/')[-1]

    # 3. Get commit messages between default branch and issue branch
    code, log_out, err = await run_cmd_async(f"git log {default_branch}..{branch_name} --oneline", cwd=repo_dir)
    
    commits = []
    if log_out.strip():
        # git log returns newest first, split by newline
        commits = [line.strip() for line in log_out.strip().split('\n') if line.strip()]
        
    return schemas.FetchCommitsResponse(commits=commits)
