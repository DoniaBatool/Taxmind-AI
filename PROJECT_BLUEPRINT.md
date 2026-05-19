# TaxMind AI — Project Blueprint
## Enterprise Tax & Accounting Workflow Automation Platform

**Version:** 1.0  
**Stack:** React + FastAPI + Neon DB + Claude API  
**Target Users:** CA firms, tax accountants, bookkeeping services  
**Deployment:** Render (Backend + Frontend)

---

## 1. Executive Summary

TaxMind AI is a full-stack, AI-powered accounting workflow automation platform that enables tax professionals to systematically analyze client financial documents, detect anomalies, generate year-over-year comparisons, and receive intelligent tax planning recommendations — all through a modern interactive dashboard and a natural language chat interface backed by a multi-agent Claude AI system.

The platform ingests two primary documents per client:
- **Prior-year tax return** (PDF — Forms 1120-S, 1065, Schedule C)
- **Current-year financials** (CSV — pre-categorized P&L statements)

It then uses specialized AI sub-agents to extract, compare, flag, and report — replacing hours of manual accountant review with a structured, repeatable, AI-driven workflow.

---

## 2. Core Features

### 2.1 Document Ingestion Engine
- Upload prior-year PDF tax returns per client
- Upload current-year CSV P&L statements
- Automatic structured data extraction via Claude API
- Parsed data stored in Neon DB as JSON profiles

### 2.2 Year-over-Year Financial Comparison
- Revenue, COGS, gross profit, net income comparison
- Expense category-level delta analysis
- Percentage change calculations with contextual interpretation
- New or missing categories automatically flagged

### 2.3 Red Flag Detection
- Revenue drop/spike beyond 20% threshold
- Single expense category change beyond 50%
- Missing officer salary (IRS compliance risk)
- Unusual COGS ratio vs prior year
- Net loss in consecutive years
- Unrecognized or new expense categories

### 2.4 Tax Planning Opportunity Alerts
- Section 199A (20% pass-through deduction) eligibility
- Estimated quarterly tax payment tracking
- Retirement contribution window identification
- Equipment/asset purchase tax benefit windows
- Reasonable compensation analysis for S-Corps

### 2.5 Smart Question Generator
- Per-client list of accountant follow-up questions
- Auto-generated based on anomalies and flags
- Exportable as PDF report

### 2.6 Daily Morning Briefing
- Priority-ranked client list on dashboard load
- Color-coded urgency: Red (urgent), Yellow (review), Green (on track)
- One-line summary per client
- Auto-refreshes on demand

### 2.7 Interactive Chat Interface
- Natural language queries to main orchestrator agent
- Agent routes tasks to specialized sub-agents
- Real-time streaming responses via WebSocket
- Full conversation history per session stored in Neon DB

---

## 3. Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| Recharts | Data visualization |
| Zustand | State management |
| React Query | Server state + caching |
| WebSocket (native) | Real-time chat streaming |

### Backend
| Tool | Purpose |
|------|---------|
| FastAPI | REST API + WebSocket server |
| Python 3.11+ | Core language |
| pdfplumber | PDF text extraction |
| pandas | CSV parsing + data manipulation |
| SQLAlchemy | ORM |
| Alembic | Database migrations |
| python-dotenv | Environment management |
| uvicorn | ASGI server |

### Database
| Tool | Purpose |
|------|---------|
| Neon DB | Serverless PostgreSQL (cloud) |
| SQLAlchemy + asyncpg | Async DB driver |

### AI Layer
| Tool | Purpose |
|------|---------|
| Anthropic Claude API | Core AI engine |
| claude-sonnet-4-20250514 | Primary model |
| Multi-agent orchestration | Task delegation |
| Structured outputs | JSON extraction from documents |

### DevOps
| Tool | Purpose |
|------|---------|
| Git + GitHub | Version control |
| Render | Full deployment (backend + frontend) |
| GitHub Actions | CI/CD pipeline |

---

## 4. Multi-Agent Architecture

### 4.1 Agent Hierarchy

```
Main Orchestrator Agent (Claude)
│
├── pdf-tax-analyzer (Sub-Agent)
│   └── Skill: pdf-extraction
│
├── financial-comparator (Sub-Agent)
│   └── Skill: yoy-comparison
│
├── anomaly-detector (Sub-Agent)
│   └── Skill: red-flag-detection
│
├── tax-planner (Sub-Agent)
│   └── Skill: tax-opportunity-finder
│
└── report-generator (Sub-Agent)
    └── Skill: client-report-builder
```

### 4.2 Agent Descriptions

#### Main Orchestrator
- Receives user messages from chat interface
- Interprets intent and routes to appropriate sub-agent
- Aggregates sub-agent responses
- Maintains conversation context

#### pdf-tax-analyzer
- Ingests PDF tax return text
- Extracts: revenue, COGS, expenses by category, officer compensation, entity type, filing year, net income/loss
- Returns structured JSON client profile

#### financial-comparator
- Takes prior-year JSON profile + current-year CSV data
- Calculates delta for every line item
- Returns comparison table with percentage changes and direction indicators

#### anomaly-detector
- Receives comparison table
- Applies threshold rules to flag anomalies
- Returns prioritized list of red flags with explanations

#### tax-planner
- Receives current-year trajectory + entity type
- Checks eligibility for tax planning opportunities
- Returns actionable recommendations with estimated savings

#### report-generator
- Aggregates all sub-agent outputs
- Formats into structured client report
- Returns markdown report (exportable to PDF)

---

## 5. Skills Required

### skill: pdf-extraction
```
Purpose:    Extract structured financial data from PDF tax returns
Tools:      pdfplumber, Claude API structured output
Input:      PDF file path + entity type hint
Output:     JSON client financial profile
```

### skill: yoy-comparison
```
Purpose:    Compare prior-year tax data vs current-year CSV financials
Tools:      pandas, Claude API
Input:      Prior-year JSON + current-year CSV
Output:     Comparison table with deltas and interpretations
```

### skill: red-flag-detection
```
Purpose:    Identify financial anomalies and compliance risks
Tools:      Rule engine + Claude API
Input:      Comparison table + entity type
Output:     Prioritized red flags list with severity levels
```

### skill: tax-opportunity-finder
```
Purpose:    Identify tax planning opportunities
Tools:      Claude API + rule templates per entity type
Input:      Current-year financials + entity type + prior actuals
Output:     Actionable tax planning recommendations
```

### skill: client-report-builder
```
Purpose:    Generate formatted client review report
Tools:      Claude API + markdown templates
Input:      All sub-agent outputs
Output:     Structured markdown report (PDF exportable)
```

---

## 6. Database Schema (Neon DB / PostgreSQL)

```sql
-- Clients table
clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  entity_type VARCHAR(50),   -- S-Corp, LLC, Sole-Prop, Partnership
  industry VARCHAR(100),
  fiscal_year_end DATE,
  created_at TIMESTAMP
)

-- Tax returns (parsed PDF data)
tax_returns (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  tax_year INT,
  raw_pdf_path VARCHAR(500),
  parsed_data JSONB,          -- structured extraction result
  created_at TIMESTAMP
)

-- Current year financials (parsed CSV)
financials (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  fiscal_year INT,
  raw_csv_path VARCHAR(500),
  parsed_data JSONB,
  created_at TIMESTAMP
)

-- Analysis results
analyses (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  analysis_year INT,
  comparison_data JSONB,      -- YoY comparison table
  red_flags JSONB,            -- detected anomalies
  tax_opportunities JSONB,    -- planning recommendations
  smart_questions JSONB,      -- follow-up questions
  priority_level VARCHAR(20), -- urgent | review | on-track
  created_at TIMESTAMP
)

-- Chat sessions
chat_sessions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  client_context_id UUID REFERENCES clients(id),
  created_at TIMESTAMP
)

-- Chat messages
chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  role VARCHAR(20),           -- user | assistant | agent
  agent_name VARCHAR(100),    -- which sub-agent responded
  content TEXT,
  created_at TIMESTAMP
)

-- Generated reports
reports (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  analysis_id UUID REFERENCES analyses(id),
  content_markdown TEXT,
  generated_at TIMESTAMP
)
```

---

## 7. API Endpoints (FastAPI)

### Client Management
```
POST   /api/clients                    Create client
GET    /api/clients                    List all clients
GET    /api/clients/{id}               Get client detail
```

### Document Upload
```
POST   /api/clients/{id}/tax-return    Upload PDF tax return
POST   /api/clients/{id}/financials    Upload CSV P&L
```

### Analysis
```
POST   /api/clients/{id}/analyze       Trigger full analysis
GET    /api/clients/{id}/analysis      Get latest analysis
GET    /api/clients/{id}/red-flags     Get red flags only
GET    /api/clients/{id}/tax-plan      Get tax planning report
GET    /api/clients/{id}/report        Get formatted report
```

### Dashboard
```
GET    /api/dashboard/briefing         Morning briefing all clients
GET    /api/dashboard/priority-list    Priority-ranked client list
```

### Chat
```
WS     /ws/chat                        WebSocket chat endpoint
GET    /api/chat/{session_id}/history  Chat history
```

---

## 8. Project Folder Structure

```
taxmind-ai/
├── backend/
│   ├── main.py                    FastAPI app entry
│   ├── config.py                  Settings + env vars
│   ├── database.py                Neon DB connection
│   ├── models/                    SQLAlchemy models
│   │   ├── client.py
│   │   ├── tax_return.py
│   │   ├── financials.py
│   │   ├── analysis.py
│   │   └── chat.py
│   ├── routers/                   FastAPI route handlers
│   │   ├── clients.py
│   │   ├── documents.py
│   │   ├── analysis.py
│   │   ├── dashboard.py
│   │   └── chat.py
│   ├── agents/                    Claude AI agents
│   │   ├── orchestrator.py        Main agent
│   │   ├── pdf_analyzer.py        PDF sub-agent
│   │   ├── comparator.py          Comparison sub-agent
│   │   ├── anomaly_detector.py    Red flag sub-agent
│   │   ├── tax_planner.py         Planning sub-agent
│   │   └── report_generator.py    Report sub-agent
│   ├── skills/                    Agent skill definitions
│   │   ├── pdf_extraction/SKILL.md
│   │   ├── yoy_comparison/SKILL.md
│   │   ├── red_flag_detection/SKILL.md
│   │   ├── tax_opportunity_finder/SKILL.md
│   │   └── client_report_builder/SKILL.md
│   ├── parsers/                   Document parsers
│   │   ├── pdf_parser.py
│   │   └── csv_parser.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── ClientCard/
│   │   │   ├── ClientDetail/
│   │   │   ├── ChatInterface/
│   │   │   ├── Charts/
│   │   │   └── ReportViewer/
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ClientPage.jsx
│   │   │   └── ChatPage.jsx
│   │   ├── store/                 Zustand state
│   │   ├── hooks/                 Custom React hooks
│   │   └── api/                   API client (React Query)
│   ├── package.json
│   └── tailwind.config.js
│
├── fake-data/
│   ├── csv/                       Fake P&L CSV files
│   └── pdf-text/                  Fake tax return text files
│
└── README.md
```

---

## 9. Development Phases

### Phase 1 — Foundation (Week 1)
- Neon DB setup + schema migration
- FastAPI skeleton with all routes stubbed
- React frontend base + Tailwind + routing
- Client CRUD operations

### Phase 2 — Document Processing (Week 2)
- PDF parser (pdfplumber)
- CSV parser (pandas)
- Claude API integration for structured extraction
- pdf-tax-analyzer sub-agent

### Phase 3 — AI Analysis Engine (Week 3)
- financial-comparator sub-agent
- anomaly-detector sub-agent
- tax-planner sub-agent
- Analysis results stored in Neon DB

### Phase 4 — Dashboard (Week 4)
- Client cards with priority indicators
- Per-client detail page with charts
- Morning briefing view
- Report viewer

### Phase 5 — Chat Interface (Week 5)
- WebSocket backend
- Main orchestrator agent
- Chat UI with streaming
- Agent handoff visualization

### Phase 6 — Polish + Deploy (Week 6)
- CI/CD via GitHub Actions
- Render deployment (backend + frontend)
- README documentation
- LinkedIn project post

---

## 10. LinkedIn Showcase Description

```
TaxMind AI — Full-Stack AI Accounting Workflow Automation

An enterprise-grade platform built for CA firms and tax professionals
to automate daily client financial review using multi-agent AI.

Key Technical Achievements:
✅ Multi-agent Claude AI system with specialized sub-agents
   for PDF analysis, YoY comparison, anomaly detection,
   and tax planning
✅ Real-time chat interface with WebSocket streaming and
   agent handoff visualization  
✅ Full-stack: React + FastAPI + Neon DB (PostgreSQL)
✅ PDF tax return parsing + CSV P&L ingestion pipeline
✅ Automated red flag detection with severity classification
✅ Tax planning opportunity engine (Section 199A, estimated
   taxes, retirement windows)
✅ Priority-ranked morning briefing dashboard
✅ Deployed on Render with GitHub Actions CI/CD

Stack: React · Tailwind · FastAPI · PostgreSQL (Neon) ·
       Claude API · Multi-Agent AI · WebSocket · Python
```

---

*Document Version 1.0 — TaxMind AI Project Blueprint*
