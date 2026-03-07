import asyncio
import json
import os
from dotenv import load_dotenv
from issue_fetcher import fetch_issue 
from pr_fetcher import fetch_prs # New import

load_dotenv()

async def run_test():
    pat = os.getenv("GITHUB_PAT")
    org, repo = "google", "lyra"

    print(f"--- Fetching Data for {org}/{repo} ---")
    
    # Run both concurrently for speed
    issues_task = fetch_issue(org, repo, pat)
    prs_task = fetch_prs(org, repo, pat)
    
    issues, prs = await asyncio.gather(issues_task, prs_task)

    # Combine into one report
    report = {
        "repository": f"{org}/{repo}",
        "open_issues": issues,
        "open_pull_requests": prs
    }

    with open("PRs.json", "w") as f:
        json.dump(report, f, indent=4)

    print(f"✅ Success! Saved {len(issues)} issues and {len(prs)} PRs to 'repo_data.json'")

if __name__ == "__main__":
    asyncio.run(run_test())