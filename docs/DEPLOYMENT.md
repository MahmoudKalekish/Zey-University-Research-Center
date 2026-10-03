# ZURC deployment: Netlify frontend and one Ubuntu server

Prepared 3 October 2026. This is a deployment guide and configuration, not a record of a completed remote deployment. You need a Netlify account, access to a server, and an API hostname. No provider account, server, payment or DNS record has been created by this change.

## Architecture

| Component                               | Runs on                         | Access / persistence                             |
| --------------------------------------- | ------------------------------- | ------------------------------------------------ |
| React/Vite frontend                     | Netlify                         | Public HTTPS static site                         |
| Express backend and one document worker | Ubuntu server, api container    | Through Caddy HTTPS proxy                        |
| PostgreSQL 16                           | Same server, postgres container | Private Docker network; postgres_data volume     |
| Uploaded PDFs                           | Same server                     | Private publication_pdfs volume mounted into API |
| Local Qwen through Ollama               | Same server, ollama container   | Private HTTP service; ollama_models volume       |
| HTTPS reverse proxy                     | Same server, caddy container    | Public ports 80/443; certificate volumes         |

```mermaid
flowchart LR
    U[Browser on your laptop] --> N[Netlify: React]
    U -->|HTTPS API calls| C[Caddy: api.your-domain.com]
    C --> A[Express + single worker]
    A --> P[(Private PostgreSQL)]
    A --> F[(Private PDF volume)]
    A -->|Private Docker network| O[Your Ollama + Qwen]
```

The browser calls the API directly. Netlify does not execute the backend or AI. Do not put database credentials, JWT secrets or an Ollama URL in VITE variables: VITE values become browser-visible build output.

Here “local Ollama” means inference local to the backend server. With a rented VPS, documents are stored/processed on that VPS; its infrastructure provider hosts those bytes. No managed cloud AI provider receives prompts. If the requirement is that documents must stay on university-owned equipment, use a university server or another university PC instead of a rented VPS.

For a small demonstration, an Ubuntu 24.04 server with roughly 4 vCPU, 8 GB RAM and sufficient persistent disk is a starting estimate, not a benchmark or performance guarantee. CPU Qwen needs no GPU, but full-document summaries can be slow. Choose capacity/cost with your server provider; this guide does not promise a free AI hosting tier. Docker Compose caps Ollama at two CPUs/3 GB RAM and one concurrent generation; adjust after measuring `docker stats`. Use Docker Engine on the server, not Docker Desktop.

## 1. Put these files on GitHub

The deployment files are initially on `deployment/netlify-and-server`. Commit/push that branch from your development PC before Netlify or the server can fetch it:

```sh
git push -u origin deployment/netlify-and-server
```

For initial testing, choose that branch in Netlify and clone it on the server. After review/merge, use master instead. Do not upload .env, database dumps or real research PDFs to GitHub. If GitHub is private, authorize Netlify and use your normal SSH/Git credentials on the server.

## 2. Create the Netlify frontend

In Netlify, add a project from the existing GitHub repository. Select the deployment branch for this initial test.

| Setting                    | Value                                        |
| -------------------------- | -------------------------------------------- |
| Base directory             | Leave empty: repository root                 |
| Package directory          | Leave empty; root netlify.toml is supplied   |
| Build command              | npm run build -w client                      |
| Publish directory          | client/dist                                  |
| Node version               | 22 (set in netlify.toml)                     |
| Build environment variable | VITE_API_URL=https://api.YOUR-DOMAIN.com/api |

Replace YOUR-DOMAIN with your actual API hostname. The root lockfile/workspaces must be available; do not set the base directory to client. Build only the client rather than root `npm run build`, which also builds the backend. netlify.toml includes the React Router fallback so refreshing /login, /admin and /publications/... does not return 404. These settings follow [Netlify monorepo documentation](https://docs.netlify.com/build/configure-builds/monorepos/) and [Vite deployment documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).

Deploy once to obtain your actual site origin, for example https://zurc-demo.netlify.app. Keep this address: the server CLIENT_URL must match it exactly, with no trailing slash. Until the server is installed, the HTML can load while API requests fail. Changing VITE_API_URL requires another Netlify build/deploy. Do not use localhost: it would refer to each visitor's PC.

## 3. Prepare the server and DNS

Obtain access to a university server or an Ubuntu VPS and a domain/subdomain you control. Create an A record such as `api.your-domain.com` pointing to its public IPv4 address. Add an AAAA record only if IPv6 actually reaches this server. Netlify's free site hostname serves the frontend; it does not automatically supply a hostname for your separate backend.

Allow inbound SSH (22, ideally restricted to your IP), HTTP (80) and HTTPS (443) in the server-provider firewall. Do not allow public 4000, 5432 or 11434. Caddy's automatic certificate setup requires the API hostname to resolve to this server and ports 80/443 to be reachable; see [automatic HTTPS prerequisites](https://caddyserver.com/docs/automatic-https).

Connect from your PC (replace values):

```sh
ssh YOUR_SERVER_USER@YOUR_SERVER_IP
```

The remaining server commands run in this SSH session, not on your laptop. For a fresh Ubuntu 24.04 server, install Docker Engine/Compose using the [official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). A server with Docker preinstalled can skip this part. The official repository installation includes these commands:

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker version
sudo docker compose version
```

For an existing server, check the official guide's conflicting-package section first. These commands are intended for a fresh machine; do not uninstall a university server's existing container runtime without its administrator.

## 4. Clone and configure the backend/database/AI

```sh
git clone --branch deployment/netlify-and-server https://github.com/MahmoudKalekish/Zey-University-Research-Center.git
cd Zey-University-Research-Center
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
openssl rand -hex 32
openssl rand -hex 32
nano deploy/.env
```

Paste the two different generated hex strings into POSTGRES_PASSWORD and JWT_SECRET. Hex avoids password URL-encoding problems. Also replace:

```dotenv
CLIENT_URL=https://YOUR-ACTUAL-SITE.netlify.app
API_DOMAIN=api.YOUR-ACTUAL-DOMAIN.com
```

API_DOMAIN is a hostname only; CLIENT_URL is the full HTTPS origin, without a trailing slash. Do not leave example passwords/placeholders. The Compose file constructs these private backend values automatically:

```dotenv
DATABASE_URL=postgresql://research:YOUR_PASSWORD@postgres:5432/research_center?schema=public
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:0.5b
PUBLICATION_STORAGE_DIR=/app/server/storage/publications
```

`postgres` and `ollama` are private Docker service names, not public DNS records. Do not use localhost inside the API container for either service. The existing docker-compose.yml remains the local development configuration; remote deployment uses docker-compose.server.yml.

## 5. Start database/AI, pull Qwen and apply migrations

```sh
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml config --quiet
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml up -d postgres ollama
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml exec postgres pg_isready -U research -d research_center
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml exec ollama ollama pull qwen2.5:0.5b
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml exec ollama ollama list
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml build api
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml run --rm --no-deps api npx prisma migrate deploy
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml run --rm --no-deps api npx prisma migrate status
```

Wait for PostgreSQL readiness and model download success. Qwen is not included in the image; it must be downloaded into the persistent model volume. Ollama's image supports CPU inference ([official Docker guide](https://docs.ollama.com/docker)). No OpenAI/Gemini/Claude key is configured.

The backend image uses Node 22, builds TypeScript, generates Prisma Client and starts compiled JavaScript. It deliberately retains migration/seed development tools for explicit one-off commands in this university demonstration; it is not a minimal production image. It runs as a non-root Node user and has a writable named PDF volume. No .env or existing local uploads are copied into the image.

## 6. Choose fresh demo data OR preserve your current records

**Option A: fresh disposable demo database.** Only here, explicitly enable the destructive seed:

```sh
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml run --rm --no-deps -e ALLOW_DESTRUCTIVE_SEED=1 api npm run db:seed
```

It deletes all existing records/PDFs and creates the documented fictional accounts and teaching PDFs. Do not repeat it after adding data you want to keep. The standard demo passwords are in [PROJECT_USER_GUIDE.md](PROJECT_USER_GUIDE.md); change them through user administration before sharing an openly accessible deployment. Seed credentials are deliberately public.

**Option B: move your current database.** Transfer a PostgreSQL dump and matching PDF storage together instead. Do not seed over restored records. Obtain a consistent backup with writes stopped; restore it into a fresh database/volume before applying any still-pending migrations. StorageKey values must match restored PDF filenames. Docker volumes do not travel with a Git clone. Follow this route with a reviewed backup/restore plan rather than mixing it with Option A.

## 7. Start the public API and finish Netlify wiring

```sh
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml up -d api caddy
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml ps
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml logs --tail=80 api caddy
curl https://api.YOUR-ACTUAL-DOMAIN.com/api/health
curl https://api.YOUR-ACTUAL-DOMAIN.com/api/publications
```

Health must return `{ "status": "ok" }`. The publications request additionally checks the database-backed API; health alone does not check migrations. Caddy forwards the full path including /api to Express ([reverse proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)).

In Netlify, confirm VITE_API_URL points to this HTTPS URL ending in /api, then trigger a new frontend deploy. Do not put API calls through the React catch-all or use an HTTP-only API from an HTTPS page. Configure a stable production site origin; other Netlify deploy-preview origins are intentionally not permitted by the current single-origin CORS configuration.

## 8. Test from the laptop; measure on the server

1. Close your laptop's local app/Docker containers when you no longer need them. Open the Netlify address; your laptop now runs just the browser.
2. Log in as researcher; create a draft and upload a text PDF. Confirm READY, page count, preview analysis and evidence.
3. Submit, log in as admin, review/publish, then log out and confirm public PDF/summary/questions work. Private drafts must stay hidden.
4. Test a question about later Results/Limitations pages and an unsupported question. Distinguish OLLAMA from FALLBACK mode; fallback alone does not prove real Qwen is working.
5. Test Short/Standard/Detailed independently and refresh a deep route such as /publications/campus-water-sensor-evaluation.
6. On the server, inspect consumption:

```sh
sudo docker stats
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml exec ollama ollama ps
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml logs --tail=80 api
```

For an intentional offline test, stop ollama, request analysis, then restart it. PostgreSQL/API remain running; labeled fallback should work. Restarting stopped services preserves named volumes. Do not scale API above one replica: the current processing-job recovery model assumes a single worker process.

## Updates, backups and troubleshooting

For an update, keep deploy/.env and volumes, pull the reviewed branch, stop api/caddy during migration, build API, deploy migrations, then start api/caddy. This small-server setup has a maintenance window; it is not a zero-downtime deployment. Netlify rebuilds the frontend after updates to its selected branch.

```sh
git pull --ff-only
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml stop api caddy
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml build api
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml run --rm --no-deps api npx prisma migrate deploy
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml up -d api caddy
```

Keep database backups and matching PDFs off the server; named volumes survive container replacement but not server loss or volume deletion. For a database dump, first make a private backup directory and stop application writes:

```sh
mkdir -p backups
chmod 700 backups
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml stop api
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml exec -T postgres pg_dump -U research -d research_center -Fc > backups/research_center.dump
```

Also archive the publication_pdfs volume from the same stopped-write window, then restart api. The Compose volume name is `zurc-server_publication_pdfs`. The following uses the already-built API image as a temporary backup utility to archive the stopped application’s PDF volume:

```sh
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml run --rm --no-deps --user root -v "$PWD/backups:/backup" api tar -czf /backup/publication-pdfs.tar.gz -C /app/server/storage/publications .
sudo docker compose --env-file deploy/.env -f docker-compose.server.yml up -d api
```

Do not overwrite earlier backups: use dated directories/names for subsequent runs. Keep deploy/.env securely backed up; do not commit dumps or secrets. Model files can be downloaded again. A backup is only reliable once its restore procedure has been tested.

| Problem                            | Check                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Frontend loads but API unavailable | Browser Network tab, VITE_API_URL, DNS/TLS, Caddy and API logs                                     |
| CORS error                         | CLIENT_URL equals the exact Netlify origin; recreate API with up -d after editing env              |
| Refresh returns 404                | Root netlify.toml SPA rewrite included in the deployed branch                                      |
| Prisma P2021 / missing tables      | Explicit migrate deploy against this server database before starting worker                        |
| Summary FALLBACK unexpectedly      | Qwen download, ollama list/ps, memory/timeout and API logs                                         |
| Model/container killed             | docker stats and memory limits; resize server or adjust limits after measurement                   |
| Login credentials wrong            | This database may be unseeded or restored; use its actual accounts                                 |
| PDFs disappear after update        | Ensure publication_pdfs volume is mounted; never store uploads only in image filesystem            |
| Database password change fails     | Existing PostgreSQL volumes preserve original credentials; changing env alone does not rotate them |

The known six dependency audit findings remain as previously accepted. This configuration prepares a university demo; it does not establish a general production-security or research-accuracy certification.

## Local verification of this configuration

Netlify TOML parsing/settings, Docker Compose configuration, both application production builds and git diff whitespace checks passed. Existing development Compose/environment files were not changed, and no database was seeded or migrated by preparing this guide. No Docker image build, remote server startup, certificate issuance, Netlify account deployment or backup restore has yet been performed for this configuration. Complete those server-side checks before calling the hosted system verified.
