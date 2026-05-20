# TaxMind AI — Render Deployment Guide

Follow these steps in order. The backend must be deployed **before** the frontend.

---

## Step 1 — Push Your Code to GitHub

1. Go to [github.com](https://github.com) and create a **new repository** (e.g. `taxmind-ai`). Keep it **private**.
2. In your terminal, navigate to the `TaxMindAI` folder:

```bash
cd "path/to/TaxMindAI"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taxmind-ai.git
git push -u origin main
```

> If you already have git set up, just do `git add . && git commit -m "update" && git push`.

---

## Step 2 — Create a Neon Database (PostgreSQL)

If you don't already have a Neon DB:

1. Go to [neon.tech](https://neon.tech) → Sign up (free).
2. Create a new project (e.g. `taxmind`).
3. Copy the **Connection String** — it looks like:
   ```
   postgresql://username:password@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this — you'll need it in Step 3.

---

## Step 3 — Deploy the Backend on Render

1. Go to [render.com](https://render.com) → Sign up / Log in.
2. Click **New → Web Service**.
3. Connect your GitHub account and select your `taxmind-ai` repository.
4. Fill in the settings:

| Field | Value |
|-------|-------|
| **Name** | `taxmind-backend` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free (or Starter) |

5. Scroll down to **Environment Variables** and add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | *(paste your Neon connection string)* |
| `OPENAI_API_KEY` | *(your OpenAI API key from platform.openai.com)* |
| `APP_SECRET_KEY` | *(click "Generate" or paste any long random string)* |
| `APP_ENV` | `production` |
| `UPLOAD_DIR` | `/tmp/uploads` |
| `CORS_ORIGINS` | *(leave blank for now — you'll fill this after frontend deploys)* |

6. Click **Create Web Service**. Render will build and deploy — this takes 2–4 minutes.
7. Once deployed, copy your backend URL. It will look like:
   ```
   https://taxmind-backend.onrender.com
   ```

---

## Step 4 — Deploy the Frontend on Render

1. In Render, click **New → Static Site**.
2. Select the same `taxmind-ai` repository.
3. Fill in the settings:

| Field | Value |
|-------|-------|
| **Name** | `taxmind-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `build` |

4. Scroll down to **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://taxmind-backend.onrender.com` *(your backend URL from Step 3)* |

5. Click **Create Static Site**. Build takes 2–3 minutes.
6. Once deployed, copy your frontend URL. It will look like:
   ```
   https://taxmind-frontend.onrender.com
   ```

---

## Step 5 — Connect Frontend ↔ Backend (CORS)

Now go back to your **backend service** on Render:

1. Click on `taxmind-backend` → **Environment**.
2. Find `CORS_ORIGINS` and set its value to your frontend URL:
   ```
   https://taxmind-frontend.onrender.com
   ```
3. Click **Save Changes**. Render will automatically redeploy the backend.

> If you have multiple frontend URLs (e.g. a custom domain too), separate them with commas:
> `https://taxmind-frontend.onrender.com,https://yourdomain.com`

---

## Step 6 — Make the First Admin User

The admin panel requires at least one admin account, but you can only grant admin from inside the admin panel itself (chicken-and-egg). Fix this with a one-time SQL command:

1. Go to your **Neon dashboard** → Select your database → Open the **SQL Editor**.
2. Run this query (replace with your actual email):

```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

3. Log in to TaxMind AI at your frontend URL.
4. You'll now see an **Admin** link in the top navigation bar.
5. From the Admin panel, you can grant admin rights to other users without needing SQL again.

---

## Step 7 — Verify Everything Works

Open your frontend URL and test:

- [ ] Register a new account → should succeed
- [ ] Log in → should reach dashboard
- [ ] Add a client → should appear in list
- [ ] Upload a document → should appear in client detail
- [ ] Run analysis → should return AI results
- [ ] Admin panel accessible (if is_admin = true)

---

## Troubleshooting

**Backend shows "Application failed to respond"**
- Check Render logs: click your backend service → **Logs** tab
- Common cause: `DATABASE_URL` is wrong or missing — double-check it has `?sslmode=require` at the end

**Frontend shows blank page or network errors**
- Open browser DevTools → Console tab — look for CORS or 404 errors
- Make sure `REACT_APP_API_URL` has no trailing slash: ✅ `https://taxmind-backend.onrender.com` ✗ `https://taxmind-backend.onrender.com/`
- Make sure `CORS_ORIGINS` on the backend exactly matches your frontend URL

**"Registration failed" or "Cannot connect to server"**
- The backend may be sleeping (free tier spins down after inactivity). Wait 30 seconds and try again.
- Upgrade to Render Starter plan ($7/month) to keep it always-on.

**Documents not loading / View button broken**
- Uploaded files are stored in `/tmp/uploads` which is **ephemeral** on Render free tier (files are lost on redeploy).
- For production use, integrate a storage service like **Cloudflare R2** or **AWS S3**. This is a future enhancement.

---

## Custom Domain (Optional)

After deployment is working:
1. Go to your frontend Static Site → **Settings → Custom Domains**
2. Add your domain and follow DNS instructions
3. Update `CORS_ORIGINS` on the backend to include your new domain

---

*Deployment complete! Your TaxMind AI platform is now live on the internet.*
