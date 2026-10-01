# ZURC — installation on another PC

This guide runs React and Express on the host PC, and PostgreSQL 16 and Ollama in Docker Desktop. It does not containerize the frontend/backend. Internet is needed for cloning, npm packages, Docker images and the initial model download; document analysis then runs locally.

## 1. Install prerequisites

Install Git, Node.js 22 with npm, and Docker Desktop. The server minimum is Node 20.16.0. Start Docker Desktop before continuing. On Windows, use Linux containers and the WSL 2 backend; follow [Docker's Windows guide](https://docs.docker.com/desktop/setup/install/windows-install/). Install instructions also exist for [macOS](https://docs.docker.com/desktop/setup/install/mac-install/) and [Linux](https://docs.docker.com/desktop/setup/install/linux/). Docker Desktop includes Compose ([official documentation](https://docs.docker.com/compose/install/)). A separate PostgreSQL or host Ollama installation is unnecessary.

Check:

```sh
git --version
node --version
npm --version
docker version
docker compose version
```

## 2. Clone and install packages

The requested documentation is on `docs/setup-and-data-models` until merged/pushed. A different PC can only clone changes that exist on the remote. Use master after these files have been merged and pushed there, or use this documentation branch after it has been pushed.

```sh
git clone https://github.com/MahmoudKalekish/Zey-University-Research-Center.git
cd Zey-University-Research-Center
git switch master
npm ci
```

Do not copy node_modules from another PC. Use the committed package-lock.json. The known dependency audit findings are described in PUBLICATION_VERIFICATION.md; do not run `npm audit fix --force` as part of setup.

## 3. Environment files

Linux/macOS/WSL/Git Bash:

```sh
cp .env.example server/.env
```

Windows PowerShell:

```powershell
Copy-Item .env.example server/.env
```

Generate a new JWT secret, then paste the output into `JWT_SECRET` in `server/.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use these backend settings (replace the secret placeholder):

```dotenv
DATABASE_URL="postgresql://research:research@localhost:5432/research_center?schema=public"
JWT_SECRET="PASTE_GENERATED_SECRET_HERE"
JWT_EXPIRES_IN="8h"
PORT=4000
CLIENT_URL="http://localhost:5173"
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:0.5b"
OLLAMA_TIMEOUT_MS=60000
DOCUMENT_SUMMARY_BATCH_CHARS=8000
PUBLICATION_STORAGE_DIR="storage/publications"
MAX_PUBLICATION_PDF_MB=25
```

Create `client/.env` with:

```dotenv
VITE_API_URL="http://localhost:4000/api"
```

Vite reads its own environment file; a VITE_API_URL line in server/.env does not configure the browser. Never commit either .env file.

## 4. Start PostgreSQL

From the repository root:

```sh
docker compose up -d postgres
docker compose ps
docker compose exec postgres pg_isready -U research -d research_center
```

Wait until it accepts connections. The checked-in docker-compose.yml creates user `research`, password `research`, database `research_center`, port 5432, and a persistent `research_data` volume. These are local demonstration credentials. This command uses the Compose service name, so it works even when the generated container name differs between PCs.

## 5. Start local Ollama and download Qwen

Run this once on the new PC:

```sh
docker run -d --name zurc-ollama --restart unless-stopped -p 127.0.0.1:11434:11434 -v zurc_ollama:/root/.ollama ollama/ollama
docker exec zurc-ollama ollama pull qwen2.5:0.5b
docker exec zurc-ollama ollama list
```

This CPU configuration works without GPU setup; GPU acceleration is optional. The named volume preserves model files. The model download may take time; wait for success. If the container already exists, use `docker start zurc-ollama` instead of repeating `docker run`. If port 11434 is occupied by a host Ollama installation or another container, choose one local service rather than running both on that port. This follows [Ollama's official Docker instructions](https://docs.ollama.com/docker), with the project's container name and loopback port binding.

Check the API (Linux/macOS/WSL):

```sh
curl http://localhost:11434/api/tags
```

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

The response must contain `qwen2.5:0.5b`. Docker Desktop alone does not install this model. No paid/cloud AI key is needed.

## 6. Create database tables

```sh
npm run db:generate
cd server
npx prisma validate
npx prisma migrate deploy
npx prisma migrate status
cd ..
```

These commands load server/.env from the server directory. Use the committed migrations; do not use db push or generate another initial migration for installation.

## 7. Populate a fresh demonstration database

Only run the seed on a fresh/disposable demo database. It deletes existing records and stored PDFs, then recreates fictional teaching data and known accounts.

Linux/macOS/WSL/Git Bash:

```sh
ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed
```

Windows PowerShell:

```powershell
$env:ALLOW_DESTRUCTIVE_SEED = "1"
npm run db:seed
Remove-Item Env:ALLOW_DESTRUCTIVE_SEED
```

The seed creates 8 accounts, 12 researchers, 8 research areas, 10 projects, 34 publications, 8 events, 8 news records, 8 resources and 5 contact messages. Two publication PDFs have all 12 pages extracted/chunked; other fixtures demonstrate draft/review/OCR failure. It does not precompute Qwen summaries; those are requested through the UI.

## 8. Start the application

```sh
npm run dev
```

Keep this terminal open. Visit:

| Purpose               | URL                                                               |
| --------------------- | ----------------------------------------------------------------- |
| Website               | http://localhost:5173                                             |
| API health            | http://localhost:4000/api/health                                  |
| Administrator         | http://localhost:5173/admin                                       |
| Researcher workspace  | http://localhost:5173/researcher                                  |
| Teaching research PDF | http://localhost:5173/publications/campus-water-sensor-evaluation |

Accounts and walkthrough: [PROJECT_USER_GUIDE.md](PROJECT_USER_GUIDE.md). Schema/report models: [DATA_MODELS.md](DATA_MODELS.md).

## 9. Verify, stop and restart

In another terminal at the repository root:

```sh
npm test
npm run lint
npm run build
```

The database acceptance test is deliberately skipped by the normal suite; instructions for a separate test database are in [PUBLICATION_DOCUMENTS.md](PUBLICATION_DOCUMENTS.md). Do not enable acceptance against research_center.

On subsequent days, open Docker Desktop, then:

```sh
docker compose up -d postgres
docker start zurc-ollama
npm run dev
```

Stop the application with Ctrl+C. Stop containers without deleting their volumes:

```sh
docker compose stop postgres
docker stop zurc-ollama
```

Do not use `docker compose down -v` unless intentionally deleting the PostgreSQL data volume.

## Troubleshooting and moving existing data

| Symptom                       | Check/action                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker daemon unavailable     | Start Docker Desktop and check docker version.                                                                                                       |
| Prisma P1001                  | Check PostgreSQL health, port 5432 and DATABASE_URL.                                                                                                 |
| Password authentication fails | Existing Docker volumes retain their original database credentials; editing Compose variables does not change them.                                  |
| Frontend cannot reach API     | Check backend terminal, port 4000 and client/.env; restart Vite after changing its environment.                                                      |
| CORS failure                  | CLIENT_URL must match the website origin; use localhost consistently. If Vite selects 5174 because 5173 is occupied, free 5173 or update CLIENT_URL. |
| AI shows FALLBACK             | Check zurc-ollama, api/tags and installed Qwen model. The application continues to work offline.                                                     |
| PDF says OCR required         | Upload a text-based PDF or perform OCR externally first.                                                                                             |
| Missing PDFs after cloning    | Git does not carry uploaded PDFs or database records. Restore both together.                                                                         |

For an exact copy of existing data, transfer a PostgreSQL dump **and** the contents of server/storage/publications (or the configured storage directory). Restore the database and matching files on the new PC; do not seed over that restored database. Named Docker volumes and .env files are machine-local and do not follow a Git clone. See [PUBLICATION_DOCUMENTS.md](PUBLICATION_DOCUMENTS.md) for storage/recovery limits.
