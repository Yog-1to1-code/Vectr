import requests
import json

url = "http://127.0.0.1:8000/nova/summarize"

payload = {
  "repo_name": "facebook/react",
  "issue_number": 28540,
  "issue_title": "Bug: React rendering issue with Suspense",
  "issue_body": "When using Suspense with a lazy loaded component, the fallback is sometimes flickering even when the data is already cached. I noticed this behavior in React 18.2.",
  "comments": [
    "I can reproduce this too. It happens specifically when navigating back and forth.",
    "Could it be related to startTransition? If we wrap the state update in it, the flickering stops.",
    "Yes! Adding startTransition around the navigation state setter fixes the flicker for me."
  ]
}

headers = {
    'Content-Type': 'application/json'
}

print("Testing /nova/summarize endpoint with simulated issue...")
try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("\nSUCCESS! Here is the JSON response:\n")
        print(json.dumps(response.json(), indent=4))
    else:
        print(f"Error: {response.text}")
except requests.exceptions.ConnectionError:
    print("Error: Could not connect to the server. Make sure your FastAPI app is running (uvicorn app.main:app --reload)")
