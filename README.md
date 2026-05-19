# TaxMind AI 🧠⚡

**Enterprise Tax & Accounting Workflow Automation Platform**

AI-powered platform for CA firms and tax professionals to automate daily client financial review using multi-agent Claude AI.

---

## What It Does

| Feature | Description |
|---------|-------------|
| 📄 Document Ingestion | Upload PDF tax returns + CSV P&L statements per client |
| 🔍 YoY Comparison | Automated year-over-year financial analysis |
| 🚨 Red Flag Detection | AI-detected anomalies with severity classification |
| 💡 Tax Planning | Section 199A, retirement windows, estimated tax alerts |
| 📊 Dashboard | Priority-ranked client briefing with interactive charts |
| 💬 Chat Interface | Natural language queries with multi-agent AI routing |

---

## Tech Stack

```
Frontend:   React 18 + Tailwind CSS + shadcn/ui + Recharts
Backend:    FastAPI (Python 3.11)
Database:   Neon DB (Serverless PostgreSQL)
AI Engine:  Anthropic Claude API (claude-sonnet-4)
Deploy:     Render (backend + frontend)
```

---

## Project Structure

```
taxmind-ai/
├── backend/           FastAPI + Python AI agents
├── frontend/          React dashboard + chat UI
├── fake-data/
│   ├── csv/           5 fake client P&L files
│   └── pdf-text/      5 fake tax return files
├── docs/
│   └── PROJECT_BLUEPRINT.md
└── dashboard/
    └── index.html     Standalone dashboard preview
```

---

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # add ANTHROPIC_API_KEY and NEON_DATABASE_URL
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## Fake Clients Included

| Client | Entity | Status |
|--------|--------|--------|
| Rivera Construction | S-Corp | 🔴 Urgent |
| Sunrise Retail | Sole Prop | 🔴 Urgent |
| TechStart Solutions | LLC | ⚠️ Review |
| Green Valley Bakery | Sole Prop | ⚠️ Review |
| Cooper Medical Group | S-Corp | ✅ On Track |

---

## Multi-Agent Architecture

```
Main Orchestrator Agent
├── pdf-tax-analyzer      PDF extraction sub-agent
├── financial-comparator  YoY comparison sub-agent
├── anomaly-detector      Red flag detection sub-agent
├── tax-planner           Planning opportunities sub-agent
└── report-generator      Client report sub-agent
```

---

*Built as a portfolio project demonstrating multi-agent AI + full-stack development.*
