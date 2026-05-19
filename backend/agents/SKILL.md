# Skill: multi-agent-gemini

## Purpose
Build multi-agent AI systems using Google Gemini API (gemini-1.5-pro).
Reusable pattern for any project requiring: document analysis, orchestrated sub-agents, structured JSON extraction, and real-time chat.

## When to Use
- User wants to build an AI system with multiple specialized agents
- Project requires document parsing + AI analysis (PDF, CSV, text)
- Need real-time AI chat with WebSocket
- Any FastAPI + Gemini integration project

## Core Pattern

### 1. Gemini Client (shared)
```python
import google.generativeai as genai
genai.configure(api_key=GEMINI_API_KEY)

def get_model(temperature=0.3):
    return genai.GenerativeModel(
        model_name="gemini-1.5-pro",
        generation_config=genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=8192,
        )
    )

def call_gemini_sync(prompt, temperature=0.3):
    return get_model(temperature).generate_content(prompt).text

async def call_gemini(prompt, temperature=0.3):
    return (await get_model(temperature).generate_content_async(prompt)).text
```

### 2. Sub-Agent Pattern (JSON extraction)
```python
PROMPT = """
You are a specialist in [domain]. Analyze this data:
{input_data}

Return ONLY valid JSON (no markdown):
{ "field": value, ... }
"""

def run_agent(input_data: str) -> dict:
    response = call_gemini_sync(PROMPT.format(input_data=input_data), temperature=0.1)
    # Clean markdown if present
    clean = response.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())
```

### 3. Orchestrator Pattern
```python
SYSTEM = "You are [name], an AI assistant for [domain]. Context: {context}"

def orchestrate(user_message, context=""):
    # 1. Detect intent
    # 2. Route to appropriate sub-agent
    # 3. Call Gemini with system + user message
    # 4. Return structured response
    
    agent_used = detect_intent(user_message)
    prompt = SYSTEM.format(context=context) + f"\nUser: {user_message}\nAssistant:"
    return call_gemini_sync(prompt, temperature=0.4)
```

### 4. FastAPI + WebSocket Chat
```python
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        payload = json.loads(data)
        response = await chat_with_orchestrator(payload["message"])
        await websocket.send_json({"type": "message", "content": response})
```

## Agent Architecture Template
```
Main Orchestrator (Gemini)
├── Analyzer Agent      → Extract structured data from documents
├── Comparison Agent    → Compare datasets, find deltas
├── Detection Agent     → Find anomalies, apply rules
├── Planning Agent      → Generate recommendations
└── Report Agent        → Format outputs as documents
```

## Key Rules for Gemini Prompts
1. Always say "Return ONLY valid JSON" to avoid markdown wrapping
2. Use temperature=0.1 for extraction, 0.3 for analysis, 0.5 for writing
3. Limit input to 50K chars (well within 1M context but keeps costs low)
4. Always add JSON cleanup code (strip ``` if present)
5. gemini-1.5-pro is FREE tier — use it for dev/portfolio projects

## Requirements
```
google-generativeai==0.7.2
fastapi==0.111.0
uvicorn[standard]==0.30.1
```

## Getting API Key
1. Go to aistudio.google.com
2. Sign in with Google account
3. Click "Get API Key" → "Create API key"
4. Copy and add to .env as GEMINI_API_KEY=xxx
5. Free tier: 15 requests/minute, 1M tokens/minute — enough for dev

## Common Mistakes to Avoid
- Don't use `async` for sub-agents called from background tasks — use sync versions
- Always handle JSONDecodeError — Gemini occasionally wraps in markdown
- Don't pass entire file to Gemini — slice to 50K chars max for safety
- Use `temperature=0.1` for structured extraction (deterministic outputs)
