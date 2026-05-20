# TaxMind AI 🧠

**Enterprise AI-powered tax and accounting workflow automation for CA firms.**

TaxMind AI helps Chartered Accountant firms analyze client tax returns, identify red flags, generate actionable tax strategies, and manage their entire client portfolio — all powered by OpenAI GPT models.

🌐 **Live Demo:** [https://taxmind-frontend.onrender.com](https://taxmind-frontend.onrender.com)

---

## Features

### For CA Firms
- **Multi-client dashboard** — Priority-ranked briefing (Urgent / Review / On Track) across all clients
- **AI Analysis Engine** — Multi-agent system that reads tax returns (PDF) and financial statements (CSV) to generate:
  - Executive overview with year-over-year comparisons
  - Red flag identification with severity levels (High / Medium / Low)
  - Tax planning strategies with estimated savings
  - Smart questions for client meetings
- **Document Management** — Upload, view, and delete tax returns and P&L statements per client
- **Analysis History** — Full history of every AI analysis run with ability to switch between them
- **PDF Report Download** — Professional branded PDF report for each client
- **AI Chat Interface** — Ask the AI anything about a specific client in a conversational window
- **Edit Client Info** — Update client name, entity type, industry, and contact details

### For Platform Admins
- **Admin Panel** — View all registered firms, grant/revoke admin roles, delete firms
- **Cross-firm dashboard** — Admins see all clients across all firms
- **Role-based access control** — JWT-based auth with admin guard on all sensitive endpoints

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Recharts, Axios |
| **Backend** | FastAPI (Python 3.11), SQLAlchemy 2.0 (async) |
| **Database** | PostgreSQL via Neon DB (serverless) |
| **AI** | OpenAI GPT-4o-mini (multi-agent orchestration) |
| **Auth** | JWT (python-jose), bcrypt password hashing |
| **File Parsing** | pdfplumber (PDF), pandas (CSV) |
| **PDF Export** | fpdf2 |
| **Deployment** | Render (Python web service + static site) |

---

## Project Structure

```
TaxMindAI/
├── backend/
│   ├── agents/                 # AI agent modules
│   │   ├── orchestrator.py     # Coordinates all agents
│   │   ├── tax_analyzer.py     # Reads and interprets tax returns
│   │   ├── financial_analyzer.py  # Analyzes P&L statements
│   │   ├── red_flag_detector.py   # Identifies anomalies and risks
│   │   └── tax_planner.py      # Generates tax strategies
│   ├── routers/                # FastAPI route handlers
│   │   ├── auth.py             # Register, login, JWT
│   │   ├── clients.py          # Client CRUD
│   │   ├── documents.py        # File upload, view, delete
│   │   ├── analysis.py         # Trigger and fetch AI analysis
│   │   ├── dashboard.py        # Priority briefing
│   │   ├── chat.py             # AI chat per client
│   │   └── admin.py            # Firm management (admin only)
│   ├── models/                 # SQLAlchemy ORM models
│   ├── auth/                   # JWT utilities and dependencies
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Briefing + admin firms view
│   │   │   ├── ClientDetail.jsx  # Full client workspace
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── AddClientPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   └── ClientCard.jsx
│   │   ├── App.js
│   │   └── api.js              # All API calls centralized
│   └── package.json
│
├── render.yaml                 # Render deployment blueprint
├── RENDER_DEPLOYMENT.md        # Step-by-step deployment guide
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) free tier — recommended)
- OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/taxmind-ai.git
cd taxmind-ai
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
# Paste your environment variables (see section below)

# Start backend
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`
Swagger API docs at `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend
npm install

# Set backend URL
echo "REACT_APP_API_URL=http://localhost:8000" > .env

npm start
```

Frontend runs at `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Database
DATABASE_URL=postgresql+asyncpg://user:password@host/dbname?sslmode=require

# App
APP_ENV=development
APP_SECRET_KEY=your-long-random-secret-key
UPLOAD_DIR=./uploads

# CORS — comma-separated frontend origins
CORS_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:8000
```

---

## Deployment on Render

Full guide: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

### Backend (Web Service)

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Environment variables required on Render:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `APP_SECRET_KEY` | Any long random string |
| `APP_ENV` | `production` |
| `UPLOAD_DIR` | `/tmp/uploads` |
| `CORS_ORIGINS` | Your frontend URL |
| `PYTHON_VERSION` | `3.11.9` |

### Frontend (Static Site)

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `build` |

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | Your backend URL |

### First Admin User

After deploying, open Neon SQL Editor and run:

```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

Log out and log back in — the **⚙ Admin** link will appear in the header.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new firm |
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/auth/me` | Get current user |

### Clients

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/clients` | List firm's clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/{id}` | Get client |
| PATCH | `/api/clients/{id}` | Update client |
| DELETE | `/api/clients/{id}` | Delete client |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/clients/{id}/tax-return` | Upload PDF tax return |
| POST | `/api/clients/{id}/financials` | Upload CSV financials |
| GET | `/api/clients/{id}/documents` | List documents |
| GET | `/api/clients/{id}/tax-return/{docId}/view` | View file |
| DELETE | `/api/clients/{id}/tax-return/{docId}` | Delete file |

### Analysis

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/clients/{id}/analyze` | Trigger AI analysis |
| GET | `/api/clients/{id}/analysis` | Latest analysis |
| GET | `/api/clients/{id}/analyses` | Analysis history |
| DELETE | `/api/clients/{id}/analyses/{aId}` | Delete analysis |
| GET | `/api/clients/{id}/report/download` | Download PDF report |

### Chat & Dashboard

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/clients/{id}/chat` | AI chat about client |
| GET | `/api/dashboard/briefing` | Priority briefing |

### Admin (admin role required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/firms` | All firms |
| GET | `/api/admin/firms/{userId}/clients` | Firm's clients |
| PATCH | `/api/admin/firms/{userId}/admin` | Set admin role |
| DELETE | `/api/admin/firms/{userId}` | Delete firm |
| GET | `/api/admin/stats` | Platform stats |

---

## AI Architecture

TaxMind uses a multi-agent pipeline — each AI agent is specialized for one task:

```
  PDF (Tax Return) + CSV (P&L)
           │
           ▼
     Document Parsers
    (pdfplumber + pandas)
           │
           ▼
      Orchestrator
     ┌──────┴──────┐
     ▼             ▼
Tax Analyzer   Financial Analyzer
     └──────┬──────┘
            ▼
    ┌────────┴────────┐
    ▼                 ▼
Red Flag Detector   Tax Planner
    └────────┬────────┘
             ▼
      Final Analysis Report
```

Each agent receives parsed document data, runs a focused GPT prompt, and returns structured JSON. The orchestrator merges all outputs into the final report stored in the database.

---

## Known Limitations

- **Ephemeral file storage** — On Render free tier, files in `/tmp/uploads` are cleared on each redeploy. Integrate Cloudflare R2 or AWS S3 for persistent production storage.
- **Free tier cold starts** — Backend sleeps after 15 min of inactivity; first request takes 30–60 sec. Upgrade to Render Starter ($7/month) to avoid.
- **WebSocket progress tracking** — Works locally. May time out on Render free tier for long-running analyses.

---

## Roadmap

- [ ] Cloudflare R2 persistent document storage
- [ ] Client meeting notes
- [ ] AI-generated client email drafts
- [ ] Multi-year trend analysis (3-year)
- [ ] Filing deadline tracker
- [ ] LemonSqueezy subscription billing
- [ ] Mobile responsive UI

---

## License

MIT — free to use, fork, and deploy.

---

*Built with FastAPI · React · OpenAI · Neon DB · Render*
