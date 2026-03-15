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
import re
import requests as req
from app.utils.encryption import decrypt_pat

routes = APIRouter(prefix="/nova", tags=["Bedrock AI Chat"])

# Initialize AWS Bedrock Runtime Client
def get_bedrock_client():
    try:
        # Relies on the host environment having AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
        # or having an IAM role assigned to the EC2 instance reading from .env
        client_kwargs = {
            "service_name": "bedrock-runtime",
            "region_name": os.getenv("AWS_REGION", "us-east-1").strip().strip('"').strip("'")
        }
        
        access_key = os.getenv("AWS_ACCESS_KEY_ID")
        secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        
        if access_key and secret_key:
            client_kwargs["aws_access_key_id"] = access_key.strip().strip('"').strip("'")
            client_kwargs["aws_secret_access_key"] = secret_key.strip().strip('"').strip("'")
            
        endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        if endpoint_url:
            client_kwargs["endpoint_url"] = endpoint_url.strip().strip('"').strip("'")
            
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
    issue_details = ""
    if request.active_issue_number:
        local_evaluation = await evaluate_local_commits(request.repo_name, request.active_issue_number, request.user_email, db)
        if request.user_email:
            progress = db.query(models.ContributionProgress).filter(
                models.ContributionProgress.user_email == request.user_email,
                models.ContributionProgress.repo_name == request.repo_name,
                models.ContributionProgress.issue_number == request.active_issue_number
            ).first()
            if progress:
                issue_details = f"\n\n--- ISSUE CONTEXT ---\n"
                if progress.issue_summary:
                    issue_details += f"Issue Summary/Description:\n{progress.issue_summary}\n\n"
                else:
                    for issue in request.issues_context:
                        if issue.number == request.active_issue_number and issue.issue_body:
                            issue_details += f"Issue Description:\n{issue.issue_body}\n\n"
                            break
                            
                if progress.final_approach:
                    issue_details += f"Current Final Approach (can be refined):\n{progress.final_approach}\n\n"
                    
                if progress.git_commands:
                    issue_details += f"Git Commands Used:\n{progress.git_commands}\n\n"
        
    # Construct System Prompt with Context
    if request.active_issue_number:
        system_prompt = (
            f"You are Vectr Nova, an expert open source contribution assistant.\n"
            f"The user is actively working on Issue #{request.active_issue_number} in the repository '{request.repo_name}'.\n\n"
            f"{repo_analysis}"
            f"{issue_details}"
            f"{local_evaluation}"
            f"Your goals:\n"
            f"1. Help the user refine their approach to solving the issue.\n"
            f"2. Check their proposed plan, offer suggestions, and point them to specific files to modify.\n"
            f"3. If the user's approach is fully refined and approved by you, you MUST output a JSON block containing the finalized approach so the system can save it. Output format: ```json\n{{\"finalized_approach\": \"Detailed step-by-step approach...\"}}\n```\n"
            f"4. Be concise, friendly, and highly technical in your answers."
        )
    else:
        system_prompt = (
            f"You are Vectr Nova, an expert open source contribution assistant.\n"
            f"The user is currently browsing the repository '{request.repo_name}'.\n\n"
            f"Here is the list of currently open issues in this repository:\n"
            f"{issues_text}\n"
            f"{repo_analysis}"
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
    
    def process_reply(text: str):
        updated_appr = None
        match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(1))
                if "finalized_approach" in data:
                    updated_appr = data["finalized_approach"]
                    text = text[:match.start()] + text[match.end():]
                    
                    if request.user_email and request.active_issue_number:
                        prog = db.query(models.ContributionProgress).filter(
                            models.ContributionProgress.user_email == request.user_email,
                            models.ContributionProgress.repo_name == request.repo_name,
                            models.ContributionProgress.issue_number == request.active_issue_number
                        ).first()
                        if prog:
                            prog.final_approach = updated_appr
                            db.commit()
            except Exception:
                pass
        return text.strip(), updated_appr

    try:
        endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        if endpoint_url and ("localhost" in endpoint_url or "127.0.0.1" in endpoint_url):
            # INTERCEPT: Instead of using AWS/Bedrock, forward directly to local Ollama via standard HTTP
            ollama_url = "http://127.0.0.1:11434/api/chat"
            ollama_messages = [{"role": "system", "content": system_prompt}]
            for msg in request.messages:
                ollama_messages.append({"role": msg.role, "content": msg.content})
                
            payload = {
                "model": "amazon.nova-2-lite:v1.0",  # Optional: Fallback model based on Ollama tags
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
            reply_text, updated_approach = process_reply(reply_text)
            return schemas.AskNovaResponse(reply=reply_text, updated_approach=updated_approach)
            
        else:
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
            reply_text, updated_approach = process_reply(reply_text)
            return schemas.AskNovaResponse(reply=reply_text, updated_approach=updated_approach)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI invocation error: {str(e)}")



#Summarizer Route
@routes.post("/summarize", response_model=schemas.SummarizeIssueResponse)
async def summarize_issue(request: schemas.SummarizeIssueRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    client = get_bedrock_client()
    if not client:
        raise HTTPException(status_code=500, detail="Failed to initialize AWS Bedrock Client.")

    repo_short_name = request.repo_name.split('/')[-1] if '/' in request.repo_name else request.repo_name
    
    # Securely retrieve PAT and GitHub Username
    github_username = "your-username" 
    try:
        user_record = db.query(models.User).filter(models.User.email == request.user_email).first()
        if user_record and user_record.github_pat:
            decrypted_pat = decrypt_pat(user_record.github_pat)
            res = req.get("https://api.github.com/user", headers={"Authorization": f"Bearer {decrypted_pat}"})
            if res.status_code == 200:
                github_username = res.json().get("login", "your-username")
    except Exception as e:
        print(f"Error fetching github username for fork instructions: {e}")

    programmatic_commands = (
        f"## Git Commands in vscode.dev\n\n"
        f"> After opening your fork in vscode.dev, open the terminal with `` Ctrl+` `` or `Ctrl+J`.\n\n"
        f"### 1. Create a Feature Branch\n"
        f"```\n"
        f"git checkout -b fix/issue-{request.issue_number}\n"
        f"```\n\n"
        f"### 2. Make Your Code Changes\n"
        f"Edit the relevant files in the vscode.dev editor. Refer to the **Issue Summary** and **Final Approach** on the right for guidance.\n\n"
        f"### 3. Stage & Commit\n"
        f"```\n"
        f"git add .\n"
        f'git commit -m "Fix #{request.issue_number}: <brief description>"\n'
        f"```\n\n"
        f"### 4. Push to Your Fork\n"
        f"```\n"
        f"git push origin fix/issue-{request.issue_number}\n"
        f"```\n\n"
        f"### 5. Evaluate with Nova\n"
        f"Hit **Refresh** on the Commits panel, then use **Ask Nova!** to get AI-powered feedback on your changes."
    )



    if os.getenv("USE_NOVA", "True").lower() == "false":
        return schemas.SummarizeIssueResponse(
            summary=request.issue_body or "No issue description provided.",
            approach="Please set USE_NOVA=True in the backend environment to enable AI-powered approach suggestions.",
            commands=programmatic_commands
        )

    # We use a background task to safely clone and analyze the repo without timing out the initial chat response
    def run_analysis_in_background(repo_name: str):
        # Create a fresh db session for the background thread
        try:
            from database import SessionLocal
            db_bg = SessionLocal()
        except ImportError:
            # Fallback for circular imports depending on how main.py manages it
            pass
        
        try:
            # We need to run the async function in a new or existing event loop
            client_bg = get_bedrock_client()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(analyze_and_cache_repo(repo_name, db_bg, client_bg))
            loop.close()
        except Exception as e:
            print(f"Failed to analyze repo in background summarize step: {str(e)}")
        finally:
            db_bg.close()

    try:
        background_tasks.add_task(run_analysis_in_background, request.repo_name)
    except Exception as e:
        print(f"Failed to queue background repo analysis: {str(e)}")

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
        if endpoint_url and ("localhost" in endpoint_url or "127.0.0.1" in endpoint_url):
            ollama_url = "http://127.0.0.1:11434/api/chat"
            payload = {
                "model": "amazon.nova-2-lite:v1.0",
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
async def fetch_commits(request: schemas.FetchCommitsRequest, db: Session = Depends(get_db)):
    """
    Checks the local workspace for the issue branch and returns the commit log messages.
    """
    from app.utils.repo_analyzer import WORKSPACES_DIR, run_cmd_async
    
    # Securely retrieve PAT and GitHub Username
    github_username = None
    pat = None
    try:
        user_record = db.query(models.User).filter(models.User.email == request.user_email).first()
        print(f"[COMMITS DEBUG] user_email={request.user_email}, user_found={user_record is not None}, has_pat={bool(user_record and user_record.github_pat)}")
        if user_record and user_record.github_pat:
            pat = decrypt_pat(user_record.github_pat)
            print(f"[COMMITS DEBUG] PAT decrypted, first 8: {pat[:8]}...")
            res = req.get("https://api.github.com/user", headers={"Authorization": f"Bearer {pat}"})
            print(f"[COMMITS DEBUG] GitHub /user status: {res.status_code}")
            if res.status_code == 200:
                github_username = res.json().get("login")
                print(f"[COMMITS DEBUG] GitHub username: {github_username}")
    except Exception as e:
        print(f"[COMMITS DEBUG] Error fetching github username for commits route: {e}")
        import traceback
        traceback.print_exc()
        
    if not github_username or not pat:
        return schemas.FetchCommitsResponse(commits=["Setup incomplete: Unable to verify GitHub PAT. Please update your Settings."])
    
    repo_short_name = request.repo_name.split('/')[-1] if '/' in request.repo_name else request.repo_name
    fork_vscode_url = f"https://vscode.dev/github/{github_username}/{repo_short_name}"

    # --- DB-first fork status check ---
    progress = db.query(models.ContributionProgress).filter(
        models.ContributionProgress.user_email == request.user_email,
        models.ContributionProgress.repo_name == request.repo_name,
        models.ContributionProgress.issue_number == request.active_issue_number
    ).first()

    cached_fork_status = progress.fork_status if progress else None

    if cached_fork_status == "available":
        # Fork already confirmed in DB — skip GitHub API
        fork_exists = True
    else:
        # Check GitHub API to see if fork exists
        try:
            fork_check = req.get(
                f"https://api.github.com/repos/{github_username}/{repo_short_name}",
                headers={"Authorization": f"Bearer {pat}"}
            )
            fork_exists = fork_check.status_code == 200
        except Exception:
            fork_exists = False

        # Persist fork status in DB when found
        if fork_exists and progress:
            progress.fork_status = "available"
            progress.fork_vscode_url = fork_vscode_url
            db.commit()
        elif fork_exists and not progress:
            # Create a progress entry to cache the fork status
            new_progress = models.ContributionProgress(
                user_email=request.user_email,
                repo_name=request.repo_name,
                issue_number=request.active_issue_number,
                fork_status="available",
                fork_vscode_url=fork_vscode_url
            )
            db.add(new_progress)
            db.commit()

    if not fork_exists:
        return schemas.FetchCommitsResponse(
            commits=[],
            fork_detected=False,
            fork_vscode_url=None
        )


    # We track the user's specific fork clone
    repo_dir = os.path.join(WORKSPACES_DIR, f"{github_username}_{repo_short_name}")
    
    if not os.path.exists(repo_dir):
        # Fork exists, but we haven't cloned it locally yet
        if not os.path.exists(WORKSPACES_DIR):
            os.makedirs(WORKSPACES_DIR)
        clone_url = f"https://{pat}@github.com/{github_username}/{repo_short_name}.git"
        code, out, err = await run_cmd_async(f"git clone {clone_url} {os.path.basename(repo_dir)}", cwd=WORKSPACES_DIR)
        print(f"User Fork Clone result: code={code}")
        if code != 0:
            return schemas.FetchCommitsResponse(
                commits=[],
                fork_detected=True,
                fork_vscode_url=fork_vscode_url
            )
        
    branch_name = f"fix/issue-{request.active_issue_number}"
    
    # Always fetch latest from remote
    await run_cmd_async("git fetch --all --prune", cwd=repo_dir)
    
    # Check if remote branch exists
    code, remote_branches, _ = await run_cmd_async("git branch -r", cwd=repo_dir)
    remote_branch_ref = f"origin/{branch_name}"
    if remote_branch_ref not in remote_branches:
        # Branch doesn't exist on remote yet — user hasn't pushed
        return schemas.FetchCommitsResponse(
            commits=[],
            fork_detected=True,
            fork_vscode_url=fork_vscode_url
        )

    # Find default branch
    code, def_branch_out, err = await run_cmd_async("git symbolic-ref refs/remotes/origin/HEAD", cwd=repo_dir)
    if code != 0:
        default_branch = "main"
    else:
        default_branch = def_branch_out.strip().split('/')[-1]

    # Get commit messages: compare remote default branch to remote issue branch
    code, log_out, err = await run_cmd_async(
        f"git log origin/{default_branch}..origin/{branch_name} --oneline",
        cwd=repo_dir
    )
    
    commits = []
    if log_out.strip():
        commits = [line.strip() for line in log_out.strip().split('\n') if line.strip()]
        
    return schemas.FetchCommitsResponse(
        commits=commits,
        fork_detected=True,
        fork_vscode_url=fork_vscode_url
    )

