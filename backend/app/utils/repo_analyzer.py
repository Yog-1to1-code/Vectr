import os
import json
import asyncio
from sqlalchemy.orm import Session
import models
import subprocess

WORKSPACES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workspaces")

async def run_cmd_async(cmd: str, cwd: str = None):
    process = await asyncio.create_subprocess_shell(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    return process.returncode, stdout.decode(errors="ignore"), stderr.decode(errors="ignore")

def generate_tree(dir_path: str, max_depth: int = 3, current_depth: int = 0) -> str:
    """Generate a simple file tree string."""
    if current_depth > max_depth:
        return "  " * current_depth + "...\n"
    
    ignore_dirs = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", ".next"}
    
    tree_str = ""
    try:
        entries = sorted(os.listdir(dir_path))
    except Exception:
        return tree_str
        
    for entry in entries:
        if entry in ignore_dirs:
            continue
        
        full_path = os.path.join(dir_path, entry)
        tree_str += "  " * current_depth + f"- {entry}\n"
        
        if os.path.isdir(full_path):
            tree_str += generate_tree(full_path, max_depth, current_depth + 1)
            
    return tree_str

def get_readme_content(repo_dir: str) -> str:
    for filename in ["README.md", "readme.md", "README.txt", "README"]:
        path = os.path.join(repo_dir, filename)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return f.read()[:2000] # Limit to 2000 chars
            except:
                pass
    return "No README content found."

async def _invoke_nova_for_analysis(client, repo_name: str, tree: str, readme: str) -> str:
    """Uses Bedrock Nova to generate a deep technical context string of the repo."""
    try:
        import boto3
        
        system_prompt = (
            f"You are a Senior Software Architect analyzing the repository '{repo_name}'.\n"
            f"Based on the repository's file structure and README below, formulate a detailed but concise project context.\n"
            f"Include:\n1. Tech stack and frameworks.\n2. Key directories and their assumed roles based on standard architecture.\n"
            f"3. Any important entry points or configuration files.\n"
            f"This summary will be injected into future AI chats to help a user contribute to this exact repository.\n"
            f"Output purely the analysis, no conversational filler."
        )
        
        user_msg = f"FILE TREE:\n{tree}\n\nREADME EXCERPT:\n{readme}\n\nPlease provide the structural analysis."
        
        endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        # Route to Ollama if locally mocked
        if endpoint_url and ("localhost" in endpoint_url or "127.0.0.1" in endpoint_url):
            import requests as req
            ollama_url = "http://127.0.0.1:11434/api/chat"
            payload = {
                "model": "amazon.nova-2-lite:v1.0",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                "stream": False,
            }
            res = req.post(ollama_url, json=payload)
            res.raise_for_status()
            return res.json().get('message', {}).get('content', "Failed to generate context.")
        else:
            if not client:
                 return "Failed to initialize Bedrock client."
            body = {
                "system": [{"text": system_prompt}],
                "messages": [{"role": "user", "content": [{"text": user_msg}]}],
                "inferenceConfig": {"maxTokens": 1500, "temperature": 0.3}
            }
            response = client.invoke_model(
                modelId=os.getenv("NOVA_MODEL_ID", "amazon.nova-lite-v1:0"),
                body=json.dumps(body),
                accept="application/json",
                contentType="application/json"
            )
            response_body = json.loads(response.get('body').read())
            return response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', "")
            
    except Exception as e:
        print(f"Error invoking Nova for static analysis: {e}")
        return "Could not generate deep structural analysis at this time."

async def _invoke_nova_for_diff_summary(client, diff_str: str) -> str:
    """Uses Bedrock Nova to generate a short 1-2 sentence summary of a git diff."""
    if not diff_str.strip():
        return "No significant code changes found."
        
    try:
        system_prompt = (
            "You are an expert code reviewer.\n"
            "Formulate a highly concise, 1-2 sentence technical summary of the git diff provided.\n"
            "Focus purely on what the code changes actually accomplish without conversational filler."
        )
        user_msg = f"GIT DIFF:\n```diff\n{diff_str}\n```\n\nPlease summarize these code changes."
        
        endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        if endpoint_url and ("localhost" in endpoint_url or "127.0.0.1" in endpoint_url):
            import requests as req
            ollama_url = "http://127.0.0.1:11434/api/chat"
            payload = {
                "model": "amazon.nova-2-lite:v1.0",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                "stream": False,
            }
            res = req.post(ollama_url, json=payload)
            res.raise_for_status()
            return res.json().get('message', {}).get('content', "Failed to generate diff summary.")
        else:
            if not client:
                 return "Failed to initialize Bedrock client."
            body = {
                "system": [{"text": system_prompt}],
                "messages": [{"role": "user", "content": [{"text": user_msg}]}],
                "inferenceConfig": {"maxTokens": 300, "temperature": 0.2}
            }
            response = client.invoke_model(
                modelId=os.getenv("NOVA_MODEL_ID", "amazon.nova-lite-v1:0"),
                body=json.dumps(body),
                accept="application/json",
                contentType="application/json"
            )
            response_body = json.loads(response.get('body').read())
            return response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', "").strip()
            
    except Exception as e:
        print(f"Error invoking Nova for diff summary: {e}")
        return "Could not summarize the recent commit diff."

async def analyze_and_cache_repo(repo_name: str, db: Session, bedrock_client) -> str:
    """Returns the cached analysis, or generates and stores one."""
    cached = db.query(models.RepoAnalysis).filter(models.RepoAnalysis.repo_name == repo_name).first()
    if cached:
        return cached.system_prompt_context

    if not os.path.exists(WORKSPACES_DIR):
        os.makedirs(WORKSPACES_DIR)

    repo_dir = os.path.join(WORKSPACES_DIR, repo_name.replace("/", "_"))

    # If repo directory exists but not cached (e.g. wiped db), just analyze it. Otherwise clone it.
    if not os.path.exists(repo_dir):
        clone_url = f"https://github.com/{repo_name}.git"
        code, out, err = await run_cmd_async(f"git clone {clone_url} {os.path.basename(repo_dir)}", cwd=WORKSPACES_DIR)
        print(f"Clone result: code={code}")
        
    tree = generate_tree(repo_dir)
    readme = get_readme_content(repo_dir)

    analysis_str = await _invoke_nova_for_analysis(bedrock_client, repo_name, tree, readme)
    
    # Save to db
    from sqlalchemy.exc import IntegrityError
    new_analysis = models.RepoAnalysis(repo_name=repo_name, system_prompt_context=analysis_str)
    try:
        db.add(new_analysis)
        db.commit()
    except IntegrityError:
        db.rollback()
        # Another request inserted it concurrently, which is fine
        pass
    
    return analysis_str


async def evaluate_local_commits(repo_name: str, issue_number: int, user_email: str, db: Session) -> str:
    """Checks the issue branch for commits on the user's fork, produces a diff, and attempts to run tests."""
    repo_short_name = repo_name.split('/')[-1] if '/' in repo_name else repo_name
    
    # Securely retrieve PAT and GitHub Username
    github_username = None
    pat = None
    try:
        import requests as req
        user_record = db.query(models.User).filter(models.User.email == user_email).first()
        if user_record and user_record.github_pat:
            pat = user_record.github_pat
            res = req.get("https://api.github.com/user", headers={"Authorization": f"Bearer {pat}"})
            if res.status_code == 200:
                github_username = res.json().get("login")
    except Exception as e:
        print(f"Error fetching github username for evaluation route: {e}")
        
    if not github_username or not pat:
        return ""
        
    repo_dir = os.path.join(WORKSPACES_DIR, f"{github_username}_{repo_short_name}")
    
    if not os.path.exists(repo_dir):
        # User hasn't made a Vectr-synced clone of their fork yet, let's clone it now
        if not os.path.exists(WORKSPACES_DIR):
            os.makedirs(WORKSPACES_DIR)
        clone_url = f"https://{pat}@github.com/{github_username}/{repo_short_name}.git"
        code, out, err = await run_cmd_async(f"git clone {clone_url} {os.path.basename(repo_dir)}", cwd=WORKSPACES_DIR)
        if code != 0:
             return ""
             
    branch_name = f"fix/issue-{issue_number}"
    
    # 1. Pull latest from remote
    await run_cmd_async(f"git fetch origin", cwd=repo_dir)
    
    # Check if branch exists locally
    code, out, err = await run_cmd_async(f"git branch --list {branch_name}", cwd=repo_dir)
    if not out.strip():
        # Try to checkout the remote branch if it exists, otherwise it might not exist at all yet
        chk_code, chk_out, chk_err = await run_cmd_async(f"git checkout -b {branch_name} origin/{branch_name}", cwd=repo_dir)
        if chk_code != 0:
             # Branch doesn't exist on remote either
             return ""
    else:
        # Branch exists locally, pull latest
        await run_cmd_async(f"git checkout {branch_name}", cwd=repo_dir)
        await run_cmd_async(f"git pull origin {branch_name}", cwd=repo_dir)
         
    # 2. Get git diff with whichever branch it branched from (usually main or master)
    # Finding default branch:
    code, def_branch_out, err = await run_cmd_async("git symbolic-ref refs/remotes/origin/HEAD", cwd=repo_dir)
    if code != 0:
         default_branch = "main" # Fallback
    else:
         default_branch = def_branch_out.strip().split('/')[-1]

    code, diff_out, err = await run_cmd_async(f"git diff {default_branch}...{branch_name}", cwd=repo_dir)
    
    if not diff_out.strip():
        # Branch exists but no commits made
        return ""
        
    # Limit diff output
    diff_str = diff_out[:3000] + ("\n...diff truncated..." if len(diff_out) > 3000 else "")
    
    # 3. Attempt to run tests if applicable
    test_results = "No local tests were able to run (or no standard testing script found in package.json / pytest)."
    if os.path.exists(os.path.join(repo_dir, "package.json")):
        with open(os.path.join(repo_dir, "package.json"), "r") as f:
            try:
                pkg = json.load(f)
                if "test" in pkg.get("scripts", {}):
                     code, t_out, t_err = await run_cmd_async("npm test --passWithNoTests", cwd=repo_dir)
                     test_results = f"Test suite ran (exit code {code}):\nSTDOUT:\n{t_out[-1000:]}\nSTDERR:\n{t_err[-1000:]}"
            except Exception:
                pass
    elif os.path.exists(os.path.join(repo_dir, "pytest.ini")) or os.path.exists(os.path.join(repo_dir, "tests")):
         code, t_out, t_err = await run_cmd_async("pytest --maxfail=1", cwd=repo_dir)
         test_results = f"Pytest suite ran (exit code {code}):\nSTDOUT:\n{t_out[-1000:]}\nSTDERR:\n{t_err[-1000:]}"
         
         
    # Generate an AI summary of the diff so we don't spam the chat context with 3000 chars of pure code
    try:
        from app.routers.ask_nova import get_bedrock_client
        client = get_bedrock_client()
        diff_summary = await _invoke_nova_for_diff_summary(client, diff_str)
    except Exception as e:
        diff_summary = f"Summary failed: {e}. Raw diff truncated length: {len(diff_str)}"

    evaluation = (
        f"\n\n--- LOCAL COMMIT ANALYSIS ---\n"
        f"The user has created local commits on branch '{branch_name}'.\n"
        f"AI Summary of Code Changes:\n{diff_summary}\n\n"
        f"Local Unit Test Results:\n{test_results}\n\n"
        f"Whenever the user asks you to verify their local solution, strictly check the 'Local Unit Test Results' block. "
        f"If the tests passed (if they exist) and the 'AI Summary of Code Changes' matches the proposed approach, explicitly congratulate them and say the issue is solved. "
        f"If there are errors, guide them on how to fix the code."
    )
    return evaluation
