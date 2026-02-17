# AWS Bedrock to Ollama Proxy

This is a local proxy server that allows you to use the AWS CLI (`aws bedrock-runtime`) backed by a local Ollama instance instead of real AWS services. This helps in developing and testing applications without incurring AWS costs.

## Prerequisites

1.  **Python 3.8+** installed.
2.  **Ollama** installed and running locally (`http://localhost:11434`).
3.  **AWS CLI** installed (for testing).

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Pull an Ollama Model**:
    By default, the proxy uses `llama3`. Ensure you have it pulled or set the `OLLAMA_MODEL` environment variable.
    ```bash
    ollama pull llama3
    ```

3.  **Run the Proxy Server**:
    ```bash
    python main.py
    ```
    The server will start at `http://localhost:8000`.

## Usage

You can now use the AWS CLI to invoke models. The proxy detects the request format and forwards it to Ollama.

### 1. Amazon Nova / Converse API Format (Recommended)

Create a file `payload.json`:
```json
{
  "messages": [
    {
      "role": "user",
      "content": [{"text": "Tell me a short story about a robot."}]
    }
  ],
  "inferenceConfig": {
    "max_new_tokens": 100,
    "temperature": 0.7
  }
}
```

Run AWS CLI:
```bash
aws bedrock-runtime invoke-model \
    --model-id amazon.nova-micro-v1:0 \
    --body file://payload.json \
    --endpoint-url http://localhost:8000 \
    --region us-east-1 \
    output.json
```

Check `output.json` for the response.

### 2. Titan Format (Legacy)

Payload (`titan-payload.json`):
```json
{
  "inputText": "Explain quantum computing in one sentence."
}
```

Command:
```bash
aws bedrock-runtime invoke-model \
    --model-id amazon.titan-text-express-v1 \
    --body file://titan-payload.json \
    --endpoint-url http://localhost:8000 \
    --region us-east-1 \
    output.json
```

### 3. Claude Format (Legacy)

Payload (`claude-payload.json`):
```json
{
  "prompt": "\n\nHuman: Hello\n\nAssistant:"
}
```

Command:
```bash
aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-v2 \
    --body file://claude-payload.json \
    --endpoint-url http://localhost:8000 \
    --region us-east-1 \
    output.json
```

## Configuration

You can configure the proxy using environment variables:

-   `OLLAMA_URL`: URL to Ollama Generate API (default: `http://localhost:11434/api/generate`)
-   `OLLAMA_CHAT_URL`: URL to Ollama Chat API (default: `http://localhost:11434/api/chat`)
-   `OLLAMA_MODEL`: The local Ollama model to use (default: `llama3`).
