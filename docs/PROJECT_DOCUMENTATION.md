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
