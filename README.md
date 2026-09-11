# Zey University Research Center (ZURC)

A Master's-level full-stack platform for publishing and managing a university research center's work. It combines a responsive public portal, secure REST API, researcher workspace, administrator dashboard, advanced search, and a PostgreSQL-grounded research assistant.

## Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 15+ or Docker Desktop
- Optional: Ollama for locally generated natural-language answers

## Quick start with Docker

```bash
cp .env.example server/.env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000/api`; health is available at `/api/health`.

## Environment

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://research:research@localhost:5432/research_center?schema=public` |
| `JWT_SECRET` | JWT secret, minimum 32 characters | Replace in production |
| `JWT_EXPIRES_IN` | Session duration | `8h` |
| `PORT` | API port | `4000` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |
| `OLLAMA_URL` | Local Ollama server | `http://localhost:11434` |
| `OLLAMA_MODEL` | Local model | `llama3.2:3b` |
| `VITE_API_URL` | Browser-facing API | `http://localhost:4000/api` |

Never commit `.env`. Use a long random JWT secret and HTTPS in production. To change the frontend API URL, create `client/.env` containing `VITE_API_URL`.

## Demo accounts

- Administrator: `admin@zurc-demo.edu` / `Admin123!`
- Researcher: `researcher@zurc-demo.edu` / `Research123!`

These credentials are for demonstration only.

## Optional local AI

```bash
ollama pull llama3.2:3b
ollama serve
```

Without Ollama, the assistant still searches PostgreSQL, returns matching records, and identifies sources. No paid AI service is required.

## Verification

```bash
npm test
npm run lint
npm run build
```

Troubleshooting: Prisma `P1001` means PostgreSQL is unavailable; start Docker Desktop and run `docker compose up -d postgres`. If Ollama is offline, fallback mode is automatic and expected. Running `npm run db:seed` recreates all demo content.

Detailed documentation: [Project](docs/PROJECT_DOCUMENTATION.md), [Architecture](docs/ARCHITECTURE.md), [Database](docs/DATABASE.md), [API](docs/API.md), and [AI](docs/AI.md).
