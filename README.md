# Zey University Research Center (ZURC)

A Master's-level full-stack platform for publishing and managing a university research center's work. It combines a responsive public portal, secure REST API, researcher workspace, administrator dashboard, advanced search, and a PostgreSQL-grounded research assistant.

## Prerequisites

- Node.js 20.16+ and npm 10+
- PostgreSQL 16 or Docker Desktop
- Optional: Ollama for locally generated natural-language answers

## Quick start with Docker

The seed deletes existing records and their PDFs. Use it only with a disposable demo database.

```bash
cp .env.example server/.env
npm install
docker compose up -d postgres
npm run db:generate
cd server && npx prisma migrate deploy && cd ..
ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000/api`; health is available at `/api/health`.

## Environment

| Variable                       | Purpose                                  | Example                                                                       |
| ------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                 | PostgreSQL connection                    | `postgresql://research:research@localhost:5432/research_center?schema=public` |
| `JWT_SECRET`                   | JWT secret, minimum 32 characters        | Replace in production                                                         |
| `JWT_EXPIRES_IN`               | Session duration                         | `8h`                                                                          |
| `PORT`                         | API port                                 | `4000`                                                                        |
| `CLIENT_URL`                   | Allowed CORS origin                      | `http://localhost:5173`                                                       |
| `OLLAMA_URL`                   | Local Ollama server                      | `http://localhost:11434`                                                      |
| `OLLAMA_MODEL`                 | Local model                              | `qwen2.5:0.5b`                                                                |
| `OLLAMA_TIMEOUT_MS`            | Local generation timeout                 | `60000`                                                                       |
| `PUBLICATION_STORAGE_DIR`      | Private PDF directory relative to server | `storage/publications`                                                        |
| `MAX_PUBLICATION_PDF_MB`       | PDF size limit in MiB                    | `25`                                                                          |
| `DOCUMENT_SUMMARY_BATCH_CHARS` | Local evidence batch budget              | `8000`                                                                        |
| `VITE_API_URL`                 | Browser-facing API                       | `http://localhost:4000/api`                                                   |

Never commit `.env`. Use a long random JWT secret and HTTPS in production. To change the frontend API URL, create `client/.env` containing `VITE_API_URL`.

## Demo accounts

- Administrator: `admin@zurc-demo.edu` / `Admin123!`
- Researcher: `researcher@zurc-demo.edu` / `Research123!`
- Visitor: `visitor@zurc-demo.edu` / `Research123!`

These credentials are for demonstration only.

The seed creates 8 accounts, 12 researcher profiles, 8 research areas, 10
projects, 34 publications, 8 events, 8 news items, 8 resources, and 5 contact
messages. Running the explicitly enabled seed replaces all data in the development
database, including records added manually through the administration UI.

## Optional local AI

```bash
docker exec zurc-ollama ollama pull qwen2.5:0.5b
docker exec zurc-ollama ollama list
```

Without Ollama, the assistant still searches PostgreSQL, returns matching records, and identifies sources. No paid AI service is required.

## Full research documents

Researchers create drafts and upload PDFs; administrators review and publish them. Readers can summarize the complete stored paper and ask specific questions with page evidence. Short, Standard, and Detailed summaries use local Qwen; unavailable generation returns labeled document passages. Public users see only published records. The default PDF limit is exactly 25 MiB.

See [document workflow and verification](docs/PUBLICATION_DOCUMENTS.md) and [investigation and SOLID decisions](docs/PROJECT_INVESTIGATION.md).

## Verification

```bash
npm test
npm run lint
npm run build
```

Troubleshooting: Prisma `P1001` means PostgreSQL is unavailable; start Docker Desktop and run `docker compose up -d postgres`. If Ollama is offline, fallback mode is automatic and expected. The destructive seed requires an explicit flag outside dedicated test databases.

Detailed documentation: [Master's thesis report](docs/ZURC_THESIS_REPORT.md), [Project](docs/PROJECT_DOCUMENTATION.md), [Architecture](docs/ARCHITECTURE.md), [Database](docs/DATABASE.md), [API](docs/API.md), and [AI](docs/AI.md).

## Installation and university report guides

- [Install on another PC: Docker Desktop, PostgreSQL, Ollama and application setup](docs/NEW_PC_SETUP.md)
- [Project purpose, role permissions, demo accounts and complete workflow](docs/PROJECT_USER_GUIDE.md)
- [Conceptual (MCD) and logical (MLD) data models with the complete field dictionary](docs/DATA_MODELS.md)
