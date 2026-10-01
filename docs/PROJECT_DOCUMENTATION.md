# Project Documentation

## Introduction and problem statement

University research output is often scattered across directories, repositories, and documents. ZURC provides one coherent system for publishing research, connecting people to projects and publications, and managing institutional content. It is more than CRUD: cross-entity discovery, normalized research relationships, role-aware workflows, sourced AI assistance, editorial content, and a polished public experience form a complete research information system.

## Objectives and users

The platform makes research discoverable on every device, preserves normalized and traceable data, gives researchers an identity-linked workspace, secures central administration, and supports natural-language discovery without paid AI. Visitors browse and search, contact the center, register, and use the assistant. Researchers update profiles, see projects, and manage their authored publications. Administrators manage every entity, account status, roles, relationships, and messages.

## Functional modules

Institutional portal, research areas, researcher directory, projects, publication library, global search, events, news, resources, contact, authentication, researcher workspace, administration, and local retrieval-augmented assistance.

Publication search supports text, author, area, year, type, sorting, and pagination. Global search queries four entity families concurrently. All sensitive mutations are protected by backend authorization.

## Non-functional requirements

The UI supports widths from 320px upward, keyboard-accessible controls, readable contrast, loading/error/empty states, and no browser alert dialogs. Security uses Helmet, controlled CORS, bcrypt, JWT, Zod, environment configuration, safe errors, and referential integrity. Production should add TLS, rate limiting, centralized logs, backups, and HttpOnly refresh-token cookies.

## Testing and future work

Automated build, lint, and unit-test commands are provided. Acceptance testing covers both roles, authorization denial, CRUD, filters, pagination, contact, AI with and without Ollama, and 320/768/1440px layouts. Future work includes weighted full-text/vector search, managed file storage, invitation and password recovery workflows, publication approval, localization, BibTeX export, Playwright E2E tests, and external WCAG review.

## Publication document implementation addendum — 1 October 2026

The platform now distinguishes publication metadata discovery from analysis of full uploaded research PDFs. Researchers create authored drafts, upload a validated PDF, wait for complete page extraction, preview analysis, and submit for administrator review. Only the administrator can publish; only PUBLISHED records appear publicly. Replacement invalidates old extracted chunks and summaries and returns published papers to review.

Complete sequential extraction preserves page provenance. Local Qwen processes all text-bearing chunks through bounded evidence batches and hierarchical reduction. Structured summaries offer Short, Standard, and Detailed modes; conservative verified source passages prevent unsupported mapped summary statements. The overview balances objective, methodology, findings, conclusions, and explicit limitations rather than using only introductory text. Specific questions retrieve chunks from the selected document and return page evidence. Unsupported questions receive a cannot-determine response; unavailable local generation yields clearly labeled deterministic evidence. No cloud AI provider is used.

The implementation follows focused SOLID boundaries: pure workflow policy, lifecycle service with a narrow repository, generation separated from cache/job persistence, injected local generator/storage/retrieval seams, thin document routes, typed frontend transport, and reusable polling. [The investigation](PROJECT_INVESTIGATION.md) records remaining legacy refactoring limitations.

The seed now contains 34 fictional publications, including a 12-page original synthetic teaching PDF, a review submission, an editable draft, and an OCR-required example. Destructive seeding requires explicit permission through an environment flag outside dedicated test databases. Existing catalogue examples remain metadata-only. Synthetic fixtures and passing tests do not establish scholarly accuracy on real papers: small-model omissions, lexical retrieval limits, scanned-page OCR, and multi-process worker leases remain limitations.

[Publication workflow](PUBLICATION_DOCUMENTS.md) is the current source for setup, API contracts, model/context budgets, lifecycle diagram, demonstration, and reproducible acceptance commands. [Database documentation](DATABASE.md) includes the document tables, enums, constraints, and ERD. Earlier numerical evaluation sections describe the pre-document baseline and should not be interpreted as verification of this extension; current run evidence is recorded in the implementation progress ledger.
