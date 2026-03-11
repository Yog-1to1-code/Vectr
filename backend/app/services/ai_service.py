import json
import boto3
from typing import List, Dict

# Set up the Bedrock client (Make sure your AWS Credentials are in the .env or environment)
bedrock_client = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1' # Change this if your AWS region is different
)

# Amazon Nova Lite model ID
MODEL_ID = "us.amazon.nova-lite-v1:0"

def ask_nova_about_issues(catalog: List[Dict], user_message: str, chat_history: List[Dict] = None) -> str:
    """
    Sends the GitHub Catalog as a System Prompt to Nova Lite and processes the chat.
    chat_history should be a list of dicts like [{"role": "user", "content": "..."}]
    """
    if chat_history is None:
        chat_history = []
        
    # The System Prompt is where Nova gets all its knowledge about the repos
    system_prompt = f"""
    You are an AI Project Manager assisting a developer for a Hackathon. 
    Below is a catalog of all open issues across the organization's repositories:
    
    {json.dumps(catalog, indent=2)}
    
    YOUR TASK:
    1. Greet the user and ask what kind of work they are looking for (e.g., frontend, backend, bug fixes, features).
    2. Recommend 2-3 specific issues from the catalog based on their preferences. 
    3. When recommending an issue, format it clearly: **[RepoName] Issue #123:** Title.
    4. If the user explicitly selects an issue, output a special exact string anywhere in your response: 
       "SELECTED_ISSUE: RepoName/#123" so the system knows they chose it. Do not use this string otherwise.
    """

    # Format the message for the Bedrock Converse API
    system = [{"text": system_prompt}]
    
    # Append the newest user message to the history
    messages = chat_history + [
        {"role": "user", "content": [{"text": user_message}]}
    ]

    try:
        # Call the Nova Lite model via the Converse API
        response = bedrock_client.converse(
            modelId=MODEL_ID,
            messages=messages,
            system=system,
            inferenceConfig={
                "temperature": 0.5,
                "topP": 0.9
            }
        )
        
        # Extract and return what Nova says
        return response['output']['message']['content'][0]['text']

    except Exception as e:
        print(f"Error calling AWS Bedrock: {e}")
        return "Sorry, I couldn't reach Amazon Nova right now."
