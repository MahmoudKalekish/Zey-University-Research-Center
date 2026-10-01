# ZURC investigation and document-AI implementation

Investigated on 1 October 2026. Master was clean at `950ae80`; prior document work was isolated in `.worktrees/publication-document-analysis`. New changes use `codex/research-document-ai`, starting from that worktree's existing `c0fbfec` history and preserving its uncommitted API/AI tests.

## Existing application

ZURC is an npm-workspace modular monolith. React/Vite handles public catalogues, researcher profiles and projects, login, an administrator CRUD dashboard, and a researcher workspace. Express provides JSON APIs with Zod validation, JWT authentication, bcrypt hashes, and Prisma/PostgreSQL persistence. Docker runs PostgreSQL 16; the separate `zurc-ollama` container exposes the local Qwen model.

The original research assistant retrieves database metadata: publication titles, abstracts, keywords, authors, project descriptions, and related research areas. It does not read external publication links or PDF content. Therefore an answer about a paper's full methods or results was not supported by the original system. The existing seed's 30 publications are fictional metadata records, not full papers.

The investigation covered application routes, authentication, validation, Prisma relationships/migrations/seed, backend search and AI services, document feature services/tests, frontend pages/layouts/hooks/API/types, styling and package/infrastructure configuration, and the architecture/API/database/thesis documentation. No real research data was added or sent to a remote AI provider.

## SOLID and clean-code decisions

- **Single responsibility:** lifecycle policy remains in domain functions; a lifecycle service coordinates transitions through a narrow repository contract. Summary generation/evidence validation lives in `summary-engine.ts`, separated from Prisma job/cache orchestration in `summary.service.ts`. HTTP routes validate input and delegate; default infrastructure bindings live in `publication-document.dependencies.ts`.
- **Open/closed:** worker, storage, summary, access, and question services accept explicit dependencies. A different local generator or repository can be supplied without rewriting policy or HTTP transport. Cloud AI adapters are outside the application's supported scope.
- **Liskov substitution:** injected repositories and generators retain their result/error contracts. Tests substitute them through the same service interfaces; no inheritance hierarchy was introduced merely to satisfy the acronym.
- **Interface segregation:** extraction, lifecycle persistence, summary jobs, question retrieval, and document upload use separate small interfaces instead of one application-wide repository.
- **Dependency inversion:** core orchestration depends on repository/generator functions. Prisma, filesystem storage, and Ollama are wired at the boundary.
- **Frontend:** typed publication DTOs and document API helpers centralize transport; reusable polling owns job lifecycle and cancellation; summary, evidence, question, draft, and review components own their presentation concerns.

The existing generic administration and center-wide metadata assistant still contain broad `any` types and combined orchestration. This change improves the document feature and shared transport/authentication boundaries; it does not claim that every legacy module has been fully refactored. A whole-project rewrite would add risk without helping the requested university workflow.

## Correctness findings addressed

Actual Qwen testing exposed schema/citation mistakes that mocks did not show. Generation now supplies JSON schemas, validates output, derives summary quotation provenance from source text, and rejects unsupported mapped statements. A dense 12-page teaching paper also exposed introductory evidence crowding out results: the overview now balances objective, method, result, conclusion, and explicit limitations. Explicit Results/Conclusion/Limitations sections take precedence over general discussion evidence. Detailed output may include more verified passages.

Other fixes include preserving chunk tails during overlap, splitting headings even without blank lines, assigning a new document ID on replacement to isolate old in-flight work, atomic lifecycle updates, full public visibility filtering, multipart headers, and reloading current account roles so stale administrator JWT claims cannot authorize publication. The generic editor previously truncated every string to ten characters; only date fields are now shortened for date inputs.

## Demonstration and limits

The seed adds an original synthetic 12-page paper, an under-review document, an editable draft, and an OCR-required example. It uses production storage, extraction, and chunking services. The existing metadata-only catalogue remains available. Seed deletion is explicitly guarded; verification uses dedicated `zurc_publication_test_*` databases.

Qwen 0.5B is constrained by local hardware and can omit information or produce poor synthesis. Conservative verified quotations are preferred over unsupported paraphrases. Page citations identify supplied evidence; they are not a formal guarantee that every possible model answer is semantically correct. Missing evidence is reported, offline generation returns labeled source passages, and scanned documents require external OCR. No scholarly quality benchmark or real-world research accuracy claim is made.

See [publication workflow](PUBLICATION_DOCUMENTS.md) for setup, endpoint contracts, verification commands, and demonstration steps.
