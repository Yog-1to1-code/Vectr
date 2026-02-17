import os
import json
import logging
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aws-mock-proxy")

OLLAMA_GENERATE_URL = os.getenv("OLLAMA_GENERATE_URL", "http://localhost:11434/api/generate")
OLLAMA_CHAT_URL = os.getenv("OLLAMA_CHAT_URL", "http://localhost:11434/api/chat")
# Default model to use if not specified or mapped
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:20b-cloud")

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "running", "service": "AWS Bedrock Mock Proxy", "usage": "Use AWS CLI or SDK to invoke models at /model/{model_id}/invoke"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/model/{model_id}/invoke")
async def invoke_model(model_id: str, request: Request):
    logger.info(f"Received invocation for model: {model_id}")
    
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    # Determine usage pattern based on body content
    
    # Amazon Nova / Converse API pattern / Claude 3 (Bedrock)
    # Check for 'messages' key which is standard in Nova and Converse API
    if "messages" in body:
        return await handle_converse_style(body, model_id)
    
    # Titan pattern
    if "inputText" in body:
        return await handle_titan_style(body, model_id)
        
    # Claude 2 / Legacy pattern
    if "prompt" in body:
        return await handle_claude_style(body, model_id)

    # Fallback: Treat as simple prompt if nothing else matches
    return JSONResponse(status_code=400, content={"error": "Unsupported request format. Use Amazon Nova (messages), Titan (inputText), or Claude (prompt) format."})

async def handle_converse_style(body, model_id):
    # Map to Ollama Chat API
    ollama_msgs = []
    
    # System prompts
    if "system" in body:
        for s in body["system"]:
            if "text" in s:
                ollama_msgs.append({"role": "system", "content": s["text"]})
    
    # Messages
    for m in body.get("messages", []):
        role = m.get("role", "user")
        content = ""
        # Content can be list of blocks or string (though Nova uses list of blocks)
        if isinstance(m.get("content"), list):
            for block in m["content"]:
                if "text" in block:
                    content += block["text"]
        elif isinstance(m.get("content"), str):
            content = m["content"]
            
        ollama_msgs.append({"role": role, "content": content})

    req = {
        "model": DEFAULT_OLLAMA_MODEL,
        "messages": ollama_msgs,
        "stream": False
    }
    
    # Map inference parameters if present
    if "inferenceConfig" in body:
        opts = {}
        inf_conf = body["inferenceConfig"]
        if "max_new_tokens" in inf_conf:
            opts["num_predict"] = inf_conf["max_new_tokens"]
        if "temperature" in inf_conf:
            opts["temperature"] = inf_conf["temperature"]
        if "top_p" in inf_conf:
            opts["top_p"] = inf_conf["top_p"]
            
        if opts:
            req["options"] = opts

    logger.info(f"Forwarding to Ollama Chat: {req}")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(OLLAMA_CHAT_URL, json=req, timeout=60.0)
            if resp.status_code != 200:
                logger.error(f"Ollama error: {resp.text}")
                return JSONResponse(status_code=502, content={"error": f"Ollama error: {resp.text}"})
            ollama_resp = resp.json()
        except Exception as e:
            logger.error(f"Ollama connection error: {e}")
            return JSONResponse(status_code=502, content={"error": str(e)})

    # Construct Amazon Nova response
    response_text = ollama_resp.get("message", {}).get("content", "")
    
    nova_resp = {
        "output": {
            "message": {
                "role": "assistant",
                "content": [{"text": response_text}]
            }
        },
        "stopReason": "end_turn",
        "usage": {
            "inputTokens": ollama_resp.get("prompt_eval_count", 0),
            "outputTokens": ollama_resp.get("eval_count", 0)
        }
    }
    
    return JSONResponse(content=nova_resp)

async def handle_titan_style(body, model_id):
    # Map to Ollama Generate API (or Chat)
    prompt = body.get("inputText", "")
    req = {
        "model": DEFAULT_OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    
    # Map config
    text_gen_config = body.get("textGenerationConfig", {})
    opts = {}
    if "maxTokenCount" in text_gen_config:
        opts["num_predict"] = text_gen_config["maxTokenCount"]
    if "temperature" in text_gen_config:
        opts["temperature"] = text_gen_config["temperature"]
    if opts:
        req["options"] = opts
    
    async with httpx.AsyncClient() as client:
        try:
            # Use generate endpoint for simple text
            resp = await client.post(OLLAMA_GENERATE_URL, json=req, timeout=60.0) 
            if resp.status_code != 200:
                return JSONResponse(status_code=502, content={"error": resp.text})
            ollama_resp = resp.json()
        except Exception as e:
            return JSONResponse(status_code=502, content={"error": str(e)})

    response_text = ollama_resp.get("response", "")
    
    titan_resp = {
        "results": [{"outputText": response_text}],
        "inputTextTokenCount": ollama_resp.get("prompt_eval_count", 0)
    }
    return JSONResponse(content=titan_resp)

async def handle_claude_style(body, model_id):
    # Map to Ollama Generate API
    # Claude prompts often formatted "\n\nHuman: ... \n\nAssistant:"
    prompt = body.get("prompt", "")
    req = {
        "model": DEFAULT_OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(OLLAMA_GENERATE_URL, json=req, timeout=60.0)
            if resp.status_code != 200:
                return JSONResponse(status_code=502, content={"error": resp.text})
            ollama_resp = resp.json()
        except Exception as e:
            return JSONResponse(status_code=502, content={"error": str(e)})

    response_text = ollama_resp.get("response", "")
    
    claude_resp = {
        "completion": response_text,
        "stop_reason": "stop_sequence"
    }
    return JSONResponse(content=claude_resp)

if __name__ == "__main__":
    import uvicorn
    # Listen on 0.0.0.0 to be accessible, port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
