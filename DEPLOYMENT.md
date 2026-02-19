# PrivacyCheck - Deployment Guide

This guide covers deploying PrivacyCheck to cloud providers using Docker.

## 🐳 Docker Deployment (Universal)

The project is containerized. You can deploy it to any provider that supports Docker (AWS ECS, Google Cloud Run, Azure Container Apps, DigitalOcean App Platform, Render, Railway).

### 1. Build Images

```bash
docker build -t privacycheck-api -f apps/api/Dockerfile .
docker build -t privacycheck-web -f apps/web/Dockerfile .
```

*Note: You may need to adjust Dockerfiles to work with the monorepo structure, usually by copying the root `package.json` and `npm workspaces` config.*

## 🚀 Easy Deployment: Railway / Render

### Railway.app

1. **Connect GitHub Report**: Link your repository to Railway.
2. **Setup Monorepo**: Railway supports monorepos. You can create two services from the same repo.
   - **Service 1 (API)**: Root directory `apps/api`. Build command `npm install && npm run build`. Start command `npm run start:prod`.
   - **Service 2 (Web)**: Root directory `apps/web`. Build command `npm install && npm run build`. Serves static files or start command `npm run preview`.
3. **Add Database**: Add a PostgreSQL and Redis plugin in Railway.
4. **Environment Variables**:
   - `DATABASE_URL`: Auto-injected by Railway Postgres.
   - `REDIS_URL`: Auto-injected.
   - `GEMINI_API_KEY`: Add your key.
   - `JWT_SECRET`: Generate a secure key.

### Render.com

1. Create a **Web Service** for API.
   - Root: `apps/api`
   - Env: Node
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
2. Create a **Static Site** for Web.
   - Root: `apps/web`
   - Build: `npm install && npm run build`
   - Publish: `dist`
3. Add **PostgreSQL** and **Redis** from Render dashboard.

## ☁️ AWS (EC2 / ECS)

### EC2 (Simple)

1. Provision an EC2 instance (Ubuntu).
2. Install Docker and Docker Compose.
3. Clone the repository.
4. Set up `.env` file.
5. Run `docker-compose up -d --build`.
6. Setup Nginx as a reverse proxy for ports 3000 (API) and 5173 (Web).
7. Use Certbot for SSL.

## 🛡️ Production Checklist

- [ ] **Secure Variables**: Never commit `.env`.
- [ ] **HTTPS**: Enforce SSL/TLS.
- [ ] **Database Backups**: Enable automated backups.
- [ ] **Rate Limiting**: Tune NestJS Throttler and Nginx.
- [ ] **Monitoring**: Set up logs (e.g., Datadog, CloudWatch).
