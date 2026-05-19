# TaxMind AI — Backend Setup Guide
## Gemini API + Neon DB + FastAPI

---

## Step 1: API Keys Lo

### Gemini API Key (FREE)
1. Go to: https://aistudio.google.com
2. Sign in with Google account
3. Click "Get API Key" → "Create API key in new project"
4. Key copy karo

### Neon DB (FREE)
1. Go to: https://neon.tech
2. Sign up with GitHub ya Google
3. "New Project" → Name: taxmindai → Region: US East
4. Dashboard pe "Connection string" copy karo
5. Format: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb`
6. Is string mein `postgresql://` ko `postgresql+asyncpg://` se replace karo

---

## Step 2: Project Setup

```bash
# Backend folder mein jao
cd TaxMindAI/backend

# .env file banao
cp .env.example .env

# .env mein apni keys paste karo:
# GEMINI_API_KEY=AIza...
# DATABASE_URL=postgresql+asyncpg://...
```

---

## Step 3: Dependencies Install karo

```bash
pip install -r requirements.txt
```

---

## Step 4: Server Start karo

```bash
uvicorn main:app --reload --port 8000
```

Agar sab theek hai to yeh dikhega:
```
TaxMind AI starting up...
Database tables ready ✓
Gemini model: gemini-1.5-pro ✓
TaxMind AI is ready! 🧠⚡
```

---

## Step 5: API Test karo

Browser mein open karo:
- http://localhost:8000 → Health check
- http://localhost:8000/docs → Interactive API docs (Swagger)

---

## Step 6: Fake Data Load karo

Swagger docs (localhost:8000/docs) mein:

1. POST /api/clients → 5 fake clients create karo
2. POST /api/clients/{id}/tax-return → .txt files upload karo (fake-data folder mein hain)
3. POST /api/clients/{id}/financials → .csv files upload karo
4. POST /api/clients/{id}/analyze → AI analysis trigger karo
5. GET /api/dashboard/briefing → Dashboard data dekho

---

## Folder Structure (complete)

```
backend/
├── main.py              ← FastAPI entry point (uvicorn main:app)
├── config.py            ← Settings (.env se load hoti hain)
├── database.py          ← Neon DB connection
├── requirements.txt     ← pip install -r requirements.txt
├── .env.example         ← Copy karke .env banao
├── .env                 ← Apni keys yahan (gitignore mein hai)
│
├── models/              ← SQLAlchemy database models
│   ├── client.py
│   ├── tax_return.py
│   ├── financials.py
│   ├── analysis.py
│   ├── chat.py
│   └── report.py
│
├── routers/             ← FastAPI route handlers
│   ├── clients.py       ← /api/clients
│   ├── documents.py     ← /api/clients/{id}/tax-return + /financials
│   ├── analysis.py      ← /api/clients/{id}/analyze
│   ├── dashboard.py     ← /api/dashboard/briefing
│   └── chat.py          ← /ws/chat (WebSocket)
│
├── agents/              ← Gemini AI agents
│   ├── gemini_client.py ← Shared Gemini connection
│   ├── orchestrator.py  ← Main agent + chat handler
│   ├── pdf_analyzer.py  ← Sub-agent 1: PDF extraction
│   ├── comparator.py    ← Sub-agent 2: YoY comparison
│   ├── anomaly_detector.py ← Sub-agent 3: Red flags
│   ├── tax_planner.py   ← Sub-agent 4: Tax opportunities
│   ├── report_generator.py ← Sub-agent 5: Client report
│   └── SKILL.md         ← Reusable skill documentation
│
└── parsers/             ← Document parsers
    ├── pdf_parser.py    ← pdfplumber (+ .txt support for fake data)
    └── csv_parser.py    ← pandas CSV parser
```

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError: google.generativeai` | `pip install google-generativeai` |
| `asyncpg.exceptions.InvalidPasswordError` | Neon DB URL check karo .env mein |
| `GEMINI_API_KEY not set` | .env file mein key add karo |
| `Connection refused` | uvicorn chal raha hai? Port 8000? |
| Gemini JSON parse error | Normal hai — retry karo ya temperature kam karo |

---

## Next Steps (Phase 4)

Phase 3 complete! Ab Frontend (React) banana hai:
- Dashboard page with client cards
- Client detail page with charts
- Chat interface with WebSocket
- File upload UI

Agle session mein React frontend banayenge. 🚀
