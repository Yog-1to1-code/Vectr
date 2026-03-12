import os
import requests
from typing import List, Dict

# Fetching the PAT from the environment variables (Make sure this is set in your .env!)
GITHUB_PAT = os.getenv("GITHUB_TOKEN")

def get_github_headers() -> dict:
    headers = {
        "Accept": "application/vnd.github.v3+json",
    }
    if GITHUB_PAT:
        headers["Authorization"] = f"token {GITHUB_PAT}"
    return headers

def fetch_org_catalog(org_name: str, repo_name: str = None, label: str = None) -> List[Dict]:
    """
    Fetches issues. If repo_name is provided, it only fetches issues for that repo.
    If label is provided, it filters issues by that label directly via the GitHub API.
    Returns a clean, compact catalog for Nova Lite.
    """
    headers = get_github_headers()
    catalog = []

    # If the user selected a specific repo, we don't need to fetch the whole org
    if repo_name:
        repos = [{"name": repo_name, "open_issues_count": 1}] # Fake count to bypass the skip logic
    else:
        # 1. Fetch repositories for the organization
        repos_url = f"https://api.github.com/orgs/{org_name}/repos?per_page=100"
        repos_response = requests.get(repos_url, headers=headers)
        
        if repos_response.status_code != 200:
            print(f"Failed to fetch repos for {org_name}: {repos_response.text}")
            return []
        
        repos = repos_response.json()



    # 2. Loop through repos and fetch issues
    for repo in repos:
        current_repo = repo["name"]
        open_issues_count = repo.get("open_issues_count", 0)

        # Skip repos with no issues to save API calls and tokens
        if open_issues_count == 0 and not repo_name:
            continue

        # Build the issue URL with optional label filtering
        issues_url = f"https://api.github.com/repos/{org_name}/{current_repo}/issues?state=open&per_page=50"
        if label:
            issues_url += f"&labels={label}"
            
        issues_response = requests.get(issues_url, headers=headers)
        
        if issues_response.status_code == 200:
            issues_data = issues_response.json()
            clean_issues = []
            
            for issue in issues_data:
                # Filter out Pull Requests (GitHub returns them in the Issues API)
                if "pull_request" in issue:
                    continue
                    
                # Create a compact summary of the issue
                clean_issues.append({
                    "number": issue["number"],
                    "title": issue["title"],
                    "labels": [label["name"] for label in issue.get("labels", [])]
                })

            if clean_issues:
                catalog.append({
                    "repo": current_repo,
                    "issues": clean_issues
                })

    return catalog

# Example usage (You can test this directly if you put a test string below)
# if __name__ == "__main__":
#     print(fetch_org_catalog("facebook")) # Replace with your org

def fetch_repo_summary(org_name: str, repo_name: str) -> str:
    """
    Fetches the native high-level summary of a repository directly from GitHub 
    to save on LLM token costs.
    """
    headers = get_github_headers()
    url = f"https://api.github.com/repos/{org_name}/{repo_name}"
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        
        # Build a tiny, token-efficient string for Nova Lite
        summary = (
            f"Repository: {data.get('name', 'Unknown')}\n"
            f"Description: {data.get('description', 'No description provided.')}\n"
            f"Primary Language: {data.get('language', 'Unknown')}\n"
            f"Topics: {', '.join(data.get('topics', []))}\n"
            f"Stars: {data.get('stargazers_count', 0)} | Forks: {data.get('forks_count', 0)}\n"
        )
        return summary
    return "Repository data unavailable."
