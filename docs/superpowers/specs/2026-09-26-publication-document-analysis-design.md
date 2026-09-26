# Publication Document Analysis — Design Specification

**Project:** Zey University Research Center (ZURC)  
**Date:** 2026-09-26  
**Status:** Awaiting final user review

## 1. Purpose

Extend ZURC from metadata-only research discovery into a controlled publication-document system. Administrators and eligible researchers will upload publication PDFs, the backend will extract and index all available pages, and visitors will be able to request structured summaries or ask document-specific questions. Answers must be grounded in the uploaded document and expose page-aware evidence. Generation runs exclusively through the locally hosted Ollama Qwen model; uploaded content is never sent to a paid or cloud AI provider. Document access and deterministic fallback must continue when local Ollama is unavailable.

## 2. Goals

- Add an academic review lifecycle so incomplete records do not become public accidentally.
- Let administrators create, upload, review, publish, archive, replace, and reprocess publication documents.
- Let researchers submit drafts and upload PDFs only when they are publication authors.
- Extract text from every text-bearing PDF page rather than using only the abstract or opening pages.
- Preserve page boundaries and section hints for summaries, retrieval, and citations.
- Generate structured summaries using the required headings: In Short, Research Objective, Methodology, Key Findings, Conclusions, Limitations, Why It Matters, and Keywords.
- Answer focused questions using the publication document as the primary source.
- Clearly identify missing or unstated information.
- Keep the assistant functional without Ollama through database search and deterministic document fallback.
- Keep document text, prompts, summaries, and questions on the local ZURC/Ollama environment.
- Protect uploads with authorization, validation, bounded resource usage, and indirect file access.

## 3. Non-goals

- Arbitrary visitor uploads.
- A general-purpose internet or encyclopedic chatbot.
- Paid or cloud-hosted AI APIs, including OpenAI, Claude, Gemini, and equivalent providers.
- Automatic trust in model-generated claims.
- OCR in the first implementation. Image-only/scanned PDFs will be detected and reported as requiring OCR.
- DOCX, spreadsheets, images, or other file formats in the first implementation.
- A distributed task queue or microservice architecture.
- Vector embeddings or an external vector database in the first implementation.

## 4. Roles and permissions

### Visitor

- Browse only `PUBLISHED` publications.
- View or download the PDF of a published publication.
- Request a cached or newly generated structured summary.
- Ask questions about a published publication.
- See page-aware evidence for document answers.
- Cannot upload, replace, process, review, publish, or archive documents.

### Researcher

- Retains all visitor capabilities.
- Can create a publication draft with themselves included as an author.
- Can edit metadata and upload/replace the PDF only while they are an author and the record is not published.
- Can submit a successfully processed draft for administrator review.
- Cannot approve or publish their own submission.
- A published record must return to administrator-controlled review before its document is replaced.

### Administrator

- Full publication and document management.
- Can create drafts, upload/replace PDFs, retry processing, inspect extraction status, review metadata and extraction samples, publish, return to draft, archive, or delete according to referential rules.
- Can publish only when required metadata is valid and document processing is `READY`.

All permission checks are enforced by Express middleware and service-level ownership checks, not only frontend route guards.

## 5. Publication lifecycle

Use a publication workflow enum independent of document processing:

```text
DRAFT → READY_FOR_REVIEW → PUBLISHED → ARCHIVED
   ↑             |
   └─────────────┘ (administrator returns for correction)
```

- `DRAFT`: editable and not public.
- `READY_FOR_REVIEW`: submitted by a researcher or marked ready by an administrator; not public.
- `PUBLISHED`: publicly discoverable and eligible for public PDF analysis.
- `ARCHIVED`: retained for institutional history but removed from ordinary public catalogues.

Existing publication rows will be migrated to `PUBLISHED` to preserve current website behavior.

Document processing uses a separate enum:

```text
PENDING → PROCESSING → READY
                    ↘ FAILED
```

- No publication can move to `PUBLISHED` unless its document status is `READY`.
- Replacing a document clears extracted chunks and cached summaries and returns processing to `PENDING`.
- A failed document can be replaced or retried.

## 6. Data model

### Publication changes

Add:

- `workflowStatus PublicationWorkflowStatus @default(DRAFT)`
- `submittedAt DateTime?`
- `publishedAt DateTime?`
- `archivedAt DateTime?`
- `reviewedAt DateTime?`
- `reviewNote String?` — administrator explanation when a submission is returned for correction.

The existing `pdfUrl` remains temporarily for migration compatibility and external legacy PDFs. A managed document takes precedence when present.

### PublicationDocument

One optional managed document per publication:

- `id String` — primary key.
- `publicationId String` — unique FK to Publication, cascade on publication deletion.
- `originalName String` — display-only original filename.
- `storageKey String` — unique server-generated filename/path token.
- `mimeType String` — must be `application/pdf` after validation.
- `sizeBytes Int` — maximum 25 MiB.
- `sha256 String` — integrity and duplicate-content checksum.
- `pageCount Int?`
- `characterCount Int?`
- `status DocumentProcessingStatus @default(PENDING)`
- `failureCode String?` — stable machine-readable category.
- `failureMessage String?` — safe administrator-facing explanation.
- `processedAt DateTime?`
- `createdAt DateTime`
- `updatedAt DateTime`

### DocumentChunk

Page-aware extracted content:

- `id String` — primary key.
- `documentId String` — FK to PublicationDocument, cascade on deletion/replacement.
- `chunkIndex Int` — deterministic order within the document.
- `pageStart Int`
- `pageEnd Int`
- `sectionTitle String?` — best-effort heading inferred from extracted text.
- `content Text`
- `normalizedText Text` — normalized retrieval representation.
- `tokenEstimate Int`
- `createdAt DateTime`

Constraints and indexes:

- unique `(documentId, chunkIndex)`;
- index `(documentId, pageStart)`;
- PostgreSQL text search can be added later without changing the domain interface.

### PublicationSummary

Cache generated summaries separately so they are invalidated when a PDF changes:

- `id String` — primary key.
- `documentId String` — FK to PublicationDocument, cascade on document deletion.
- `detailLevel SummaryDetailLevel` — `SHORT`, `STANDARD`, or `DETAILED`.
- `status SummaryProcessingStatus @default(PENDING)` — `PENDING`, `PROCESSING`, `READY`, or `FAILED`.
- `model String?` — null for deterministic fallback.
- `mode SummaryMode?` — `OLLAMA` or `FALLBACK` after successful processing.
- `content Json?` — validated structured summary sections after successful processing.
- `sourcePages Int[]` — pages contributing to the summary.
- `failureCode String?`
- `failureMessage String?`
- `createdAt DateTime`
- `updatedAt DateTime`

The composite key `(documentId, detailLevel)` is unique so each requested form has an independent cache. The summary JSON is validated before persistence. A malformed model response is discarded in favor of fallback.

## 7. File storage

- Store PDFs below `server/storage/publications/` during local development.
- Add the storage directory to `.gitignore`; commit only a `.gitkeep` if needed.
- Use a random UUID storage key with a `.pdf` suffix; never trust or reuse the uploaded filename as a path.
- Resolve every path against the configured storage root and reject path traversal.
- Serve files through an authorized API endpoint, not a public static directory.
- Persist storage through a named volume when the backend is containerized later.
- Delete the prior physical file only after the replacement file and database transition succeed.
- Clean up an uploaded file if its database transaction fails.

Environment variables:

- `PUBLICATION_STORAGE_DIR` — absolute or server-relative storage root.
- `MAX_PUBLICATION_PDF_MB` — default `25`, bounded by environment validation.
- Existing Ollama variables remain in use.

`OLLAMA_URL` must identify the locally running Ollama process or Docker service. The configured development model is `qwen2.5:0.5b`, selected for the available 8 GB laptop. The model remains configurable so a larger local Qwen model can be used on more capable hardware. No fallback code may call an external AI endpoint.

## 8. Upload validation and security

- Use multipart upload middleware with a single file field and a 25 MiB default limit.
- Require `.pdf`, declared `application/pdf`, and a `%PDF-` file signature.
- Reject empty files and multiple files.
- Generate filenames server-side.
- Never execute embedded content or invoke a shell with user-provided values.
- Extract text in a bounded worker operation with page, character, chunk, and time limits.
- Escape extracted text in the UI; never render document HTML.
- Apply backend role/ownership checks before accepting the upload.
- Apply public access only when the parent publication is `PUBLISHED`.
- Return safe errors: unsupported file, too large, scanned/no text, corrupt/encrypted PDF, extraction timeout, storage failure, and processing failure.
- Do not expose filesystem paths, stack traces, or raw parser errors.
- Add upload and analysis rate limiting as a production recommendation; local demonstration remains single-node.

## 9. Extraction and chunking pipeline

1. Receive and validate the PDF.
2. Store it under a generated storage key.
3. Create/update `PublicationDocument` as `PENDING`.
4. Schedule processing in the modular monolith and return HTTP `202`.
5. Set status to `PROCESSING`.
6. Extract text page by page using a Node-compatible PDF parser.
7. Normalize whitespace while preserving paragraph and page boundaries.
8. Detect an image-only/scanned document when meaningful extracted text falls below a documented threshold.
9. Identify likely headings conservatively using line length/casing/numbering signals; absence of a heading is acceptable.
10. Form chunks of approximately 2,500–3,500 characters with limited overlap, never losing page provenance.
11. Replace all chunks atomically and record page/character counts.
12. Mark the document `READY`; otherwise mark it `FAILED` with a safe reason.

The implementation will include a small persistent polling worker inside the backend process. It claims pending document-extraction and summary-generation work from PostgreSQL and can recover jobs left in `PROCESSING` after a restart. This avoids Redis or a separate queue while preventing upload and long-summary HTTP requests from blocking until analysis finishes.

## 10. Complete-document summarization

Summary generation must not send only the abstract or first chunks to Ollama.

### Hierarchical process

1. Load every chunk in document order.
2. Group chunks into batches within the configured Ollama context budget.
3. Ask Ollama to extract evidence—not polished prose—from each batch under fixed categories: objective, methodology, findings, conclusions, limitations, significance, and keywords.
4. Include page ranges in each intermediate evidence item.
5. Hierarchically reduce intermediate evidence when it still exceeds the final context budget.
6. Generate the final structured summary using only the reduced evidence.
7. Validate all required fields and cited pages.
8. Cache the result against the current document checksum.

Detail levels behave as follows:

- `SHORT`: only the essential 3–5 sentence overview and key findings.
- `STANDARD`: the complete default section set with concise supporting evidence.
- `DETAILED`: the complete section set with fuller methodology, findings, conclusions, limitations, uncertainty, and material quantitative evidence.

Prompts explicitly require:

- no invented authors, citations, statistics, methods, findings, or limitations;
- `Not stated in the document` for unavailable sections;
- correlation/causation discipline;
- separation of author conclusions from plain-language implications;
- preservation and explanation of technical terms;
- inclusion of uncertainty or conflicting results;
- concise 3–5 sentence `In Short` output;
- page citations for material claims when page provenance is available.

### Deterministic fallback

If Ollama is unavailable or returns invalid output:

- return publication metadata and abstract explicitly labeled as metadata;
- return extracted candidate passages from section headings such as Methods, Results, Discussion, Conclusion, and Limitations, with page numbers;
- state that a generated full structured synthesis is temporarily unavailable;
- never present heuristic passages as author conclusions unless their section/content supports that label.

The fallback provides useful evidence while avoiding fabricated synthesis.

## 11. Document question answering

- The request includes a publication identifier, question, and conversation session.
- The backend verifies that the publication is publicly accessible or that the caller has management access.
- Normalize query terms and score chunks using term frequency, phrase matches, section-title matches, and page diversity.
- Select a bounded set of top chunks and adjacent context.
- Ask Ollama to answer only from those chunks and cite page numbers.
- Return the answer, evidence snippets, page ranges, publication source, and mode.
- If evidence is insufficient, state that the answer cannot be determined from the document.
- If Ollama is unavailable, return the most relevant quoted/paraphrased evidence snippets with a clear fallback label.

Document mode is separate from center-wide discovery mode so a question about one paper does not silently draw facts from unrelated publications.

## 12. API design

### Management

- `POST /api/admin/publications` — create administrator draft.
- `POST /api/researcher/publications` — create researcher-owned draft.
- `POST /api/publications/:id/document` — upload/replace PDF; administrator or eligible author; multipart; returns `202`.
- `GET /api/publications/:id/document/status` — processing status and safe failure details.
- `POST /api/admin/publications/:id/document/retry` — retry failed processing.
- `POST /api/researcher/publications/:id/submit` — move eligible draft to `READY_FOR_REVIEW`.
- `POST /api/admin/publications/:id/publish` — publish only when document is ready.
- `POST /api/admin/publications/:id/return` — return to draft with review note.
- `POST /api/admin/publications/:id/archive` — archive publication.

### Public/authorized reading

- `GET /api/publications/:slug/document` — stream managed PDF with safe headers and authorization.
- `GET /api/publications/:slug/summary?detailLevel=STANDARD` — return the requested cached summary/status.
- `POST /api/publications/:slug/summary` — request `{detailLevel}` generation; returns the matching cached result or `202` processing state.
- `POST /api/publications/:slug/ask` — ask a document-specific question.

Responses use the existing safe API error shape and add stable processing codes where the client needs actionable states.

## 13. Frontend experience

### Administrator publication editor

- Separate metadata, relationships, document, and review sections.
- Display workflow and processing badges.
- PDF drop zone/file picker with file name, size, progress, and validation.
- Processing state with polling, retry action, page count, extracted character count, and a small extraction preview.
- Publish button disabled with a precise explanation until requirements pass.
- Return-to-draft and archive actions use custom confirmation dialogs and toasts.

### Researcher workspace

- Add `Submit publication` and draft editor flows.
- Enforce that the current researcher is an author.
- Show administrator review state and safe processing errors.
- Prevent editing after submission unless an administrator returns the record.

### Public publication detail

- Show `Read PDF`, `Summarize`, and `Ask this publication` actions only for published, ready documents.
- Render structured summary sections rather than an unformatted chat paragraph.
- Offer Short, Standard, and Detailed summary controls and preserve independent loading/cache states.
- Show page-reference chips linked to the PDF endpoint with a page fragment where supported.
- Clearly label Ollama and fallback modes.
- Provide loading, queued, processing, failed, empty, and retry states without browser alerts.

### Assistant

- Keep center-wide search as the default mode.
- Add a document context banner when launched from a publication page.
- Questions in document mode call the publication-specific endpoint and keep source evidence tied to that publication.

All layouts must remain intentionally responsive at mobile, tablet, and desktop widths.

## 14. Error handling

- `400`: malformed multipart request or invalid workflow transition.
- `401/403`: missing authentication or insufficient ownership/role.
- `404`: publication/document not found or not publicly accessible.
- `409`: workflow conflict, processing already active, or document required before publish.
- `413`: PDF exceeds configured size.
- `415`: unsupported or invalid PDF.
- `422`: metadata/field validation failure or unusable scanned PDF.
- `503`: temporary storage/processing service failure where retry is appropriate.

All successful mutations show toasts. Field errors appear beside metadata controls. Upload/processing failures remain visible in the document panel until corrected. Backend logs contain diagnostic details; public responses do not.

## 15. Dependencies and implementation boundaries

- Use a maintained Express multipart middleware for bounded uploads.
- Use a maintained Node-compatible PDF text extraction library capable of page-level extraction.
- Use the existing local Ollama HTTP endpoint with the configured Qwen model for all generative operations.
- Encapsulate storage, extraction, chunking, retrieval, summarization, and workflow rules in separate services.
- Routes remain thin and delegate authorization-sensitive operations to services.
- No Python service, Redis, object store, paid API, cloud model, or external document-processing service is required or permitted.
- Exact dependency versions will be locked in the implementation plan after checking compatibility with Node 20+, TypeScript, and the existing ESM build.

## 16. Testing strategy

### Unit tests

- File-signature, MIME, extension, and size validation.
- Safe storage-key/path handling.
- Workflow transition rules.
- Researcher authorship authorization.
- Page-preserving chunk creation and overlap.
- Scanned/no-text detection.
- Query-to-chunk ranking.
- Structured summary validation and fallback behavior.

### Integration tests

- Upload a small multi-page PDF and verify document/chunk persistence.
- Reject corrupt, disguised, oversized, and image-only files.
- Recover a pending/interrupted processing job.
- Prevent unauthorized researcher upload and publication.
- Prevent public access to drafts.
- Publish a ready document and stream it publicly.
- Replace a draft PDF and invalidate chunks/summary.
- Verify Ollama-offline summary and question fallbacks.

### UI and acceptance tests

- Administrator create/upload/review/publish flow.
- Researcher draft/upload/submit flow.
- Public summary and document-question flow.
- Clear queued, processing, ready, failed, and fallback states.
- Mobile upload panel, summary sections, evidence cards, and dialogs without horizontal page overflow.

### Final verification

- Prisma migration and fresh database setup.
- Seed compatibility.
- Lint, unit/integration tests, and production builds.
- Manual test with Docker Ollama running and stopped.
- Manual test using a long multi-section paper to confirm that evidence spans the complete document.

## 17. Migration and seed behavior

- Existing publications migrate to `PUBLISHED` so the current public catalogue remains populated.
- Existing rows without managed PDFs retain their external `pdfUrl`/`externalUrl` behavior.
- Metadata-only records show `Full-document summary unavailable` rather than pretending the abstract represents the whole paper.
- Seed data should include at least one ready text PDF fixture, one metadata-only publication, one processing-failure example, and draft/review workflow examples without embedding copyrighted third-party papers.

## 18. Documentation changes

Update:

- `README.md` for storage setup, upload limits, processing, Ollama, and fallback.
- `docs/API.md` with multipart and workflow endpoints.
- `docs/AI.md` with hierarchical full-document processing and evidence retrieval.
- `docs/DATABASE.md` and Mermaid ERD with new entities/enums.
- `docs/ARCHITECTURE.md` with storage and worker flow.
- `docs/PROJECT_DOCUMENTATION.md` and thesis report with implemented scope, limitations, testing, and screenshots.

## 19. Acceptance criteria

The feature is complete when:

1. An administrator can create a draft, upload a valid PDF, observe processing, review it, and publish it.
2. An authored researcher can create/modify a draft and submit it but cannot self-publish.
3. Every extracted text-bearing page contributes to the stored page-aware chunk set.
4. Public users cannot access draft metadata or files.
5. A published document can produce the required structured summary with page evidence.
6. A specific document question returns grounded evidence or explicitly states that the answer is not available.
7. Ollama downtime does not break document access or center-wide research search.
8. Invalid and scanned PDFs produce actionable, safe errors.
9. Replacing a document invalidates stale extraction and summaries.
10. Responsive UI, tests, lint, migrations, seed, and production builds pass.

## 20. Known limitation

The first release extracts embedded PDF text and cannot interpret pages that contain only scanned images. This is reported explicitly. OCR, semantic vector retrieval, external repositories, and distributed workers remain future extensions rather than hidden dependencies.
