# PrivacyCheck - Deployment Guide
## 🌍 Where to Deploy?

| Platform | Best For | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Railway** | **Best Overall** | Easiest setup, nice UI, built-in PostgreSQL. | Costs ~$5/mo after trial. |
| **Fly.io** | **SQLite Users** | Good for keeping SQLite (via Volumes). | CLI-heavy setup. |
| **Render** | **Free Tier** | Generous free tier for static sites. | Slow spin-ups, memory limits for Puppeteer. |
| **VPS (DigitalOcean)** | **Control** | Full control, fixed pricing ($6/mo). | Manual setup (Docker). |

---

## 🚀 Option 1: Railway (Recommended)

Railway is the easiest way to deploy this full-stack app. Since Railway uses ephemeral filesystems, **we must switch from SQLite to PostgreSQL**.

### 1. Prepare Project
1.  Update `prisma/schema.prisma`:
    ```prisma
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    ```
2.  Delete `migrations` folder (since we are switching DBs).
3.  Commit these changes.

### 2. Deploy on Railway
1.  Go to [Railway.app](https://railway.app) and login.
2.  **New Project** -> **Deploy from GitHub repo** -> Select `PrivacyCheck`.
3.  **Add Database**: Right-click canvas -> New -> Database -> **PostgreSQL**.
4.  **Configure Variables**:
    - Click on the `PrivacyCheck` service card -> **Variables**.
    - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Reference the DB you just added).
    - `GEMINI_API_KEY`: Paste your key.
    - `JWT_SECRET`: Paste a random secret.
    - `PUPPETEER_EXECUTABLE_PATH`: `/usr/bin/google-chrome-stable` (Railway uses a specific buildpack).
5.  **Build Command**: `npm install && npx prisma generate && npm run build`
6.  **Start Command**: `npm run start:prod`

---

## ✈️ Option 2: Fly.io (Keep SQLite)

Fly.io allows "Volumes" which let you keep using SQLite in production.

### 1. Install Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### 2. Launch App
```bash
fly launch
```
- Select your region.
- **Do not** set up a Postgres/Redis database (we use SQLite).

### 3. Add Persistence (Volume)
Create a 1GB volume to store the SQLite database so it isn't lost on restart.
```bash
fly volumes create privacy_data --size 1
```

### 4. Update `fly.toml`
Mount the volume to where your DB file is expected.
```toml
[mounts]
  source = "privacy_data"
  destination = "/app/prisma"
```

### 5. Deploy
```bash
fly deploy
```

---

## 📦 Option 3: Docker (VPS / DigitalOcean)

If you have a VPS with Docker installed:

1.  **Copy Files**: Copy `docker-compose.yml`, `Dockerfile`, and `.env` to your server.
2.  **Run**:
    ```bash
    docker-compose up -d --build
    ```
3.  **Reverse Proxy**: Use Nginx or Caddy to expose ports 3000/5173 to the web (80/443).

### Troubleshooting Puppeteer in Docker
If the scanner crashes, ensure your Dockerfile installs Chrome dependencies:
```dockerfile
RUN apt-get update && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei
```

---

## ⚠️ regarding Vercel / Netlify

**Why not Vercel for the Backend?**
While Vercel is amazing for the frontend, it is **not recommended** for this specific Backend API because:
1.  **Puppeteer**: Chrome is too heavy (50MB+) for Vercel Serverless functions.
2.  **Timeouts**: Scans can take 30s+, causing Vercel to timeout.
3.  **SQLite**: Vercel functions are ephemeral; your database would generate a new empty file on every request.

### 🏆 Recommended Hybrid Strategy
1.  **Frontend (Web)** → **Vercel** (Excellent performance, free).
2.  **Backend (API)** → **Railway / Fly.io** (Docker support for Puppeteer & DB).

#### How to Deploy Frontend to Vercel
1.  Push code to GitHub.
2.  Import project in Vercel.
3.  **Root Directory**: `apps/web`.
4.  **Build Command**: `npm run build`.
5.  **Output Directory**: `dist`.
6.  **Environment Variable**: Set `VITE_API_URL` to your Railway/Fly backend URL.

---

## 💸 The "Ultimate Free" Stack (Render + Supabase)

If you want to host this for **$0/month**, use this combination:

1.  **Frontend**: Vercel (Free).
2.  **Database**: [Supabase](https://supabase.com) or [Neon.tech](https://neon.tech) (Free Tier PostgreSQL).
3.  **Backend**: Render (Free Tier).

### ⚠️ Critical Warnings for Free Tier
1.  **Memory**: Render's free tier has **512MB RAM**. Puppeteer (Chrome) is heavy. Scans might crash if the site is complex.
2.  **Spin Down**: Render puts the app to "sleep" after 15 mins of inactivity. The first request will take 50+ seconds to load.
3.  **No SQLite**: You **MUST** use an external Postgres database (like Supabase) because Render deletes your files every time it restarts.

### Deployment Steps

#### 1. Setup Database (Supabase/Neon)
1.  Create a free project on Supabase/Neon.
2.  Get the `Connection String` (starts with `postgres://...`).
3.  Update your local `.env` with this `DATABASE_URL` temporarily and run `npx prisma migrate deploy` to set up the tables.

#### 2. Deploy Backend to Render
1.  Create a **New Web Service** on [Render](https://render.com).
2.  Connect your GitHub repo.
3.  **Runtime**: Node.
4.  **Build Command**: `npm install && npx prisma generate && npm run build`.
5.  **Start Command**: `npm run start:prod`.
6.  **Environment Variables**:
    - `DATABASE_URL`: Your Supabase/Neon connection string (NOT the local file path).
    - `GEMINI_API_KEY`: Your AI key.
    - `PUPPETEER_EXECUTABLE_PATH`: `/usr/bin/google-chrome-stable` (Render automatically handles this if you add the Buildpack).
    - `PUPPETEER_ARGS`: `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`
7.  **Auto-Deploy**: Render might default to `npm run start`. Ensure you change it to `npm run start:prod`.

#### 3. Deploy Frontend (Vercel)
(See instructions above)
