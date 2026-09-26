# Publication Document Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure publication PDF upload, complete page-aware extraction, academic review workflow, local-Qwen structured summaries, and grounded document question answering to ZURC.

**Architecture:** Extend the modular monolith with normalized document/chunk/summary tables, protected filesystem storage, a recoverable PostgreSQL-backed in-process worker, and focused workflow, extraction, retrieval, and Ollama services. Existing public metadata discovery remains available, but public publication queries expose only `PUBLISHED` records; document analysis uses only local Ollama/Qwen and deterministic local fallback.

**Tech Stack:** React 19, TypeScript, Express 5, PostgreSQL 16, Prisma 6, Multer 2.4.0, pdfjs-dist 5.4.624, Zod, Vitest, Supertest 7.3.0, local Ollama with `qwen2.5:0.5b`.

**Spec:** `docs/superpowers/specs/2026-09-26-publication-document-analysis-design.md`

## Global Constraints

- Node.js must be at least 20.16.0 because `pdfjs-dist@5.4.624` requires it.
- PDFs only; default maximum size is exactly 25 MiB.
- Uploaded content, prompts, questions, and summaries must never be sent to a paid or cloud AI API.
- All generative work uses the configured local `OLLAMA_URL` and Qwen model; deterministic local fallback is mandatory.
- Visitors cannot upload arbitrary documents.
- Researchers may modify documents only for publications they author and cannot self-publish.
- Administrators are the only actors permitted to publish, return, archive, or retry global processing.
- Every text-bearing page must participate in page-aware chunk storage and full-document summary processing.
- Scanned/image-only PDFs are detected and rejected with an actionable explanation; OCR is out of scope.
- The first implementation remains a modular monolith: no Redis, Python service, object store, vector database, or worker microservice.
- Existing publications migrate to `PUBLISHED`; metadata-only records must never claim a full-document summary.
- All public, researcher, and administrator layouts must work without page-level horizontal overflow at 320 px and above.

## Review Focus

1. A file named `.pdf` with a non-PDF signature must return `415` and leave no stored file or database row; Task 2 pins this.
2. A researcher who is not an author must receive `403` for upload, replacement, edit, and submit operations; Task 7 pins this.
3. A backend restart during `PROCESSING` must recover extraction and summary work without duplicate chunks or stale summaries; Task 4 pins this.
4. A long paper whose methods/results occur after the opening pages must include those later-page facts in intermediate evidence and final source pages; Task 5 pins this.
5. Draft/archived publications and their PDFs must be invisible through catalogues, relationships, search, direct detail, download, summary, and document-QA endpoints; Task 8 pins this.

---

## File Structure

### Backend additions

- `server/src/domain/publication-workflow.ts` — pure transition and publishability rules.
- `server/src/services/documents/storage.service.ts` — safe keys, paths, checksums, writes, replacement, cleanup.
- `server/src/services/documents/pdf.service.ts` — page extraction and parser error classification.
- `server/src/services/documents/chunk.service.ts` — page-preserving normalization, heading hints, chunks, scan detection.
- `server/src/services/documents/document.service.ts` — document replacement, persistence, invalidation, status DTOs.
- `server/src/services/documents/worker.service.ts` — claim, process, recover, and poll extraction/summary jobs.
- `server/src/services/documents/ollama.service.ts` — bounded local generation and JSON validation boundary.
- `server/src/services/documents/summary.service.ts` — hierarchical evidence extraction, synthesis, cache, fallback.
- `server/src/services/documents/retrieval.service.ts` — lexical page-aware chunk ranking and adjacent context.
- `server/src/services/documents/question.service.ts` — grounded document QA and evidence fallback.
- `server/src/services/publication-access.service.ts` — role, authorship, workflow, and public-visibility policy.
- `server/src/routes/publication-document.routes.ts` — upload/status/download/summary/QA endpoints with route-specific auth.
- Matching `*.test.ts` files beside each focused service.
- `server/test/fixtures/research-paper.pdf` and invalid/scanned fixtures — original test-only documents.

### Backend modifications

- `server/prisma/schema.prisma`, migration SQL, and `server/prisma/seed.ts`.
- `server/src/config/env.ts`, `server/src/index.ts`, `server/src/app.ts`.
- Existing admin, researcher, public, search, validation, error, and AI modules.
- `server/package.json`, lockfile, and root `.gitignore`/`.env.example`.

### Frontend additions

- `client/src/components/PublicationDocumentPanel.tsx` — reusable upload/status/retry/review panel.
- `client/src/components/PublicationSummary.tsx` — structured summary/status/evidence rendering.
- `client/src/components/DocumentQuestionPanel.tsx` — publication-scoped question UI.
- `client/src/pages/ResearcherPublicationDraft.tsx` — researcher create/edit/upload/submit flow.
- Focused component/service tests and test setup.

### Frontend modifications

- `client/src/services/api.ts`, domain types, routing, admin editor/dashboard, researcher workspace, publication detail, assistant, and responsive CSS.

### Documentation modifications

- `README.md`, `.env.example`, and all focused files in `docs/` named by the design specification.

---

### Task 1: Persistence Model and Publication Workflow

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260926120000_publication_document_analysis/migration.sql`
- Create: `server/src/domain/publication-workflow.ts`
- Create: `server/src/domain/publication-workflow.test.ts`

**Interfaces:**
- Produces enums `PublicationWorkflowStatus`, `DocumentProcessingStatus`, `SummaryProcessingStatus`, `SummaryDetailLevel`, and `SummaryMode`.
- Produces Prisma models `PublicationDocument`, `DocumentChunk`, and `PublicationSummary` exactly as specified.
- Produces `canTransitionPublication(from, to, actorRole): boolean` and `assertPublicationPublishable(publication): void`.

- [ ] **Step 1: Write failing workflow tests** covering valid draft submission, admin-only publication/archive/return, researcher self-publication rejection, missing-ready-document rejection, and review-note reset behavior.
- [ ] **Step 2: Run `npm test -w server -- publication-workflow.test.ts`** and verify failure because the domain module does not exist.
- [ ] **Step 3: Extend the Prisma schema** with workflow timestamps/review fields, one-to-one managed document, per-detail-level summary relations, page-aware chunks, composite uniqueness, indexes, and cascade behavior; set `Publication.workflowStatus` default to `DRAFT`.
- [ ] **Step 4: Create the migration** with `npx prisma migrate dev --name publication_document_analysis`; edit migration SQL so existing rows are backfilled to `PUBLISHED` before enforcing the final default for new rows.
- [ ] **Step 5: Implement workflow functions** with explicit transition tables and `HttpError(409, ...)` for failed publish preconditions.
- [ ] **Step 6: Run `npm run db:generate`, the focused test, and `npx prisma validate`**; expect all to pass.
- [ ] **Step 7: Commit** schema, migration, domain module, and test with `feat: add publication document lifecycle`.

### Task 2: Secure Upload Storage and Validation

**Files:**
- Modify: `server/package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `server/src/config/env.ts`
- Create: `server/storage/publications/.gitkeep`
- Create: `server/src/services/documents/storage.service.ts`
- Create: `server/src/services/documents/storage.service.test.ts`
- Create: `server/src/middleware/publication-upload.ts`

**Interfaces:**
- Consumes configured `PUBLICATION_STORAGE_DIR` and `MAX_PUBLICATION_PDF_MB`.
- Produces `validatePdfUpload(file): void`, `storePdf(buffer): Promise<StoredPdf>`, `resolveStoragePath(storageKey): string`, and `deleteStoredPdf(storageKey): Promise<void>`.
- `StoredPdf` contains `{storageKey, absolutePath, sha256, sizeBytes}`.
- Produces `publicationPdfUpload` Multer middleware accepting one `document` field.

- [ ] **Step 1: Write failing storage tests** for valid `%PDF-` content, disguised extension/signature, wrong MIME, zero bytes, 25 MiB boundary, traversal storage keys, checksum stability, cleanup after simulated write failure, and the first Review Focus item.
- [ ] **Step 2: Run the focused test** and verify missing-module failure.
- [ ] **Step 3: Install exact packages** with `npm install -w server multer@2.4.0` and `npm install -D -w server @types/multer@2.2.0`.
- [ ] **Step 4: Add validated environment values**: storage root default `server/storage/publications` and upload size default `25`, bounded from 1 to 100 MiB.
- [ ] **Step 5: Implement atomic local storage** using UUID keys, temporary write then rename, SHA-256 hashing, root containment checks, and idempotent cleanup.
- [ ] **Step 6: Implement bounded Multer memory upload middleware** with one-file count and error mapping for `413`/`415`.
- [ ] **Step 7: Run focused tests, lint, and server build**; expect pass.
- [ ] **Step 8: Commit** with `feat: add secure publication pdf storage`.

### Task 3: Complete PDF Extraction and Page-Aware Chunking

**Files:**
- Modify: `server/package.json`, `package-lock.json`
- Create: `server/src/services/documents/pdf.service.ts`
- Create: `server/src/services/documents/pdf.service.test.ts`
- Create: `server/src/services/documents/chunk.service.ts`
- Create: `server/src/services/documents/chunk.service.test.ts`
- Create: `server/test/fixtures/research-paper.pdf`
- Create: `server/test/fixtures/corrupt.pdf`
- Create: `server/test/fixtures/image-only.pdf`

**Interfaces:**
- Produces `ExtractedPage { pageNumber: number; text: string }`.
- Produces `extractPdfPages(path): Promise<{pages: ExtractedPage[]; pageCount: number}>`.
- Produces `isTextUsable(pages): boolean` and `chunkPages(pages, options?): ChunkDraft[]`.
- `ChunkDraft` contains ordered index, page range, optional heading, normalized content, and token estimate.

- [ ] **Step 1: Add original test fixtures** containing unique markers on the first, middle, and final pages plus Methods, Results, Conclusion, and Limitations headings; include corrupt and textless fixtures.
- [ ] **Step 2: Write failing extraction tests** asserting every page marker, page count/order, safe corrupt/encrypted classification, and scanned/no-text detection.
- [ ] **Step 3: Write failing chunk tests** asserting 2,500–3,500-character targets, bounded overlap, no lost paragraphs, monotonic indices, correct page ranges, heading hints, and deterministic normalized text.
- [ ] **Step 4: Install `pdfjs-dist@5.4.624`** and document Node `>=20.16.0`.
- [ ] **Step 5: Implement page extraction** using the legacy Node PDF.js build with no remote resources or script execution.
- [ ] **Step 6: Implement pure normalization/chunking** and the text-usability threshold without inventing missing page content.
- [ ] **Step 7: Run both focused suites, lint, and server build**; expect pass.
- [ ] **Step 8: Commit** with `feat: extract and chunk complete publication pdfs`.

### Task 4: Document Replacement and Recoverable Processing Worker

**Files:**
- Create: `server/src/services/documents/document.service.ts`
- Create: `server/src/services/documents/document.service.test.ts`
- Create: `server/src/services/documents/worker.service.ts`
- Create: `server/src/services/documents/worker.service.test.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes storage/extraction/chunk services from Tasks 2–3.
- Produces `replacePublicationDocument(publicationId, upload): Promise<DocumentStatusDto>`.
- Produces `processNextDocument(): Promise<boolean>`, `recoverInterruptedJobs(): Promise<number>`, `startDocumentWorker(): StopWorker`, and `getDocumentStatus(publicationId): Promise<DocumentStatusDto>`.

- [ ] **Step 1: Write failing document-service tests** for atomic replacement, prior-file deletion only after success, chunk/summary invalidation, and cleanup on transaction failure.
- [ ] **Step 2: Write failing worker tests** for `PENDING→PROCESSING→READY`, safe `FAILED` classifications, idempotent retries, no duplicate chunks, and restart recovery required by Review Focus item 3.
- [ ] **Step 3: Run focused tests** and verify missing implementations.
- [ ] **Step 4: Implement document replacement** with storage-first/database transaction/old-file cleanup ordering and safe DTOs.
- [ ] **Step 5: Implement a single-concurrency polling worker** that atomically claims work, recovers stale `PROCESSING` records at startup, persists all chunks transactionally, and supports clean shutdown.
- [ ] **Step 6: Start/stop the worker from `index.ts`** without starting it in unit-test mode.
- [ ] **Step 7: Run focused tests, lint, and build**; expect pass.
- [ ] **Step 8: Commit** with `feat: process publication documents reliably`.

### Task 5: Local Qwen Hierarchical Structured Summaries

**Files:**
- Create: `server/src/services/documents/ollama.service.ts`
- Create: `server/src/services/documents/ollama.service.test.ts`
- Create: `server/src/services/documents/summary.service.ts`
- Create: `server/src/services/documents/summary.service.test.ts`
- Modify: `server/src/services/documents/worker.service.ts`
- Modify: `server/src/config/env.ts`, `.env.example`

**Interfaces:**
- Produces `generateLocalJson<T>(prompt, schema, options): Promise<T>` using only `OLLAMA_URL` and `OLLAMA_MODEL`.
- Produces `StructuredPublicationSummary` with keys `inShort`, `researchObjective`, `methodology`, `keyFindings`, `conclusions`, `limitations`, `whyItMatters`, `keywords`, and per-section page evidence.
- Produces `queueSummary(documentId, detailLevel): Promise<SummaryStatusDto>` and `processSummary(summaryId): Promise<void>` with independent `SHORT`, `STANDARD`, and `DETAILED` caches.
- Produces `buildSummaryFallback(publication, chunks): StructuredFallback`.

- [ ] **Step 1: Write failing Ollama boundary tests** for local URL use, fixed low temperature, 4,096 context, bounded output, timeout, malformed JSON, schema-invalid JSON, and non-2xx fallback.
- [ ] **Step 2: Write failing hierarchical tests** with more chunks than one context window; assert first/middle/final markers reach intermediate evidence, later Methods/Results facts reach the final evidence, page citations remain valid, unstated limitations remain `Not stated`, SHORT returns only overview/findings, STANDARD returns the default sections, DETAILED preserves fuller evidence, and Review Focus item 4 passes.
- [ ] **Step 3: Write failing summary job tests** for per-detail-level cache hits, `PENDING/PROCESSING/READY/FAILED`, restart recovery, checksum invalidation of all levels, and Ollama-offline deterministic fallback.
- [ ] **Step 4: Implement the local Ollama client** with no alternate provider code path and Zod validation of generated JSON.
- [ ] **Step 5: Implement map/reduce evidence processing** by document order and token budget, followed by validated final synthesis.
- [ ] **Step 6: Implement conservative fallback** using metadata plus page-cited candidate Methods/Results/Discussion/Conclusion/Limitations passages and an explicit synthesis-unavailable notice.
- [ ] **Step 7: Add summary work to the existing single-node worker** and recovery sequence.
- [ ] **Step 8: Run focused tests, lint, and build**; expect pass.
- [ ] **Step 9: Commit** with `feat: summarize complete papers with local qwen`.

### Task 6: Page-Aware Document Retrieval and Question Answering

**Files:**
- Create: `server/src/services/documents/retrieval.service.ts`
- Create: `server/src/services/documents/retrieval.service.test.ts`
- Create: `server/src/services/documents/question.service.ts`
- Create: `server/src/services/documents/question.service.test.ts`

**Interfaces:**
- Produces `rankDocumentChunks(question, chunks, limit): RankedChunk[]`.
- Produces `answerDocumentQuestion(publicationSlug, question, access): Promise<DocumentAnswerDto>`.
- DTO includes `answer`, `mode`, publication source, and `evidence[] {chunkId,pageStart,pageEnd,snippet}`; the service persists the user/assistant exchange and evidence in the existing AI conversation tables.

- [ ] **Step 1: Write failing ranking tests** for phrase/term/heading weights, stop words, adjacent context, page diversity, deterministic ties, and empty queries.
- [ ] **Step 2: Write failing QA tests** for grounded local-Qwen answers, page evidence, insufficient-evidence refusal, document isolation, prompt-injection text inside a PDF, and Ollama-offline evidence fallback.
- [ ] **Step 3: Run focused tests** and verify missing implementations.
- [ ] **Step 4: Implement lexical ranking** over normalized stored chunks without external embeddings.
- [ ] **Step 5: Implement question answering** with a strict document-only prompt, citation validation, and safe fallback snippets.
- [ ] **Step 6: Run focused tests, lint, and build**; expect pass.
- [ ] **Step 7: Commit** with `feat: answer questions from publication evidence`.

### Task 7: Authorization, Workflow, and Document APIs

**Files:**
- Modify: `server/package.json`, `package-lock.json`
- Create: `server/src/services/publication-access.service.ts`
- Create: `server/src/services/publication-access.service.test.ts`
- Create: `server/src/routes/publication-document.routes.ts`
- Create: `server/src/routes/publication-document.routes.test.ts`
- Modify: `server/src/routes/admin.routes.ts`
- Modify: `server/src/routes/researcher.routes.ts`
- Modify: `server/src/routes/public.routes.ts`
- Modify: `server/src/validation/schemas.ts`
- Modify: `server/src/app.ts`, `server/src/middleware/errors.ts`

**Interfaces:**
- Produces access functions `requirePublicationAuthor`, `requirePublicationManager`, and `requirePublicOrManagerAccess`.
- Implements the exact management/read endpoints defined in Spec Section 12.
- Upload endpoint accepts multipart field `document`; question endpoint accepts `{question, sessionId}`.

- [ ] **Step 1: Install test packages** `supertest@7.3.0` and `@types/supertest@7.2.1` as server dev dependencies.
- [ ] **Step 2: Write failing access-policy tests** for admin, author, non-author, inactive user, draft public access, and Review Focus item 2 across edit/upload/replace/submit.
- [ ] **Step 3: Write failing route tests** for upload `202`, status, retry, submit, publish preconditions, return-with-required-note, archive, managed-file cleanup on publication deletion, published-document replacement returning to review, secure streaming headers, per-detail-level summary queue/status, question response, `400/401/403/404/409/413/415/422/503`, and no filesystem path leakage.
- [ ] **Step 4: Implement access service and request schemas** with backend ownership enforcement.
- [ ] **Step 5: Implement thin document routes** delegating storage, workflow, summary, and QA operations to services.
- [ ] **Step 6: Add researcher draft creation** that always includes the current researcher as an author; prohibit submitted/published researcher edits.
- [ ] **Step 7: Add administrator lifecycle actions** and route-specific error mapping.
- [ ] **Step 8: Mount routes in `app.ts`** in an order that preserves existing detail routes.
- [ ] **Step 9: Run focused route/access tests, lint, and build**; expect pass.
- [ ] **Step 10: Commit** with `feat: expose protected publication document APIs`.

### Task 8: Public Visibility and Existing Discovery Compatibility

**Files:**
- Modify: `server/src/controllers/public.controller.ts`
- Modify: `server/src/services/search.service.ts`
- Modify: `server/src/services/ai.service.ts`
- Modify: `server/src/controllers/public.controller.test.ts`
- Modify/Create: `server/src/services/search.service.test.ts`

**Interfaces:**
- Public catalogue/detail/home/global search/center AI return only `PUBLISHED` publications.
- Related publications under project/researcher details also obey publication visibility.
- Publication detail exposes safe document capability/status metadata, never storage keys.

- [ ] **Step 1: Write failing visibility tests** covering every public path named in Review Focus item 5, direct slugs, relationship includes, statistics, and center-wide AI sources.
- [ ] **Step 2: Write compatibility tests** showing migrated metadata-only published records remain browsable but report no full-document summary capability.
- [ ] **Step 3: Apply `PUBLISHED` filters** consistently to all public queries and relation includes.
- [ ] **Step 4: Add safe document capability DTOs** to publication detail responses.
- [ ] **Step 5: Run focused tests, full server tests, lint, and build**; expect pass.
- [ ] **Step 6: Commit** with `fix: enforce publication visibility across discovery`.

### Task 9: Frontend API and Domain Types

**Files:**
- Modify: `client/src/services/api.ts`
- Modify: `client/src/services/api.test.ts`
- Modify: `client/src/types.ts`
- Create: `client/src/types/publication-document.ts`
- Modify: `client/vite.config.ts`
- Create: `client/src/test/setup.ts`

**Interfaces:**
- `api<T>` must send JSON only when the body is not `FormData`; the browser supplies multipart boundaries.
- Produces typed workflow/document/summary/evidence DTOs matching Task 7.
- Adds jsdom/testing-library setup for component tasks.

- [ ] **Step 1: Write failing API tests** asserting JSON headers remain, FormData omits manual `content-type`, 202 JSON parses, 204 remains supported, and structured processing errors are preserved.
- [ ] **Step 2: Implement header/body discrimination** without breaking JWT injection or expired-session behavior.
- [ ] **Step 3: Add exact TypeScript DTOs and test configuration**.
- [ ] **Step 4: Run client tests, lint, and build**; expect pass.
- [ ] **Step 5: Commit** with `feat: support typed publication document requests`.

### Task 10: Administrator Document and Review Interface

**Files:**
- Create: `client/src/components/PublicationDocumentPanel.tsx`
- Create: `client/src/components/PublicationDocumentPanel.test.tsx`
- Modify: `client/src/components/AdminEditor.tsx`
- Modify: `client/src/pages/Admin.tsx`
- Modify: `client/src/styles.css`

**Interfaces:**
- Consumes Task 9 API/DTOs.
- Produces reusable management panel props `{publication, canPublish, onChanged}`.
- Polls status only while `PENDING` or `PROCESSING`, and cancels polling on unmount.

- [ ] **Step 1: Write failing component tests** for valid file selection, client-side size/type feedback, upload progress/busy state, processing polling, READY details, retry, safe failure, publish disabled reason, return note, archive/delete confirmation, toasts, and Escape/dialog behavior.
- [ ] **Step 2: Add workflow/document columns and actions** to the publication management table.
- [ ] **Step 3: Integrate the document panel into publication editing** with separate Metadata, Relationships, Document, and Review sections.
- [ ] **Step 4: Implement upload/poll/retry/publish/return/archive interactions** without browser alerts.
- [ ] **Step 5: Add responsive styles** for a one-column 320 px layout, bounded dialogs, wrapped action bars, and accessible status badges.
- [ ] **Step 6: Run focused UI tests, client tests, lint, and build**; expect pass.
- [ ] **Step 7: Commit** with `feat: add administrator publication review workflow`.

### Task 11: Researcher Draft Submission Interface

**Files:**
- Create: `client/src/pages/ResearcherPublicationDraft.tsx`
- Create: `client/src/pages/ResearcherPublicationDraft.test.tsx`
- Modify: `client/src/pages/ResearcherSpace.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`

**Interfaces:**
- Consumes researcher draft/create/edit/upload/status/submit endpoints.
- Reuses `PublicationDocumentPanel` in author mode without admin actions.

- [ ] **Step 1: Write failing UI tests** for create draft, automatic current-author presence, edit restrictions, upload, processing failure, submit readiness, post-submit lock, server field errors, toasts, and non-author `403` display.
- [ ] **Step 2: Add draft routes and workspace sections** separating editable drafts, under-review submissions, and published authored work.
- [ ] **Step 3: Implement the responsive draft editor** and author-mode document panel.
- [ ] **Step 4: Run focused UI tests, client tests, lint, and build**; expect pass.
- [ ] **Step 5: Commit** with `feat: let researchers submit publication drafts`.

### Task 12: Public Summary and Document Question Experience

**Files:**
- Create: `client/src/components/PublicationSummary.tsx`
- Create: `client/src/components/PublicationSummary.test.tsx`
- Create: `client/src/components/DocumentQuestionPanel.tsx`
- Create: `client/src/components/DocumentQuestionPanel.test.tsx`
- Modify: `client/src/pages/Details.tsx`
- Modify: `client/src/pages/Assistant.tsx`
- Modify: `client/src/styles.css`

**Interfaces:**
- Summary component renders the eight required sections and page-reference links.
- Question panel renders answer mode and evidence snippets/page ranges.
- Assistant accepts optional publication context from route state/query and uses publication-specific QA rather than center search.

- [ ] **Step 1: Write failing summary tests** for independent Short/Standard/Detailed controls and caches, cached READY output, queue/poll flow, required headings per level, `Not stated`, page chips, metadata-only notice, FAILED state, and Ollama/fallback labels.
- [ ] **Step 2: Write failing QA tests** for document context banner, busy/error/empty/refusal states, evidence links, fallback mode, and ensuring no unrelated center source is shown.
- [ ] **Step 3: Add Read PDF, Summarize, and Ask this publication actions** only when the document capability DTO permits them.
- [ ] **Step 4: Implement structured summary and QA components** with accessible status announcements and cancellation-safe polling.
- [ ] **Step 5: Add publication-context mode to Assistant** while preserving center-wide default behavior.
- [ ] **Step 6: Add mobile/tablet/desktop styles** for structured sections, evidence cards, controls, and long technical text without overflow.
- [ ] **Step 7: Run focused UI tests, all client tests, lint, and build**; expect pass.
- [ ] **Step 8: Commit** with `feat: add grounded publication analysis experience`.

### Task 13: Seed Fixtures and End-to-End Backend Acceptance

**Files:**
- Modify: `server/prisma/seed.ts`
- Create: `server/src/publication-documents.integration.test.ts`
- Create/Reuse: `server/test/fixtures/research-paper.pdf`

**Interfaces:**
- Seed includes one READY first-party text document, metadata-only publication, failed-processing example, draft, and ready-for-review submission without copyrighted third-party content.
- Integration suite uses a dedicated test database or transaction cleanup and never destroys the developer database.

- [ ] **Step 1: Write failing integration flow**: admin draft → PDF upload → worker extraction → review → publish → public detail/download → summary → question with later-page evidence.
- [ ] **Step 2: Add researcher acceptance flow** covering authored draft and non-author rejection.
- [ ] **Step 3: Add Ollama-offline acceptance flow** proving fallback access/summary evidence/QA and no external network calls.
- [ ] **Step 4: Update the seed** to copy the original test fixture through `storage.service`, run `extractPdfPages` and `chunkPages`, and create the READY document/chunks deterministically; create separate metadata-only, FAILED, DRAFT, and READY_FOR_REVIEW examples, and preserve the documented destructive-seed warning.
- [ ] **Step 5: Run migration on a fresh test database, seed, and integration tests**; expect pass with exact record relationships.
- [ ] **Step 6: Commit** with `test: cover publication document lifecycle`.

### Task 14: Documentation, Full Verification, and Manual Demonstration

**Files:**
- Modify: `README.md`
- Modify: `docs/API.md`, `docs/AI.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/PROJECT_DOCUMENTATION.md`, `docs/ZURC_THESIS_REPORT.md`
- Modify: Mermaid ERD and acceptance/screenshot checklists within those documents.

**Interfaces:**
- Documentation must describe only behavior verified by Tasks 1–13.

- [ ] **Step 1: Update installation/environment/storage instructions** including Node 20.16+, 25 MiB limit, local Docker Ollama/Qwen, no cloud AI, migration, seed, and backup implications.
- [ ] **Step 2: Document every endpoint and example** including multipart upload, 202 polling, lifecycle errors, structured summary, evidence, and fallback.
- [ ] **Step 3: Synchronize database dictionary and ERD** with every enum, table, field, constraint, index, relationship, and referential action.
- [ ] **Step 4: Update architecture/AI/thesis workflows** to distinguish metadata search, full-document map/reduce, question retrieval, worker recovery, limitations, and security.
- [ ] **Step 5: Run `npm run db:generate`, migration status, fresh test migration/seed, `npm run lint`, `npm test`, and `npm run build`**; capture exact pass counts and do not claim unrun checks.
- [ ] **Step 6: Manually verify with Docker Ollama/Qwen running** using a long multi-section fixture; confirm final-page evidence and `mode=ollama`.
- [ ] **Step 7: Stop Ollama and repeat**; confirm safe deterministic fallback and unchanged PDF/search access.
- [ ] **Step 8: Manually inspect 320, 390, 768, 1024, and 1440 px layouts** for admin upload/review, researcher draft, public summary, document QA, dialogs, loading, empty, and error states.
- [ ] **Step 9: Run `git diff --check` and inspect final status/diff** for secrets, generated storage, fixture licensing, and unrelated modifications.
- [ ] **Step 10: Commit** with `docs: document publication analysis workflow`.
