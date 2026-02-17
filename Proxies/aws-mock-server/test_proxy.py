import boto3
import json
import botocore.config

# Configuration
PROXY_URL = "http://localhost:8000"
REGION_NAME = "us-east-1"
# We can use any dummy credentials since our proxy doesn't check them (yet)
# But boto3 requires something.
AWS_ACCESS_KEY_ID = "test"
AWS_SECRET_ACCESS_KEY = "test"

# The proxy is configured to use 'gpt-oss:20b-cloud' by default
# We use the Amazon Nova Micro ID which our proxy maps to the chat endpoint
MODEL_ID = "amazon.nova-micro-v1:0" 

def test_bedrock_invocation():
    print(f"Connecting to Bedrock Proxy at {PROXY_URL}...")
    
    # Create a Bedrock Runtime client pointing to our local proxy
    client = boto3.client(
        service_name="bedrock-runtime",
        region_name=REGION_NAME,
        endpoint_url=PROXY_URL,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        config=botocore.config.Config(retries={'max_attempts': 0}) 
    )

    # Use the 'Converse' API structure (messages) which maps well to modern LLMs
    # This matches the 'Amazon Nova' format our proxy expects for chat
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [{"text": "Hello! Who are you and what model are you running?"}]
            }
        ],
        "inferenceConfig": {
            "max_new_tokens": 512,
            "temperature": 0.5
        }
    }

    print(f"\nInvoking model: {MODEL_ID}")
    print("Payload:", json.dumps(payload, indent=2))

    try:
        response = client.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps(payload)
        )
        
        # Parse the response body
        response_body = json.loads(response['body'].read())
        
        print("\n--- Response from Proxy/Ollama ---")
        print(json.dumps(response_body, indent=2))
        
        # Extract the text content if following Nova structure
        msg_content = response_body.get('output', {}).get('message', {}).get('content', [])
        if msg_content:
            print("\nExtracted Text:", msg_content[0].get('text', ''))
            
    except Exception as e:
        print("\nError invoking model:")
        print(e)

if __name__ == "__main__":
    test_bedrock_invocation()
