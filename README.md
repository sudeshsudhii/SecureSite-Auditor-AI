# PrivacyCheck - Intelligent Web Privacy Audit Platform

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Docker (for PostgreSQL & Redis)
- npm or pnpm

### Environment Setup

1. Copy `.env.example` to `.env` in `apps/api` and root if needed.
2. Set `DATABASE_URL` and `GEMINI_API_KEY`.

### Running with Docker (Recommended)

```bash
# Start Database Services
docker-compose up -d

# Install Dependencies
npm install

# Generate Prisma Client
npx prisma generate --schema=./prisma/schema.prisma

# Run API (Backend)
npm run api:dev

# Run Web (Frontend)
npm run web:dev
```

### Running without Docker (Manual DB)

If you don't have Docker, you need:
- A local PostgreSQL instance running.
- A local Redis instance running.
- Update `DATABASE_URL` in `.env`.

### Architecture

- **Apps:** `apps/api` (NestJS), `apps/web` (React + Vite)
- **Libs:** Shared libraries
- **Database:** Prisma + PostgreSQL

### Troubleshooting

- **Puppeteer:** If scanner fails, ensure `PUPPETEER_EXECUTABLE_PATH` is set or Chrome is installed.
- **Prisma:** If `prisma generate` fails, ensure schema path is correct.

