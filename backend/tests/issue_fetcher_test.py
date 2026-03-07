import httpx
import asyncio
import json
import os
from dotenv import load_dotenv
from issue_fetcher import fetch_issue 

# Load variables from .env
load_dotenv()

async def test_github_pat():
    # Retrieve the token from environment variables
    pat = os.getenv("GITHUB_PAT")
    
    if not pat:
        print("❌ Error: GITHUB_PAT not found in .env file")
        return

    headers = {
        "Authorization": f"token {pat}", 
        "Accept": "application/vnd.github.v3+json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://api.github.com/user", headers=headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"❌ Failed! Status Code: {e.response.status_code}")
            return False

    print(f"✅ Success! Logged in as: {response.json().get('login')}")
    
    print("Fetching issues and messages...")
    # Capture the data from the fetch_issue function
    issues_data = await fetch_issue("google", "lyra", pat)
    
    # Save the full data (including the issue body and comments) to JSON
    with open("issues.json", "w") as f:
        json.dump(issues_data, f, indent=4)
    
    # Extract only the browser-friendly URLs
    refined_urls = [issue["url"] for issue in issues_data]
    
    print(f"🚀 Done! Check 'issues.json' for the full data.")
    return refined_urls

if __name__ == "__main__":
    asyncio.run(test_github_pat())