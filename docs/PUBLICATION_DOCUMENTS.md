# Publication document workflow

## Local setup and data

Use Node >=20.16.0, PostgreSQL 16, and local Ollama. Install the configured model:

```bash
docker exec zurc-ollama ollama pull qwen2.5:0.5b
docker exec zurc-ollama ollama list
curl http://localhost:11434/api/tags
```

Configure `server/.env`:

```dotenv
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:0.5b"
OLLAMA_TIMEOUT_MS=60000
DOCUMENT_SUMMARY_BATCH_CHARS=8000
PUBLICATION_STORAGE_DIR="storage/publications"
MAX_PUBLICATION_PDF_MB=25
```

Storage paths are relative to the server working directory. PDF files use UUID storage keys and are not exposed through a static directory. Back up the database **and** PDF storage together. Restore file permissions before retrying jobs. Storage failures produce safe errors; deleting/replacing publications cleans old files after the database transaction succeeds. Cleanup failures are logged and may require maintenance.

Apply the existing migrations rather than creating an initial migration again:

```bash
npm run db:generate
cd server
npx prisma validate
npx prisma migrate deploy
npx prisma migrate status
cd ..
```

The lifecycle migration preserves existing publications as PUBLISHED. New publications default to DRAFT. The seed replaces all records and removes their stored PDFs. It refuses non-test databases unless `ALLOW_DESTRUCTIVE_SEED=1` is explicitly set. Use that flag only for a disposable demonstration database:

```bash
ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed
```

The seed creates 34 publications: 30 published metadata-only records, one published original teaching PDF, one READY_FOR_REVIEW PDF, one draft without a PDF, and one failed/OCR-required draft. The first-party teaching paper has 12 text-bearing pages and synthetic data clearly labeled as fictional. It contains results on pages 6–8 and conclusions/limitations on pages 11–12. No copyrighted third-party research is included.

## Roles and lifecycle

Researchers create drafts with themselves assigned as an author. They may edit/upload only to authored drafts, and receive 403 when managing a non-authored record. Submission requires a READY PDF and locks author changes. Administrators can submit their own drafts for review, publish reviewed documents, return a publication with a note, archive it, and retry failed processing. Only administrators publish.

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> READY_FOR_REVIEW: processed PDF + submit
  READY_FOR_REVIEW --> PUBLISHED: administrator publishes
  READY_FOR_REVIEW --> DRAFT: return with review note
  PUBLISHED --> ARCHIVED: administrator archives
  ARCHIVED --> DRAFT: return with review note
  PUBLISHED --> READY_FOR_REVIEW: administrator replaces PDF
```

Only PUBLISHED records are included in public catalogues, direct detail, search, statistics, researcher/project relationships, PDF download, summaries, and questions. Authorized authors/administrators can preview their private documents; unauthorized readers receive 404. Account activity and current roles are loaded from PostgreSQL rather than trusted solely from an old JWT.

## Processing and local AI

Upload accepts one multipart field named `document`, `.pdf`, `application/pdf`, a `%PDF-` signature, nonempty content, and at most **26,214,400 bytes (25 MiB)** by default. Other files return 415, oversized requests 413, invalid fields 422, unavailable storage 503. Files are hashed with SHA-256 and atomically written before replacing the database record. Replacement gets a new document ID and invalidates chunks/summaries.

The background worker claims PENDING work atomically, extracts every PDF page sequentially, normalizes text, and stores page/heading-aware chunks up to 3,500 characters with bounded overlap. Scanned/textless documents become FAILED with `OCR_REQUIRED`; encrypted/corrupt documents receive a safe failure message. On server restart, PROCESSING document/summary jobs return to PENDING. Run one worker process for this recovery model; multi-process leases are not implemented.

Summaries are independently cached by `(documentId, detailLevel)`. Every chunk participates in bounded local evidence batches; oversized accumulated evidence is reduced hierarchically before synthesis. Mapped quotations are checked against source sentences and their page provenance is derived from matching chunks. The overview balances sections rather than using only opening pages. Structured STANDARD/DETAILED output includes In Short, Research Objective, Methodology, Key Findings, Conclusions, Limitations, Why It Matters, and Keywords. SHORT includes In Short, Key Findings, and Keywords. Unstated sections say `Not stated in the document`. DETAILED can include more verified quotations; tiny models may yield similar prose across modes.

Questions rank lexical chunk matches and include nearby page context from the same document. Qwen receives bounded source text and must cite supplied chunk IDs/pages. Invalid generation/citations or an unavailable local service yield explicitly labeled deterministic evidence. No lexical evidence yields a clear cannot-determine response. Conversation questions, answers, and evidence are persisted locally. A question is answered independently; conversation history is displayed but is not used to resolve pronouns or follow-up references.

No uploaded document or question is sent to OpenAI, Claude, Gemini, or other cloud AI providers. The document generation adapter restricts Ollama to local/network-local HTTP endpoints and rejects redirects. This is a deployment boundary, not an operating-system network sandbox. Administrators must configure a genuinely local service. Scanned-page OCR, semantic embeddings, and multilingual evaluation are outside this implementation.

## API contracts

All paths are under `/api`. JWT is required for management; public analysis requires publication visibility.

| Method | Path                                               | Behavior                                                                                  |
| ------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| POST   | `/researcher/publications`                         | Create DRAFT; server assigns current researcher as author                                 |
| GET    | `/researcher/publications/:id`                     | Read authorized authored publication for its editor                                       |
| PUT    | `/researcher/publications/:id`                     | Edit allowed fields of an authored DRAFT                                                  |
| POST   | `/publications/:id/document`                       | Multipart upload/replace; returns document status with 202                                |
| GET    | `/publications/:id/document/status`                | Manager status; no filesystem path or storage key                                         |
| POST   | `/admin/publications/:id/document/retry`           | Queue failed document extraction; 202                                                     |
| POST   | `/researcher/publications/:id/submit`              | Submit authored READY document for review                                                 |
| POST   | `/admin/publications/:id/submit`                   | Submit administrator draft for review                                                     |
| POST   | `/admin/publications/:id/publish`                  | Publish READY_FOR_REVIEW with READY PDF                                                   |
| POST   | `/admin/publications/:id/return`                   | Return to DRAFT with `{reviewNote}` (5–2000 characters)                                   |
| POST   | `/admin/publications/:id/archive`                  | Archive PUBLISHED record                                                                  |
| GET    | `/publications/:slug/document`                     | Stream authorized READY PDF, safe headers                                                 |
| POST   | `/publications/:slug/summary`                      | `{detailLevel}`: SHORT, STANDARD, or DETAILED; default STANDARD; cached 200 or queued 202 |
| GET    | `/publications/:slug/summary?detailLevel=STANDARD` | Status/content, 404 when not requested                                                    |
| POST   | `/publications/:slug/ask`                          | `{question,sessionId}`; document answer, mode, evidence                                   |

A publication detail includes `documentCapabilities: {canRead,canSummarize,canAsk}` and safe document metadata. Metadata-only records have all capabilities false. Processing statuses are `PENDING`, `PROCESSING`, `READY`, `FAILED`; publication workflow and summary processing are separate states.

```bash
curl -H "Authorization: Bearer $TOKEN" -F document=@paper.pdf \
  http://localhost:4000/api/publications/PUBLICATION_ID/document
curl -H "Content-Type: application/json" -d '{"detailLevel":"STANDARD"}' \
  http://localhost:4000/api/publications/campus-water-sensor-evaluation/summary
curl -H "Content-Type: application/json" \
  -d '{"question":"How many confirmed leaks were detected?","sessionId":"550e8400-e29b-41d4-a716-446655440000"}' \
  http://localhost:4000/api/publications/campus-water-sensor-evaluation/ask
```

Successful upload returns safe document metadata and PENDING, not extracted text. Poll every two seconds while PENDING/PROCESSING. A READY summary returns `mode: OLLAMA|FALLBACK` and structured JSON `content`; FALLBACK content includes an explicit notice, publication metadata, and page-cited passages. A question returns `{answer,mode,publication,evidence:[{chunkId,pageStart,pageEnd,snippet}]}`. Lifecycle/preparation conflicts use 409; authorization uses 401/403 or private-resource 404.

## Demonstration

1. Sign in as the seeded researcher; create a draft, fill metadata, upload a text PDF, wait for READY, preview analysis, and submit.
2. Sign in as administrator; open Publications → Edit, inspect metadata/relationships and Document and review. Read the PDF, generate a preview, publish or return with a note. Uploading a replacement of a published paper removes public access until review.
3. Open `publications/campus-water-sensor-evaluation`; use Read PDF, Short/Standard/Detailed summaries, and Ask this publication.
4. Ask `How many confirmed leaks were detected?` and `What are the study limitations?`. Check Results evidence on pages 6–8 and explicit limitations on page 12. Ask an unrelated question to see missing-information handling.
5. From the center assistant, search for a publication then choose its Read and ask link. Publication-context mode uses document APIs, while center-wide mode searches metadata.
6. With local Ollama unavailable, repeat. The PDF/catalogue remain accessible; analysis labels deterministic fallback and displays actual passages.

## Reproducible verification

Use a dedicated database with a name beginning `zurc_publication_test_`; never point acceptance tests at user data. Migrate and optionally seed that database first. Environment overrides below apply only to the command.

```bash
npm test
npm run lint
npm run build
cd server
npx prisma validate
ZURC_DOCUMENT_ACCEPTANCE=1 DATABASE_URL='postgresql://research:research@localhost:5432/zurc_publication_test_20261001?schema=public' \
  npm test -- publication-documents.integration.test.ts
npx tsx test/live-document-ai.ts --all-levels --dense
```

The acceptance test uses real PostgreSQL, JWT, multipart uploads, filesystem storage, PDF extraction, transitions, visibility, replacement/deletion, and offline evidence. It creates/cleans its own records and temporary storage. The live script uses an original synthetic 12-page PDF and real local Qwen without database writes; it also tests an unreachable local service and no-answer behavior. Responsive verification targets 320, 390, 768, 1024, and 1440 px. See [recorded verification](PUBLICATION_VERIFICATION.md) for this run’s results rather than assuming every command has passed on another machine.
