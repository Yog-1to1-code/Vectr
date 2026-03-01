import httpx
from fastapi import HTTPException

async def fetch_issue(org_name: str, repo_name: str, pat: str):
    url = f"https://api.github.com/repos/{org_name}/{repo_name}/issues"
    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json"
    }
    params = {
        "state": "open",
        "sort": "created",
        "labels": "good first issue",
        "per_page": 10 # Kept small for testing
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"GitHub Error: {response.text}")

        all_data = response.json()
        only_issues = [i for i in all_data if "pull_request" not in i]
        
        results = []
        for issue in only_issues:
            # Fetch comments (messages) for this specific issue
            comments_resp = await client.get(issue["comments_url"], headers=headers)
            comments = comments_resp.json() if comments_resp.status_code == 200 else []
            
            results.append({
                "title": issue["title"],
                "url": issue["html_url"],
                "date": issue["created_at"],
                "user": issue["user"]["login"],
                "body": issue["body"],
                "messages": [c["body"] for c in comments] # Extracting comment text
            })
            
        return results