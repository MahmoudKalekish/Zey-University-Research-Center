# Conception and Implementation of a Dynamic Website for a University Research Center

## Zey University Research Center (ZURC)

> **Master's thesis report master document**  
> This Markdown file is a complete ZURC-specific report and writing guide inspired by the structure of _LEBANESE UNIVERSITY - Mahmoud Kalekish.pdf_. Replace bracketed identity fields, insert the requested screenshots, add supervisor-approved empirical results, and adapt the formatting to the faculty template before final submission. Statements marked **Evaluation target** are proposed measurements, not completed experiments.

---

## Cover page

**[University Name]**  
**[Faculty Name]**  
**[Department Name]**

### Conception and Implementation of a Dynamic Website for a University Research Center

### Zey University Research Center (ZURC)

by  
**[Student Full Name]**  
**[Student ID]**

A thesis submitted in partial fulfillment of the requirements for the degree of **[Master's Degree Name]** to the **[Department Name]**, **[Faculty Name]**, **[University Name]**.

| Jury member            | Function           |
| ---------------------- | ------------------ |
| [Primary supervisor]   | Advisor            |
| [Assistant supervisor] | Co-advisor         |
| [Committee chair]      | Chair of committee |

**[City, Country]**  
**[Month Year]**

---

## Declaration of originality

I declare that this thesis is my original work, except where sources are explicitly acknowledged. The software implementation, analysis, diagrams, tests, and documentation presented here were produced for this project. No part of this report has been submitted previously for another degree unless clearly stated.

## Acknowledgements

I would like to express my sincere gratitude to **[Supervisor Name]** for continuous guidance, constructive feedback, and academic support throughout this project. I also thank **[Co-supervisor/Jury Names]**, the faculty, the department, and everyone who contributed requirements, technical feedback, or usability observations. Finally, I thank my family, colleagues, and friends for their encouragement during the analysis, implementation, and documentation of this work.

## Abstract

University research centers generate interconnected information about researchers, research areas, projects, publications, events, news, and reusable resources. In many institutions, this information is fragmented across spreadsheets, isolated profile pages, PDF documents, and informal communication channels. Such fragmentation limits visibility, makes institutional data difficult to maintain, and prevents visitors from discovering relationships between people and scientific outputs.

This thesis presents the conception and implementation of the **Zey University Research Center (ZURC)** platform, a modern, responsive research information and communication system. The solution combines a public institutional portal, structured research catalogues, multi-criteria publication search, a researcher workspace, an administrator dashboard, contact-message management, and a database-grounded research assistant. The system follows a modular monolith architecture. Its frontend is implemented with React, Vite, and TypeScript; its backend uses Node.js, Express, and TypeScript; PostgreSQL provides relational persistence through Prisma ORM. Authentication uses JSON Web Tokens and bcrypt password hashing, while authorization is enforced on protected backend routes.

The assistant follows a retrieval-first design. It searches the center's PostgreSQL records before generating an answer. When a local Ollama model is available, the retrieved context is used to produce a natural-language response. When Ollama is unavailable, the application automatically returns a deterministic search-based answer with relevant records. Consequently, the central platform remains usable without a paid artificial-intelligence API and does not treat a language model as an authoritative source.

The implementation provides normalized many-to-many relationships, database constraints, indexed search fields, responsive interfaces, reusable components, clear loading/error/empty states, and role-specific workflows for visitors, researchers, and administrators. Seed data demonstrates filtering, pagination, institutional statistics, relationships, and assistant retrieval. Automated compilation, linting, and unit tests establish a reproducible verification baseline. The project demonstrates how a university center can centralize research information, improve public discovery, and add transparent AI assistance without introducing mandatory cloud-AI cost or availability dependencies.

**Keywords:** university research information system, React, Express, PostgreSQL, Prisma, role-based access control, retrieval-augmented generation, Ollama, responsive web design, academic portal.

## Résumé

Les centres de recherche universitaires produisent des informations interconnectées concernant les chercheurs, axes de recherche, projets, publications, événements, actualités et ressources. Lorsque ces informations sont dispersées dans des feuilles de calcul, documents PDF et pages isolées, leur maintenance et leur valorisation deviennent difficiles. Ce mémoire présente la conception et la mise en place de la plateforme **Zey University Research Center (ZURC)**, un système web dynamique, moderne et responsive.

La solution comprend un portail public, des catalogues scientifiques, une recherche multicritère, un espace chercheur, un tableau de bord administrateur, la gestion des messages de contact et un assistant de recherche fondé sur les données du centre. Le frontend utilise React, Vite et TypeScript; le backend repose sur Node.js, Express et TypeScript; les données relationnelles sont stockées dans PostgreSQL à travers Prisma ORM. L'authentification est assurée par JWT et bcrypt, et les autorisations sont vérifiées au niveau de l'API.

L'assistant interroge d'abord PostgreSQL. Ollama est utilisé de manière optionnelle pour améliorer la formulation des réponses. En cas d'indisponibilité du modèle local, un mécanisme de recherche déterministe retourne les résultats pertinents sans interrompre l'application. Cette architecture garantit une solution démontrable, sans API d'IA payante obligatoire, et limite les risques d'hallucination en affichant les sources internes utilisées.

**Mots-clés :** centre de recherche, application web dynamique, PostgreSQL, React, Express, Prisma, JWT, contrôle d'accès, intelligence artificielle locale, recherche augmentée par récupération.

---

## Table of contents

1. [General introduction](#general-introduction)
2. [Chapter 1 — Literature review and existing systems](#chapter-1--literature-review-and-existing-systems)
3. [Chapter 2 — Requirements analysis and specification](#chapter-2--requirements-analysis-and-specification)
4. [Chapter 3 — Technological foundations and architecture](#chapter-3--technological-foundations-and-architecture)
5. [Chapter 4 — Data analysis and database design](#chapter-4--data-analysis-and-database-design)
6. [Chapter 5 — Platform implementation](#chapter-5--platform-implementation)
7. [Chapter 6 — Testing, evaluation, and results](#chapter-6--testing-evaluation-and-results)
8. [General conclusion and future work](#general-conclusion-and-future-work)
9. [References](#references)
10. [Appendices](#appendices)

## List of figures to include in the final formatted thesis

| Figure    | Caption                                           | Recommended source         |
| --------- | ------------------------------------------------- | -------------------------- |
| Figure 1  | Existing fragmented research-information workflow | Draw from problem analysis |
| Figure 2  | ZURC stakeholder and system-context diagram       | Mermaid diagram in §2.3    |
| Figure 3  | Visitor use-case diagram                          | Mermaid diagram in §2.5    |
| Figure 4  | Researcher and administrator use cases            | Mermaid diagram in §2.5    |
| Figure 5  | ZURC high-level architecture                      | Mermaid diagram in §3.3    |
| Figure 6  | Authentication and authorization sequence         | Mermaid diagram in §3.5    |
| Figure 7  | Search workflow                                   | Mermaid diagram in §3.6    |
| Figure 8  | AI retrieval and fallback workflow                | Mermaid diagram in §3.7    |
| Figure 9  | Conceptual Data Model                             | Mermaid diagram in §4.2    |
| Figure 10 | Logical Data Model                                | Mermaid diagram in §4.3    |
| Figure 11 | Physical ERD                                      | Mermaid diagram in §4.4    |
| Figure 12 | Responsive homepage — desktop                     | Application screenshot     |
| Figure 13 | Responsive homepage — mobile                      | Application screenshot     |
| Figure 14 | Research-area catalogue                           | Application screenshot     |
| Figure 15 | Researcher directory and profile                  | Application screenshot     |
| Figure 16 | Project catalogue and detail                      | Application screenshot     |
| Figure 17 | Publication search and filters                    | Application screenshot     |
| Figure 18 | Global search results                             | Application screenshot     |
| Figure 19 | AI assistant with sourced results                 | Application screenshot     |
| Figure 20 | AI assistant fallback mode                        | Application screenshot     |
| Figure 21 | Contact form and success toast                    | Application screenshot     |
| Figure 22 | Login and registration validation                 | Application screenshot     |
| Figure 23 | Researcher workspace                              | Application screenshot     |
| Figure 24 | Administrator overview                            | Application screenshot     |
| Figure 25 | Administrator data table                          | Application screenshot     |
| Figure 26 | Administrator create/edit dialog                  | Application screenshot     |
| Figure 27 | Contact-message detail and status                 | Application screenshot     |
| Figure 28 | Mobile administrator interface                    | Application screenshot     |

## List of tables

| Table       | Title                           |
| ----------- | ------------------------------- |
| Table 1     | Stakeholders and needs          |
| Table 2     | Role-permission matrix          |
| Table 3     | Functional requirements         |
| Table 4     | Non-functional requirements     |
| Table 5     | Technology stack and versions   |
| Table 6     | Main REST API routes            |
| Tables 7–22 | Database data dictionary        |
| Table 23    | Referential actions             |
| Table 24    | Test strategy                   |
| Table 25    | Functional acceptance tests     |
| Table 26    | Responsive test matrix          |
| Table 27    | Security verification checklist |
| Table 28    | Evaluation metrics and status   |

## Abbreviations and terminology

| Term  | Meaning                             |
| ----- | ----------------------------------- |
| AI    | Artificial Intelligence             |
| API   | Application Programming Interface   |
| CDM   | Conceptual Data Model               |
| CORS  | Cross-Origin Resource Sharing       |
| CRUD  | Create, Read, Update, Delete        |
| CRIS  | Current Research Information System |
| CSS   | Cascading Style Sheets              |
| DTO   | Data Transfer Object                |
| ERD   | Entity–Relationship Diagram         |
| FK    | Foreign Key                         |
| HTTP  | Hypertext Transfer Protocol         |
| JWT   | JSON Web Token                      |
| LDM   | Logical Data Model                  |
| LLM   | Large Language Model                |
| ORM   | Object–Relational Mapping           |
| PK    | Primary Key                         |
| RAG   | Retrieval-Augmented Generation      |
| RBAC  | Role-Based Access Control           |
| REST  | Representational State Transfer     |
| SPA   | Single-Page Application             |
| SQL   | Structured Query Language           |
| UI/UX | User Interface/User Experience      |
| URL   | Uniform Resource Locator            |
| ZURC  | Zey University Research Center      |

---

# General introduction

## Background and context

Research centers must communicate scientific activity to several audiences. Prospective students need to identify supervisors and research themes. Researchers need their projects and publications to be represented correctly. Institutional partners need evidence of expertise and impact. Administrators need a reliable way to maintain profiles, publications, projects, events, news, and resources. The public expects this information to remain usable on phones as well as desktop computers.

When each category is maintained independently, the institution loses the relationships that give research information meaning. A publication is more useful when its authors, project, research areas, DOI, venue, and source link are connected. A researcher profile is more informative when it exposes associated projects and authored publications. A research center therefore requires more than a collection of static pages or isolated CRUD forms; it requires a coherent research-information model and controlled editorial workflow.

Recent language-model interfaces offer an additional discovery mechanism, but they introduce cost, availability, privacy, and hallucination risks. A university demonstration project should not become unusable because a paid provider is unavailable. ZURC addresses this concern with local, optional generation and a deterministic database-search fallback.

## Problem statement

The central problem addressed by this work is:

> **How can a university research center centralize and expose its scientific information through a secure, responsive, maintainable web platform while offering transparent natural-language discovery without depending on a paid AI service?**

The problem contains five related challenges:

1. Research records and institutional content must be represented in a coherent relational model.
2. Visitors, researchers, and administrators require different capabilities and permissions.
3. Search must work across heterogeneous entities and support precise publication filters.
4. The interface must remain professional and intentionally responsive across mobile, tablet, and desktop devices.
5. AI-generated wording must remain grounded in institutional records and fail safely when local AI is unavailable.

## Research questions

- **RQ1:** Which data model can preserve relationships among users, researchers, areas, projects, and publications without duplicated or comma-separated identifiers?
- **RQ2:** How can one modular web architecture support public communication, researcher self-service, and protected administration?
- **RQ3:** How can multi-entity search and filtered publication discovery be implemented over PostgreSQL?
- **RQ4:** How can a local LLM improve natural-language interaction while preventing it from becoming the authoritative knowledge source?
- **RQ5:** Which validation, authorization, and responsive-design mechanisms are necessary for a credible institutional platform?

## Hypotheses

- **H1:** A normalized relational model with explicit junction tables will improve consistency and traceability compared with disconnected documents or comma-separated relationships.
- **H2:** Backend-enforced RBAC combined with role-specific interfaces will allow shared infrastructure without exposing administrative operations.
- **H3:** Retrieval before generation, visible source records, and deterministic fallback will produce a more dependable assistant than unrestricted generation.
- **H4:** Reusable responsive components and intentional breakpoints will support mobile use without horizontal page overflow or loss of core functionality.

These hypotheses must be assessed using the acceptance tests and evaluation plan in Chapter 6. They should not be presented as statistically proven unless formal user studies are later performed.

## Main objective

The main objective is to design, implement, document, and verify a dynamic full-stack platform for ZURC that centralizes research information and provides secure management and grounded discovery features.

## Specific objectives

- Model users, researcher profiles, research areas, projects, publications, and editorial content as distinct entities with explicit, queryable relationships.
- Provide public catalogues, details, global search, filtered publication search, institutional content, and contact submission.
- Provide authenticated researchers with a profile and authored-publication workspace.
- Provide administrators with protected management of all major entities and contact-message statuses.
- Calculate homepage and dashboard statistics from PostgreSQL rather than hard-coded values.
- Implement JWT authentication, bcrypt hashing, Zod validation, CORS policy, Helmet headers, safe errors, and backend RBAC.
- Implement a local-first assistant that retrieves PostgreSQL records, optionally calls Ollama, displays sources, and survives Ollama downtime.
- Deliver a polished UI from 320 px mobile widths through desktop layouts.
- Provide migrations, realistic seed data, documentation, automated tests, linting, and production builds.

## Scope

The implemented scope covers one research center and three application roles. It manages structured research and editorial information, but it is not a complete national CRIS, learning-management system, journal-submission system, or institutional repository. External URLs can refer to PDFs and resources; binary file hosting is outside the current implementation. Direct email delivery, password recovery, email verification, ORCID synchronization, bibliographic import, vector embeddings, and production cloud deployment are future extensions.

## Development approach

The work follows an iterative lifecycle:

1. Identify actors, information categories, risks, and expected workflows.
2. Design the normalized domain model and REST boundaries.
3. Select technologies using maintainability, cost, local reproducibility, and type safety as criteria.
4. Implement public, authenticated, and administrative modules incrementally.
5. Seed interconnected demonstration data.
6. Verify compilation, linting, tests, role restrictions, fallback behavior, and responsive layouts.
7. Document the actual implementation and distinguish completed evidence from future evaluation.

## Structure of the report

Chapter 1 reviews research-information portals, search, RAG, and comparable systems. Chapter 2 specifies stakeholders, roles, requirements, use cases, and business rules. Chapter 3 justifies the technology stack and presents architecture, authentication, search, AI, and security workflows. Chapter 4 provides the CDM, LDM, physical ERD, full data dictionary, integrity rules, and normalization analysis. Chapter 5 explains the implemented modules and interfaces. Chapter 6 defines testing and evaluation, reports reproducible technical checks, and identifies measurements still requiring empirical work. The conclusion summarizes contributions, limitations, and future improvements.

---

# Chapter 1 — Literature review and existing systems

## 1.1 University research-information systems

A research-information system organizes entities such as people, organizational units, projects, outputs, and subject areas. Unlike a static institutional website, it must preserve relationships and support discovery from several starting points. Open-science initiatives further emphasize public visibility, interoperability, and links among publications, datasets, and software. ZURC adopts this relationship-oriented principle on a center scale: researchers connect to areas, projects, and publications; publications connect to ordered authors and optionally to a producing project.

The main design implication is that content presentation and data administration cannot be treated as unrelated features. A public profile, homepage statistic, search result, administrator form, and AI answer may all depend on the same authoritative record. Central persistence reduces inconsistency and lets updates propagate to every view.

## 1.2 Information retrieval in academic portals

Academic discovery involves multiple search intents. A user may know a paper title, seek an author, explore an area, ask for a project status, or filter by publication year and type. A single free-text field is insufficient for all these cases. ZURC therefore combines:

- entity catalogues with pagination;
- case-insensitive keyword search;
- publication filters for author, area, year, and type;
- newest/oldest ordering;
- cross-entity global search;
- natural-language access through the assistant.

The current implementation uses Prisma-generated PostgreSQL queries and indexed fields. This is appropriate for the seeded center-scale dataset. PostgreSQL full-text search, ranking, trigram similarity, and vector retrieval are identified as future options for larger corpora.

## 1.3 Retrieval-augmented generation

Retrieval-Augmented Generation combines an information-retrieval stage with language generation. Lewis et al. describe the motivation for combining parametric language-model memory with explicit non-parametric memory, including improved provenance and easier knowledge updates [1]. ZURC applies the architectural principle without claiming to reproduce the paper's neural retriever: its retriever is deterministic multi-entity database search, and its optional generator is a locally hosted Ollama model.

This distinction matters. PostgreSQL records remain authoritative. The LLM receives only bounded context produced by retrieval, and returned source cards link to records on the website. If the model fails or times out, the retrieval results still form a useful answer. If retrieval returns no evidence, the assistant explicitly states that no matching information exists in the center database.

## 1.4 Security of API-based applications

Modern SPAs rely on APIs for both public data and privileged operations. OWASP identifies broken object-level authorization, broken authentication, and broken function-level authorization as major API risks [2]. Frontend route hiding cannot protect data because an attacker can call endpoints directly. ZURC therefore verifies JWTs and roles in Express middleware before all administrator and researcher routes. Validation is applied at the API boundary, passwords are hashed, errors are sanitized, and database constraints provide a second integrity layer.

## 1.5 Responsive and accessible interaction

Research portals contain dense lists, filters, tables, forms, and relationship details. Merely scaling a desktop layout produces overflow and difficult interactions. ZURC uses responsive grids, collapsible mobile navigation, scrollable administrative tables, single-column mobile forms, bounded dialogs, readable type scales, visible focus styling, loading/error/empty states, semantic dialog attributes, and ARIA live-region notifications. The target is practical WCAG-aligned behavior; a formal external accessibility certification has not yet been performed.

## 1.6 Existing platforms and comparative analysis

| Solution category         | Strengths                                                                                                                  | Limitations relative to ZURC's objective                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Static university website | Simple publishing and low operational complexity                                                                           | Weak relationships, limited search, no researcher self-service, frequent duplication        |
| Institutional repository  | Strong document preservation, metadata, and persistent outputs                                                             | Often less focused on projects, team profiles, news, and center-specific workflows          |
| Enterprise CRIS           | Broad reporting, integrations, governance, and institutional scale                                                         | Cost, configuration complexity, and excessive scope for a Master's demonstration            |
| Google Scholar/ORCID      | Researcher and publication discovery across institutions                                                                   | External ownership, incomplete local projects/events, limited local editorial control       |
| Generic CMS               | Flexible pages and news publishing                                                                                         | Research relationships and author ordering require custom modeling                          |
| General-purpose chatbot   | Natural interaction                                                                                                        | May hallucinate, lacks local provenance, may require paid APIs                              |
| **ZURC**                  | Integrated public portal, normalized research relationships, local administration, sourced assistant, no mandatory paid AI | Center-scale prototype; no external metadata synchronization or managed file repository yet |

## 1.7 Identified gap and contribution

Existing categories tend to optimize either institutional publishing, repository preservation, comprehensive research management, or conversational access. ZURC's contribution is a coherent center-scale platform that combines these concerns while remaining locally deployable and understandable as a Master's project. Its distinguishing characteristics are:

- explicit many-to-many research relationships;
- three role-specific experiences;
- public, filtered, global, and conversational discovery;
- backend-protected administration;
- optional local generation with deterministic fallback;
- source-linked AI responses;
- full responsive treatment of public and administrative interfaces;
- reproducible PostgreSQL migrations and seed data.

## 1.8 Chapter summary

The reviewed concepts justify a relational, API-driven, role-aware platform and a retrieval-first assistant. The following chapter converts these principles into concrete requirements and use cases.

---

# Chapter 2 — Requirements analysis and specification

## 2.1 Stakeholders and needs

| Stakeholder                | Main needs                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public visitor             | Understand the center, explore outputs, find expertise, view events/resources, ask questions, contact the center |
| Registered visitor         | Maintain a valid account and access authenticated navigation where authorized                                    |
| Researcher                 | Maintain the linked public profile, view assigned projects, update authored publications                         |
| Administrator              | Govern users, researchers, areas, projects, publications, editorial content, resources, and messages             |
| Research-center management | Obtain consistent statistics and communicate institutional activity                                              |
| Technical maintainer       | Reproduce environments, migrate/seed data, diagnose failures, and extend modular code                            |
| Thesis evaluator           | Verify completeness, security controls, data modeling, tests, and demonstrated behavior                          |

## 2.2 Roles and permission matrix

| Capability                                        | Visitor |      Researcher      |  Administrator   |
| ------------------------------------------------- | :-----: | :------------------: | :--------------: |
| Browse public pages                               |    ✓    |          ✓           |        ✓         |
| Search areas, researchers, projects, publications |    ✓    |          ✓           |        ✓         |
| Use research assistant                            |    ✓    |          ✓           |        ✓         |
| Submit contact message                            |    ✓    |          ✓           |        ✓         |
| Register and log in                               |    ✓    |          ✓           |        ✓         |
| Update own researcher profile                     |    —    |          ✓           | Administratively |
| View assigned projects                            |    —    |          ✓           |        ✓         |
| Update authored publications                      |    —    | ✓, ownership checked |        ✓         |
| Manage users and assign roles                     |    —    |          —           |        ✓         |
| Manage all research and editorial records         |    —    |          —           |        ✓         |
| Read and classify contact messages                |    —    |          —           |        ✓         |
| View administrative statistics                    |    —    |          —           |        ✓         |

Public visibility and frontend route guards are usability measures. Actual authorization is enforced by the Express API.

## 2.3 System context

```mermaid
flowchart LR
  V[Visitor] --> Z[ZURC web platform]
  R[Researcher] --> Z
  A[Administrator] --> Z
  Z --> P[(PostgreSQL)]
  Z -. optional generation .-> O[Local Ollama]
  Z --> E[External DOI, resource, and profile links]
  M[Research-center management] --> A
```

## 2.4 Functional requirements

| ID    | Requirement                                  | Priority | Acceptance evidence                                                                |
| ----- | -------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| FR-01 | Display a complete public homepage           | Must     | Hero, introduction, live statistics, featured research, events, AI section, footer |
| FR-02 | Browse research areas                        | Must     | Area list with descriptions, objectives, and counts                                |
| FR-03 | Browse researcher directory and profiles     | Must     | Paginated list and relationship-rich profile                                       |
| FR-04 | Browse projects and details                  | Must     | Search/status filter, team, areas, objectives, publications                        |
| FR-05 | Browse publications and details              | Must     | Filters, sorting, pagination, authors, DOI/venue/source                            |
| FR-06 | Browse events, news, and resources           | Must     | Only published content appears publicly                                            |
| FR-07 | Search across four research entity types     | Must     | Grouped publications, researchers, projects, and areas                             |
| FR-08 | Submit contact messages                      | Must     | Validated record stored with `NEW` status                                          |
| FR-09 | Register and authenticate                    | Must     | Account creation, hashed password, JWT, current-user endpoint                      |
| FR-10 | Enforce roles at backend                     | Must     | Unauthorized requests return 401/403                                               |
| FR-11 | Let researchers update their own profiles    | Must     | Linked profile update; other profiles unavailable                                  |
| FR-12 | Let researchers update authored publications | Must     | Author ownership verified before update                                            |
| FR-13 | Provide administrator overview               | Must     | Database-derived counts                                                            |
| FR-14 | Manage users                                 | Must     | List/create/edit, assign role, activate/deactivate, change password                |
| FR-15 | Manage research entities                     | Must     | Areas, researchers, projects, publications, authors, memberships                   |
| FR-16 | Manage editorial entities                    | Must     | Events, news, resources                                                            |
| FR-17 | Manage contact-message status                | Must     | View content; NEW/READ/REPLIED/ARCHIVED workflow                                   |
| FR-18 | Answer research questions from center data   | Must     | Retrieval and clickable source records                                             |
| FR-19 | Continue without Ollama                      | Must     | Deterministic fallback answer                                                      |
| FR-20 | Persist AI conversation history              | Should   | Conversations and user/assistant messages stored                                   |
| FR-21 | Provide operation feedback                   | Must     | Success/error toasts, inline validation, loading states                            |

## 2.5 Use cases

### Visitor use cases

```mermaid
flowchart LR
  V((Visitor)) --> B[Browse institutional content]
  V --> S[Search research]
  V --> D[Open record details]
  V --> AI[Ask research assistant]
  V --> C[Send contact message]
  V --> RG[Register]
  V --> LI[Log in]
```

### Authenticated use cases

```mermaid
flowchart TB
  R((Researcher)) --> RP[Update own profile]
  R --> MP[View participating projects]
  R --> UP[Update authored publications]
  A((Administrator)) --> U[Manage users]
  A --> RE[Manage researchers and areas]
  A --> PR[Manage projects and memberships]
  A --> PB[Manage publications and authors]
  A --> CO[Manage events, news, resources]
  A --> CM[Read and classify messages]
  A --> ST[View statistics]
```

### Detailed use case UC-01 — Register

| Item          | Description                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary actor | Visitor                                                                                                                                                                                          |
| Preconditions | Email is not already registered                                                                                                                                                                  |
| Main flow     | Enter identity/email/password → client checks required fields → API validates policy → password is hashed → VISITOR account is stored → JWT and user are returned → success notification appears |
| Alternatives  | Invalid field returns 422 and field messages; duplicate email returns 409; network failure explains backend connectivity                                                                         |
| Postcondition | Authenticated visitor account exists; plaintext password is never stored                                                                                                                         |

### Detailed use case UC-02 — Create a publication

| Item          | Description                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary actor | Administrator                                                                                                                                                                                  |
| Preconditions | Valid ADMIN JWT; at least one researcher exists                                                                                                                                                |
| Main flow     | Open Publications → Add record → enter metadata → select project/areas/authors → submit → Zod validates → Prisma creates publication and junction rows → table updates → success toast appears |
| Alternatives  | Missing author/short abstract/invalid URL produces field-level feedback; duplicate DOI/slug produces 409                                                                                       |
| Postcondition | Publication and ordered authorship relationships are stored atomically                                                                                                                         |

### Detailed use case UC-03 — Ask the assistant

| Item          | Description                                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary actor | Any visitor                                                                                                                                                                                        |
| Preconditions | API and PostgreSQL are available; Ollama is optional                                                                                                                                               |
| Main flow     | Submit question → extract meaningful terms → query four entity groups → build bounded sources → optionally generate with Ollama → persist conversation/messages → return answer, mode, and sources |
| Alternatives  | Greeting returns guidance; no match returns explicit absence; Ollama timeout triggers fallback; API error appears in chat and toast                                                                |
| Postcondition | Answer never relies on an ungrounded LLM call; conversation is recorded                                                                                                                            |

## 2.6 Non-functional requirements

| ID     | Category        | Requirement                                                                                                      |
| ------ | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Usability       | Consistent academic visual language, clear navigation, actionable validation, no routine browser `alert()`       |
| NFR-02 | Responsiveness  | Intentional layouts for ≥320 px mobile, tablet, and desktop without page-level horizontal overflow               |
| NFR-03 | Accessibility   | Semantic labels, keyboard controls, visible focus, dialog semantics, live toast announcements, adequate contrast |
| NFR-04 | Security        | bcrypt hashes, signed JWTs, backend RBAC, Zod validation, Helmet, controlled CORS, environment secrets           |
| NFR-05 | Integrity       | PKs, FKs, unique constraints, junction-table composite keys, transactions for relationship replacement           |
| NFR-06 | Maintainability | TypeScript, modular directories, reusable components, centralized API client and error handler                   |
| NFR-07 | Reliability     | Safe API errors; deterministic AI fallback; loading/error/empty UI states                                        |
| NFR-08 | Performance     | Pagination; bounded query limits; parallel independent database queries; indexed common fields                   |
| NFR-09 | Portability     | Dockerized PostgreSQL, environment configuration, documented local commands                                      |
| NFR-10 | Cost            | No mandatory paid AI API; local Ollama is optional                                                               |
| NFR-11 | Privacy         | AI context limited to records selected from the center database; secrets excluded from source control            |
| NFR-12 | Testability     | Repeatable build, lint, unit-test, migration, and seed commands                                                  |

Pools of 100 records in administrator lists and substring search are acceptable for the current demonstration dataset, but require pagination/full-text indexing for production-scale institutional use.

## 2.7 Business rules

1. Every user email is unique.
2. Public registration creates a `VISITOR`; elevation to `RESEARCHER` or `ADMIN` is administrative.
3. A user can own zero or one researcher profile; a researcher profile can optionally be unlinked.
4. Researcher email, slug, and optional ORCID are unique.
5. A researcher can belong to many areas and an area can contain many researchers.
6. A project can involve many researchers, and a researcher can participate in many projects; the membership can carry an optional project role.
7. A project can belong to many research areas.
8. A publication has one or more ordered authors; an author cannot occur twice in the same publication.
9. An author position is unique within one publication.
10. A publication belongs to zero or one project and may belong to many areas.
11. Only published events, news, and resources are exposed publicly.
12. Contact messages begin with `NEW` status.
13. Only an administrator can manage global records or message status.
14. A researcher may update a publication only if an authorship link exists.
15. Removing an optional user/project parent sets the relevant FK to null; dependent junction rows cascade.
16. AI responses must be based on retrieved center records, and absence of evidence must be stated.

## 2.8 Assumptions and constraints

- The center is a single organization; multi-tenancy is not implemented.
- English is the current interface language.
- External URLs host publication files and resources.
- SMTP/email delivery is not configured; message reply opens the administrator's email client.
- JWT is stored in browser local storage in the prototype. HttpOnly secure cookies are recommended for production.
- Ollama availability and model performance depend on local hardware.
- The seed uses demonstration DOI and external URLs; they are not real scholarly identifiers.

## 2.9 Chapter summary

The requirements establish ZURC as a research-information platform rather than a simple CRUD application. They also define measurable boundaries for the implemented prototype and future production work.

---

# Chapter 3 — Technological foundations and architecture

## 3.1 Technology selection criteria

Technologies were evaluated according to developer productivity, typing, ecosystem maturity, relational modeling, local reproducibility, security support, responsive UI capability, and absence of mandatory paid services.

## 3.2 Technology stack and versions

Versions below are derived from the project's package manifests and infrastructure files.

| Layer                | Technology            |                   Project version | Purpose                                       |
| -------------------- | --------------------- | --------------------------------: | --------------------------------------------- |
| Language             | TypeScript            |  client `~5.8.2`, server `^5.8.2` | Static typing across frontend/backend         |
| Frontend             | React                 |                         `^19.0.0` | Component and state model                     |
| Build tool           | Vite                  |                          `^6.2.0` | Development server and production bundling    |
| Routing              | React Router DOM      |                          `^7.3.0` | SPA routing and protected destinations        |
| Icons                | Lucide React          |                        `^0.468.0` | Consistent scalable iconography               |
| Styling              | Custom responsive CSS |                 Repository source | Design tokens, grids, components, breakpoints |
| Runtime              | Node.js               |                      20+ required | JavaScript/TypeScript server runtime          |
| API                  | Express               |                          `^5.0.1` | REST routing and middleware                   |
| Database             | PostgreSQL            | Docker image `postgres:16-alpine` | Relational persistence and constraints        |
| ORM                  | Prisma Client/CLI     |                          `^6.5.0` | Schema, migrations, typed data access         |
| Authentication       | jsonwebtoken          |                          `^9.0.2` | Signed access tokens                          |
| Password security    | bcryptjs              |                          `^3.0.2` | Salted password hashing, cost factor 12       |
| Validation           | Zod                   |                         `^3.24.2` | Runtime request and environment validation    |
| HTTP security        | Helmet                |                          `^8.0.0` | Security-related response headers             |
| Cross-origin policy  | cors                  |                          `^2.8.5` | Explicit browser-origin control               |
| Logging              | Morgan                |                         `^1.10.0` | Development/production HTTP logs              |
| AI runtime           | Ollama                |   Optional external local process | Local text generation                         |
| AI model             | `llama3.2:3b`         |                      Configurable | Default local generation model                |
| Testing              | Vitest                |                          `^3.0.8` | Frontend/backend unit tests                   |
| Quality              | ESLint                |                         `^9.22.0` | Static code-quality checks                    |
| Database environment | Docker Compose        |                Local installation | Reproducible PostgreSQL service               |

### 3.2.1 React and Vite

React supports reusable cards, forms, layouts, stateful search controls, authentication context, dialogs, and toast notifications. Vite provides a fast development cycle and optimized static build. The SPA approach makes transitions fluid and keeps API consumption explicit.

**Advantages:** reusable components, mature ecosystem, clear state-driven rendering, rapid Vite builds.  
**Trade-offs:** client-side rendering provides weaker default SEO than SSR; state and accessibility must be designed carefully. A future production portal may add prerendering or migrate public routes to an SSR-capable framework if SEO becomes critical.

### 3.2.2 TypeScript

TypeScript is used on both sides of the API. It detects incompatible component props, invalid route/service assumptions, and Prisma data-access mistakes during compilation.

**Advantages:** early error detection and maintainable interfaces.  
**Trade-offs:** runtime data remains untrusted, so TypeScript must be complemented by Zod.

### 3.2.3 Node.js and Express

Express exposes public, researcher, authentication, and administrator routers. Middleware provides JSON parsing, security headers, CORS, logging, optional authentication, required authentication, authorization, not-found handling, and centralized errors.

**Advantages:** small modular API surface and shared TypeScript ecosystem.  
**Trade-offs:** architectural discipline is required because Express does not impose layers automatically.

### 3.2.4 PostgreSQL

The domain is strongly relational: researchers participate in projects, author publications, and specialize in areas. PostgreSQL offers foreign keys, transactions, unique constraints, enum types, indexes, arrays, JSON, and mature querying.

**Advantages:** referential integrity and expressive relational queries.  
**Trade-offs:** schema changes require migrations; substring search will need enhanced indexing as data grows.

### 3.2.5 Prisma ORM

Prisma defines the physical data model, generates a typed client, manages migrations, and expresses nested relationship operations. Relationship replacement is enclosed in transactions for project, researcher, and publication updates.

**Advantages:** schema readability, generated types, migration workflow, nested relational queries.  
**Trade-offs:** complex SQL optimization may eventually require raw queries or dedicated search infrastructure.

### 3.2.6 JWT and bcrypt

Successful authentication returns a signed JWT containing the user ID, email, and role, with configurable expiry. bcrypt hashes passwords with cost factor 12. The server never returns password hashes.

**Advantages:** stateless API authorization and one-way password storage.  
**Trade-offs:** prototype local-storage tokens are exposed to successful XSS; production should use short-lived access tokens and rotated HttpOnly refresh cookies.

### 3.2.7 Zod

Zod validates login, registration, contact, user, researcher, area, project, publication, editorial content, chat, and environment data. Validation failures return HTTP 422 with a summary and per-field messages.

### 3.2.8 Custom responsive design system

The UI uses CSS variables for ink, teal, mint, cream, orange, academic blue, borders, and shadows. Reusable styles cover buttons, cards, grids, forms, tables, dialogs, toasts, loading/error/empty states, search, and the chatbot. Breakpoints restructure rather than simply shrink layouts.

### 3.2.9 Ollama

Ollama runs a language model locally and exposes an HTTP generation endpoint. In ZURC, it is an optional presentation layer after retrieval.

**Advantages:** no paid API requirement, local control, configurable model.  
**Trade-offs:** hardware-dependent latency and quality; an unavailable service must not break the application.

## 3.3 High-level architecture

ZURC is a modular monolith with separately built frontend and backend applications and one relational database.

```mermaid
flowchart LR
  subgraph Browser
    UI[React pages and components]
    AC[Authentication context]
    HC[Fetch hooks and API client]
    TS[Toast/error UI]
  end
  subgraph Express_API[Node.js + Express REST API]
    MW[Helmet, CORS, JSON, logging]
    AU[JWT authentication and RBAC]
    RT[Public/Auth/Researcher/Admin routes]
    VA[Zod validation]
    SV[Domain/search/AI services]
    EH[Central error handler]
  end
  subgraph Persistence
    PR[Prisma ORM]
    DB[(PostgreSQL 16)]
  end
  OL[Optional local Ollama]
  UI --> HC
  AC --> HC
  HC -->|JSON + optional Bearer JWT| MW
  MW --> AU --> RT --> VA --> SV --> PR --> DB
  SV -. 6-second bounded request .-> OL
  EH --> HC --> TS
```

## 3.4 Module organization

### Frontend

```text
client/src/
├── auth/          Authentication context and session state
├── components/    Cards, editor, reusable UI, toast system
├── hooks/         Shared data-fetching hook
├── layouts/       Public navigation/footer shell
├── pages/         Public, auth, assistant, researcher, admin screens
├── services/      Central REST client and typed API errors
├── App.tsx        Route declaration
├── main.tsx       Providers and application bootstrap
├── styles.css     Responsive design system
└── types.ts       Shared frontend domain types
```

### Backend

```text
server/src/
├── config/        Environment parsing and Prisma client
├── controllers/   Public catalogue/detail queries
├── middleware/    Authentication, authorization, safe errors
├── routes/        Auth, public, researcher, and admin endpoints
├── services/      Authentication, search, and AI orchestration
├── types/         Express request augmentation
├── utils/         HTTP errors, async wrapper, slugs, pagination
├── validation/    Zod schemas
├── app.ts         Middleware and router composition
└── index.ts       HTTP server startup
```

## 3.5 Authentication and authorization workflow

```mermaid
sequenceDiagram
  actor U as User
  participant C as React client
  participant A as Express API
  participant V as Zod
  participant D as PostgreSQL
  U->>C: Submit email and password
  C->>A: POST /api/auth/login
  A->>V: Validate request
  A->>D: Find normalized email
  D-->>A: User + password hash
  A->>A: bcrypt.compare()
  A-->>C: JWT + safe user object
  C->>C: Store token and auth state
  C->>A: Protected request + Bearer JWT
  A->>A: Verify signature/expiry
  A->>A: Check required role
  alt authorized
    A->>D: Perform operation
    A-->>C: Result
  else unauthorized
    A-->>C: 401 or 403 safe error
  end
```

Public registration always assigns the `VISITOR` role in the service, regardless of client input. This prevents self-registration as administrator. Administrator endpoints apply `authenticate` followed by `authorize("ADMIN")`. Researcher endpoints allow `RESEARCHER` and `ADMIN`, with an additional ownership query for publication updates.

## 3.6 Search architecture

```mermaid
flowchart TD
  Q[User query or filters] --> N[Normalize URL parameters]
  N --> K{Search mode}
  K -->|Catalogue| F[Build entity-specific Prisma where clause]
  K -->|Global| G[Run four searches in parallel]
  F --> DB[(PostgreSQL)]
  G --> DB
  DB --> R[Load related authors, areas, projects, researchers]
  R --> P[Sort and paginate]
  P --> J[JSON results + metadata]
  J --> UI[Cards, filters, empty/error states]
```

Publication query parameters are `q`, `author`, `area`, `year`, `type`, `sort`, `page`, and `limit`. The API bounds `limit` to 24 and defaults list pages to 9 records. Global search queries publications, researchers, projects, and research areas concurrently and bounds each group.

## 3.7 AI retrieval and fallback architecture

```mermaid
sequenceDiagram
  actor U as Visitor
  participant C as Chat UI
  participant A as AI service
  participant S as Search service
  participant D as PostgreSQL
  participant O as Ollama
  U->>C: Ask a research question
  C->>A: question + sessionId
  A->>A: Detect greeting / extract up to 5 terms
  A->>S: Search normalized query
  S->>D: Query 4 entity types
  D-->>S: Matching records + relations
  S-->>A: Bounded evidence
  alt Evidence exists and Ollama responds in 6 seconds
    A->>O: Question + database-only context
    O-->>A: Natural-language answer
    A->>A: mode = ollama
  else Ollama unavailable or no generated response
    A->>A: Build deterministic result summary
    A->>A: mode = fallback
  end
  A->>D: Persist user and assistant messages + sources
  A-->>C: Answer + up to 8 sources + mode
```

### Anti-hallucination controls

- Retrieval happens before generation.
- Ollama is called only when sources exist.
- The prompt says to use only supplied context and cite record titles.
- Context contains selected fields, not unrestricted database access.
- A six-second timeout prevents the UI from waiting indefinitely.
- Sources are returned independently of generated text.
- No-match responses explicitly acknowledge absence.
- Fallback output is deterministic and does not call an LLM.

This is a lightweight retrieval-grounded approach. It does not currently use embeddings, a vector store, reranking, semantic chunking, or automated claim-to-source verification; these limitations must be stated rather than presenting it as a full production RAG pipeline.

## 3.8 Error-handling architecture

1. HTML constraints provide immediate required/length checks.
2. Zod revalidates untrusted API input.
3. The server converts validation problems to HTTP 422 with field messages.
4. Prisma duplicate/not-found/relation errors map to 409/404/409.
5. Internal errors return a generic 500 message without stack/database details.
6. The frontend API client distinguishes HTTP, validation, authentication, and network failures.
7. Forms display inline messages and accessible success/error toasts.
8. Data pages display loading, empty, and error states.
9. A 401 response clears an expired local session.

Example validation response:

```json
{
  "message": "Password: At least one uppercase letter is required",
  "errors": {
    "password": ["At least one uppercase letter is required"]
  }
}
```

## 3.9 Deployment architecture

```mermaid
flowchart LR
  B[Browser] -->|HTTPS in production| W[Static frontend host]
  B -->|HTTPS /api| A[Node/Express process]
  A --> P[(PostgreSQL)]
  A -. local/private network .-> O[Ollama]
  BK[Backup job] --> P
  L[Central logs/monitoring] <-- A
```

The repository currently Dockerizes PostgreSQL only. Frontend and backend run through npm scripts. A production deployment should add HTTPS termination, process supervision, database backups, rate limiting, centralized logs, health monitoring, and separate secrets.

## 3.10 Chapter summary

The selected stack supports a locally reproducible, modular research platform. The architecture separates UI, API policy, domain queries, persistence, and optional AI generation while keeping deployment understandable.

---

# Chapter 4 — Data analysis and database design

## 4.1 Modeling approach

The authoritative physical model is `server/prisma/schema.prisma`. The design uses CUID string identifiers, PostgreSQL enums, foreign keys, unique constraints, composite keys for junction tables, timestamps, and explicit referential actions. This chapter distinguishes three modeling levels:

- **CDM:** business entities and cardinalities, independent of implementation types.
- **LDM:** relational entities, primary keys, foreign keys, and resolved many-to-many associations.
- **Physical model:** actual Prisma/PostgreSQL fields, types, defaults, indexes, and deletion rules.

## 4.2 Conceptual Data Model (CDM)

```mermaid
erDiagram
  USER o|--o| RESEARCHER : "may own profile"
  USER ||--o{ AI_CONVERSATION : "starts"
  RESEARCHER }o--o{ RESEARCH_AREA : "specializes in"
  RESEARCHER }o--o{ PROJECT : "participates in"
  RESEARCHER }o--|{ PUBLICATION : "authors"
  RESEARCH_AREA }o--o{ PROJECT : "classifies"
  RESEARCH_AREA }o--o{ PUBLICATION : "classifies"
  PROJECT o|--o{ PUBLICATION : "produces"
  AI_CONVERSATION ||--|{ AI_MESSAGE : "contains"
```

`EVENT`, `NEWS`, `RESOURCE`, and `CONTACT_MESSAGE` are independent institutional-content entities in the current scope. They do not require a creator FK because editorial authorship/audit history has not yet been modeled.

### Conceptual entities

- **User:** authenticated identity, status, and role.
- **Researcher:** public academic identity that may be linked to a user.
- **Research Area:** thematic classification and objectives.
- **Project:** funded or institutional research activity.
- **Publication:** scholarly output with ordered authorship.
- **Event/News/Resource:** public institutional content.
- **Contact Message:** inbound communication and handling status.
- **AI Conversation/Message:** assistant history and evidence metadata.

## 4.3 Logical Data Model (LDM)

```mermaid
erDiagram
  USER {
    string id PK
    string email UK
    string passwordHash
    enum role
    boolean active
  }
  RESEARCHER {
    string id PK
    string userId FK,UK
    string slug UK
    string email UK
    string orcid UK
  }
  RESEARCH_AREA {
    string id PK
    string name UK
    string slug UK
  }
  RESEARCHER_AREA {
    string researcherId PK,FK
    string areaId PK,FK
  }
  PROJECT {
    string id PK
    string slug UK
    enum status
  }
  PROJECT_AREA {
    string projectId PK,FK
    string areaId PK,FK
  }
  PROJECT_RESEARCHER {
    string projectId PK,FK
    string researcherId PK,FK
    string role
  }
  PUBLICATION {
    string id PK
    string projectId FK
    string slug UK
    string doi UK
    enum type
  }
  PUBLICATION_AUTHOR {
    string publicationId PK,FK
    string researcherId PK,FK
    int authorOrder UK
    boolean corresponding
  }
  PUBLICATION_AREA {
    string publicationId PK,FK
    string areaId PK,FK
  }
  AI_CONVERSATION {
    string id PK
    string userId FK
    string sessionId
  }
  AI_MESSAGE {
    string id PK
    string conversationId FK
    enum role
  }
  USER o|--o| RESEARCHER : owns
  USER ||--o{ AI_CONVERSATION : starts
  RESEARCHER ||--o{ RESEARCHER_AREA : has
  RESEARCH_AREA ||--o{ RESEARCHER_AREA : includes
  PROJECT ||--o{ PROJECT_AREA : has
  RESEARCH_AREA ||--o{ PROJECT_AREA : includes
  PROJECT ||--o{ PROJECT_RESEARCHER : has
  RESEARCHER ||--o{ PROJECT_RESEARCHER : joins
  PROJECT o|--o{ PUBLICATION : produces
  PUBLICATION ||--|{ PUBLICATION_AUTHOR : has
  RESEARCHER ||--o{ PUBLICATION_AUTHOR : writes
  PUBLICATION ||--o{ PUBLICATION_AREA : has
  RESEARCH_AREA ||--o{ PUBLICATION_AREA : includes
  AI_CONVERSATION ||--o{ AI_MESSAGE : contains
```

Logical relation notation:

```text
USER(#id, email[UQ], passwordHash, firstName, lastName, role, active, createdAt, updatedAt)
RESEARCHER(#id, userId[FK→USER.id,UQ,NULL], name, slug[UQ], biography, position,
           email[UQ], photoUrl, affiliation, orcid[UQ,NULL], linkedInUrl,
           scholarUrl, interests, active, createdAt, updatedAt)
RESEARCH_AREA(#id, name[UQ], slug[UQ], description, icon, imageUrl,
              objectives, createdAt, updatedAt)
RESEARCHER_AREA(#researcherId[FK→RESEARCHER.id], #areaId[FK→RESEARCH_AREA.id])
PROJECT(#id, title, slug[UQ], description, abstract, objectives, startDate,
        endDate, status, funding, featured, createdAt, updatedAt)
PROJECT_AREA(#projectId[FK→PROJECT.id], #areaId[FK→RESEARCH_AREA.id])
PROJECT_RESEARCHER(#projectId[FK→PROJECT.id], #researcherId[FK→RESEARCHER.id], role)
PUBLICATION(#id, title, slug[UQ], abstract, publicationDate, doi[UQ,NULL], venue,
            keywords, type, pdfUrl, externalUrl, featured,
            projectId[FK→PROJECT.id,NULL], createdAt, updatedAt)
PUBLICATION_AUTHOR(#publicationId[FK→PUBLICATION.id],
                   #researcherId[FK→RESEARCHER.id], authorOrder, corresponding,
                   UQ(publicationId, authorOrder))
PUBLICATION_AREA(#publicationId[FK→PUBLICATION.id], #areaId[FK→RESEARCH_AREA.id])
EVENT(#id, title, slug[UQ], description, startDate, endDate, location,
      imageUrl, registrationUrl, published, createdAt, updatedAt)
NEWS(#id, title, slug[UQ], excerpt, content, imageUrl, publishedAt,
     published, createdAt, updatedAt)
RESOURCE(#id, title, description, type, url, published, createdAt, updatedAt)
CONTACT_MESSAGE(#id, name, email, subject, message, status, createdAt, updatedAt)
AI_CONVERSATION(#id, userId[FK→USER.id,NULL], sessionId, title, createdAt, updatedAt)
AI_MESSAGE(#id, conversationId[FK→AI_CONVERSATION.id], role, content,
           sources[JSON,NULL], createdAt)
```

## 4.4 Physical ERD

```mermaid
erDiagram
  User ||--o| Researcher : "userId / SET NULL"
  User ||--o{ AiConversation : "userId / SET NULL"
  Researcher ||--o{ ResearcherArea : "CASCADE"
  ResearchArea ||--o{ ResearcherArea : "CASCADE"
  Project ||--o{ ProjectArea : "CASCADE"
  ResearchArea ||--o{ ProjectArea : "CASCADE"
  Project ||--o{ ProjectResearcher : "CASCADE"
  Researcher ||--o{ ProjectResearcher : "CASCADE"
  Project o|--o{ Publication : "projectId / SET NULL"
  Publication ||--o{ PublicationAuthor : "CASCADE"
  Researcher ||--o{ PublicationAuthor : "CASCADE"
  Publication ||--o{ PublicationArea : "CASCADE"
  ResearchArea ||--o{ PublicationArea : "CASCADE"
  AiConversation ||--o{ AiMessage : "CASCADE"
```

The detailed field-level physical model is captured in the data dictionary below and must remain synchronized with the Prisma schema.

## 4.5 Enumerated domains

| Enum              | Allowed values                                                                       | Meaning                         |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------- |
| `Role`            | `VISITOR`, `RESEARCHER`, `ADMIN`                                                     | Application authorization level |
| `ProjectStatus`   | `PLANNED`, `ACTIVE`, `COMPLETED`, `SUSPENDED`                                        | Project lifecycle               |
| `PublicationType` | `JOURNAL_ARTICLE`, `CONFERENCE_PAPER`, `BOOK_CHAPTER`, `THESIS`, `REPORT`, `DATASET` | Scholarly-output category       |
| `ResourceType`    | `DOCUMENT`, `DATASET`, `SOFTWARE`, `LINK`                                            | Public-resource category        |
| `MessageStatus`   | `NEW`, `READ`, `REPLIED`, `ARCHIVED`                                                 | Contact processing workflow     |
| `AiRole`          | `USER`, `ASSISTANT`                                                                  | Conversation-message speaker    |

## 4.6 Complete data dictionary

Notation: **PK** primary key, **FK** foreign key, **UQ** unique, **NN** required/not null, **NULL** optional.

### Table 7 — `User`

| Field          | PostgreSQL/Prisma type | Constraints/default                | Description                                                           |
| -------------- | ---------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `id`           | `text` / `String`      | PK, CUID                           | Internal user identifier                                              |
| `email`        | `text` / `String`      | NN, UQ                             | Lowercase login email                                                 |
| `passwordHash` | `text` / `String`      | NN                                 | bcrypt hash; never returned publicly                                  |
| `firstName`    | `text` / `String`      | NN                                 | Given name                                                            |
| `lastName`     | `text` / `String`      | NN                                 | Family name                                                           |
| `role`         | `Role`                 | NN, default `RESEARCHER` in schema | Authorization role; registration service explicitly assigns `VISITOR` |
| `active`       | `boolean`              | NN, default `true`                 | Account activation state                                              |
| `createdAt`    | `timestamp(3)`         | NN, default current time           | Creation audit timestamp                                              |
| `updatedAt`    | `timestamp(3)`         | NN, auto-updated                   | Last modification timestamp                                           |

Indexes: unique email; composite `(role, active)`.

### Table 8 — `Researcher`

| Field         | Type           | Constraints/default              | Description                          |
| ------------- | -------------- | -------------------------------- | ------------------------------------ |
| `id`          | `text`         | PK, CUID                         | Researcher identifier                |
| `userId`      | `text`         | FK→`User.id`, UQ, NULL, SET NULL | Optional authenticated account link  |
| `name`        | `text`         | NN, indexed                      | Display name                         |
| `slug`        | `text`         | NN, UQ                           | Human-readable route identifier      |
| `biography`   | `text`         | NN                               | Long academic biography              |
| `position`    | `text`         | NN                               | Academic/professional position       |
| `email`       | `text`         | NN, UQ                           | Public/professional email            |
| `photoUrl`    | `text`         | NULL                             | Profile-photo URL                    |
| `affiliation` | `text`         | NN                               | Faculty, department, or laboratory   |
| `orcid`       | `text`         | UQ, NULL                         | ORCID identifier                     |
| `linkedInUrl` | `text`         | NULL                             | LinkedIn profile URL                 |
| `scholarUrl`  | `text`         | NULL                             | Google Scholar profile URL           |
| `interests`   | `text[]`       | NN                               | Searchable research-interest phrases |
| `active`      | `boolean`      | default `true`                   | Public visibility/activity state     |
| `createdAt`   | `timestamp(3)` | default current time             | Creation timestamp                   |
| `updatedAt`   | `timestamp(3)` | auto-updated                     | Modification timestamp               |

### Table 9 — `ResearchArea`

| Field         | Type           | Constraints/default  | Description                   |
| ------------- | -------------- | -------------------- | ----------------------------- |
| `id`          | `text`         | PK, CUID             | Area identifier               |
| `name`        | `text`         | NN, UQ               | Area name                     |
| `slug`        | `text`         | NN, UQ               | URL identifier                |
| `description` | `text`         | NN                   | Public description            |
| `icon`        | `text`         | NN                   | Icon key used by UI           |
| `imageUrl`    | `text`         | NULL                 | Optional representative image |
| `objectives`  | `text[]`       | NN                   | Research objectives           |
| `createdAt`   | `timestamp(3)` | default current time | Creation timestamp            |
| `updatedAt`   | `timestamp(3)` | auto-updated         | Modification timestamp        |

### Table 10 — `ResearcherArea`

| Field          | Type   | Constraints                                 | Description |
| -------------- | ------ | ------------------------------------------- | ----------- |
| `researcherId` | `text` | PK component, FK→`Researcher.id`, CASCADE   | Researcher  |
| `areaId`       | `text` | PK component, FK→`ResearchArea.id`, CASCADE | Area        |

Composite PK `(researcherId, areaId)` prevents duplicate assignment.

### Table 11 — `Project`

| Field         | Type            | Constraints/default  | Description                         |
| ------------- | --------------- | -------------------- | ----------------------------------- |
| `id`          | `text`          | PK, CUID             | Project identifier                  |
| `title`       | `text`          | NN, indexed          | Project title                       |
| `slug`        | `text`          | NN, UQ               | Route identifier                    |
| `description` | `text`          | NN                   | Short public description            |
| `abstract`    | `text`          | NN                   | Extended overview                   |
| `objectives`  | `text[]`        | NN                   | Project objectives                  |
| `startDate`   | `timestamp(3)`  | NN                   | Start date                          |
| `endDate`     | `timestamp(3)`  | NULL                 | End date for bounded/completed work |
| `status`      | `ProjectStatus` | default `PLANNED`    | Lifecycle state                     |
| `funding`     | `text`          | NULL                 | Funding organization/details        |
| `featured`    | `boolean`       | default `false`      | Homepage selection flag             |
| `createdAt`   | `timestamp(3)`  | default current time | Creation timestamp                  |
| `updatedAt`   | `timestamp(3)`  | auto-updated         | Modification timestamp              |

Indexes: composite `(status, startDate)` and separate `(title)`.

### Table 12 — `ProjectArea`

| Field       | Type   | Constraints                                 | Description |
| ----------- | ------ | ------------------------------------------- | ----------- |
| `projectId` | `text` | PK component, FK→`Project.id`, CASCADE      | Project     |
| `areaId`    | `text` | PK component, FK→`ResearchArea.id`, CASCADE | Area        |

### Table 13 — `ProjectResearcher`

| Field          | Type   | Constraints                               | Description                                         |
| -------------- | ------ | ----------------------------------------- | --------------------------------------------------- |
| `projectId`    | `text` | PK component, FK→`Project.id`, CASCADE    | Project                                             |
| `researcherId` | `text` | PK component, FK→`Researcher.id`, CASCADE | Participant                                         |
| `role`         | `text` | NULL                                      | Project responsibility, e.g. Principal Investigator |

The optional `role` belongs to the participation relationship, not to either parent entity.

### Table 14 — `Publication`

| Field             | Type              | Constraints/default             | Description                |
| ----------------- | ----------------- | ------------------------------- | -------------------------- |
| `id`              | `text`            | PK, CUID                        | Publication identifier     |
| `title`           | `text`            | NN, indexed                     | Publication title          |
| `slug`            | `text`            | NN, UQ                          | Route identifier           |
| `abstract`        | `text`            | NN                              | Publication abstract       |
| `publicationDate` | `timestamp(3)`    | NN, indexed                     | Publication date           |
| `doi`             | `text`            | UQ, NULL                        | Digital Object Identifier  |
| `venue`           | `text`            | NN                              | Journal or conference      |
| `keywords`        | `text[]`          | NN                              | Search/filter keywords     |
| `type`            | `PublicationType` | NN, indexed                     | Output type                |
| `pdfUrl`          | `text`            | NULL                            | PDF URL                    |
| `externalUrl`     | `text`            | NULL                            | DOI or publisher URL       |
| `featured`        | `boolean`         | default `false`                 | Featured-output flag       |
| `projectId`       | `text`            | FK→`Project.id`, NULL, SET NULL | Optional producing project |
| `createdAt`       | `timestamp(3)`    | default current time            | Creation timestamp         |
| `updatedAt`       | `timestamp(3)`    | auto-updated                    | Modification timestamp     |

### Table 15 — `PublicationAuthor`

| Field           | Type      | Constraints/default                        | Description                       |
| --------------- | --------- | ------------------------------------------ | --------------------------------- |
| `publicationId` | `text`    | PK component, FK→`Publication.id`, CASCADE | Publication                       |
| `researcherId`  | `text`    | PK component, FK→`Researcher.id`, CASCADE  | Author                            |
| `authorOrder`   | `integer` | NN, UQ with publication                    | Zero-based displayed author order |
| `corresponding` | `boolean` | default `false`                            | Corresponding-author indicator    |

Composite PK prevents duplicate authors; unique `(publicationId, authorOrder)` prevents two authors occupying one position.

### Table 16 — `PublicationArea`

| Field           | Type   | Constraints                                 | Description |
| --------------- | ------ | ------------------------------------------- | ----------- |
| `publicationId` | `text` | PK component, FK→`Publication.id`, CASCADE  | Publication |
| `areaId`        | `text` | PK component, FK→`ResearchArea.id`, CASCADE | Area        |

### Table 17 — `Event`

| Field             | Type           | Constraints/default  | Description                 |
| ----------------- | -------------- | -------------------- | --------------------------- |
| `id`              | `text`         | PK, CUID             | Event identifier            |
| `title`           | `text`         | NN                   | Event title                 |
| `slug`            | `text`         | NN, UQ               | Route identifier            |
| `description`     | `text`         | NN                   | Event description           |
| `startDate`       | `timestamp(3)` | NN                   | Start date/time             |
| `endDate`         | `timestamp(3)` | NULL                 | Optional end date/time      |
| `location`        | `text`         | NN                   | Physical or online location |
| `imageUrl`        | `text`         | NULL                 | Optional image URL          |
| `registrationUrl` | `text`         | NULL                 | Optional registration URL   |
| `published`       | `boolean`      | default `true`       | Public visibility           |
| `createdAt`       | `timestamp(3)` | default current time | Creation timestamp          |
| `updatedAt`       | `timestamp(3)` | auto-updated         | Modification timestamp      |

Index: `(startDate, published)`.

### Table 18 — `News`

| Field         | Type           | Constraints/default  | Description            |
| ------------- | -------------- | -------------------- | ---------------------- |
| `id`          | `text`         | PK, CUID             | News identifier        |
| `title`       | `text`         | NN                   | Headline               |
| `slug`        | `text`         | NN, UQ               | Route identifier       |
| `excerpt`     | `text`         | NN                   | Card summary           |
| `content`     | `text`         | NN                   | Full article content   |
| `imageUrl`    | `text`         | NULL                 | Optional image         |
| `publishedAt` | `timestamp(3)` | NULL                 | Publication date       |
| `published`   | `boolean`      | default `false`      | Visibility state       |
| `createdAt`   | `timestamp(3)` | default current time | Creation timestamp     |
| `updatedAt`   | `timestamp(3)` | auto-updated         | Modification timestamp |

Index: `(published, publishedAt)`.

### Table 19 — `Resource`

| Field         | Type           | Constraints/default  | Description                    |
| ------------- | -------------- | -------------------- | ------------------------------ |
| `id`          | `text`         | PK, CUID             | Resource identifier            |
| `title`       | `text`         | NN                   | Resource title                 |
| `description` | `text`         | NN                   | Resource summary               |
| `type`        | `ResourceType` | NN                   | Document/dataset/software/link |
| `url`         | `text`         | NN                   | External access URL            |
| `published`   | `boolean`      | default `true`       | Public visibility              |
| `createdAt`   | `timestamp(3)` | default current time | Creation timestamp             |
| `updatedAt`   | `timestamp(3)` | auto-updated         | Modification timestamp         |

### Table 20 — `ContactMessage`

| Field       | Type            | Constraints/default  | Description             |
| ----------- | --------------- | -------------------- | ----------------------- |
| `id`        | `text`          | PK, CUID             | Message identifier      |
| `name`      | `text`          | NN                   | Sender name             |
| `email`     | `text`          | NN                   | Sender email            |
| `subject`   | `text`          | NN                   | Message subject         |
| `message`   | `text`          | NN                   | Full message body       |
| `status`    | `MessageStatus` | default `NEW`        | Handling state          |
| `createdAt` | `timestamp(3)`  | default current time | Submission timestamp    |
| `updatedAt` | `timestamp(3)`  | auto-updated         | Last status/update time |

Index: `(status, createdAt)`.

### Table 21 — `AiConversation`

| Field       | Type           | Constraints/default          | Description                                                            |
| ----------- | -------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `id`        | `text`         | PK, CUID                     | Conversation identifier; current service may use supplied session UUID |
| `userId`    | `text`         | FK→`User.id`, NULL, SET NULL | Optional authenticated participant                                     |
| `sessionId` | `text`         | NN, indexed                  | Browser conversation session                                           |
| `title`     | `text`         | NULL                         | Optional future conversation title                                     |
| `createdAt` | `timestamp(3)` | default current time         | Creation timestamp                                                     |
| `updatedAt` | `timestamp(3)` | auto-updated                 | Modification timestamp                                                 |

### Table 22 — `AiMessage`

| Field            | Type           | Constraints/default                 | Description                                       |
| ---------------- | -------------- | ----------------------------------- | ------------------------------------------------- |
| `id`             | `text`         | PK, CUID                            | Message identifier                                |
| `conversationId` | `text`         | FK→`AiConversation.id`, NN, CASCADE | Parent conversation                               |
| `role`           | `AiRole`       | NN                                  | User or assistant                                 |
| `content`        | `text`         | NN                                  | Message text                                      |
| `sources`        | `jsonb`        | NULL                                | Snapshot of source identifiers/titles/types/slugs |
| `createdAt`      | `timestamp(3)` | default current time                | Message timestamp                                 |

Index: `(conversationId, createdAt)`.

## 4.7 Referential actions

### Table 23 — Referential-action summary

| Relationship                | On parent deletion | Rationale                                                              |
| --------------------------- | ------------------ | ---------------------------------------------------------------------- |
| User→Researcher             | SET NULL           | Preserve public researcher record if login account is removed/unlinked |
| User→AiConversation         | SET NULL           | Preserve anonymous historical conversation structure                   |
| Project→Publication         | SET NULL           | Preserve publication even if project is removed                        |
| Junction-table parent links | CASCADE            | Relationship row has no meaning without either parent                  |
| AiConversation→AiMessage    | CASCADE            | Messages belong exclusively to conversation                            |

At application level, user deletion is not offered; administrators deactivate users. This is safer for auditability.

## 4.8 Normalization analysis

### First normal form

Identity and relationship data are not stored as comma-separated identifiers. Every many-to-many relationship uses a junction table. PostgreSQL arrays are used only for lightweight multi-valued text (`interests`, `objectives`, `keywords`). This is a pragmatic physical choice, but under the strictest interpretation of 1NF these arrays are non-atomic. If individual interest/objective/keyword governance, synonyms, translations, or referential links become necessary, they should be migrated to dedicated tables.

### Second normal form

Junction-table attributes depend on their complete composite keys. For example, `ProjectResearcher.role` describes one researcher in one project, while `PublicationAuthor.authorOrder` describes one author in one publication.

### Third normal form

Core entity attributes depend on their entity key and not on other non-key attributes. Research-area descriptions are not duplicated into projects/publications; author identity is not duplicated into publications; user identity and academic profile are separated because they serve different lifecycles.

### Integrity strengths

- Composite PKs prevent duplicate memberships.
- Unique slugs protect routes.
- Unique DOI and ORCID fields protect identifiers when supplied.
- Enums prevent invalid lifecycle/status values.
- Transactions protect relationship replacement.
- Referential actions define deletion behavior explicitly.

### Recommended model improvements

1. Normalize keywords/interests/objectives if they become managed concepts.
2. Add `createdBy`/`updatedBy` audit FKs to editorial and research entities.
3. Add optimistic-lock version fields for concurrent editing.
4. Consider a unique constraint on `AiConversation.sessionId`; the current service upserts by `id`, while only an index exists on `sessionId`.
5. Add database check constraints for end date ≥ start date.
6. Add full-text generated columns/indexes or `pg_trgm` for larger datasets.
7. Introduce soft deletion for research records where historical preservation is required.

## 4.9 Seed dataset

The repeatable seed clears dependent tables in safe order and creates:

- 8 users across administrator, researcher, visitor, and inactive-account cases;
- 8 research areas;
- 12 researcher profiles, including four profiles linked to user accounts;
- 10 projects covering planned, active, completed, and suspended states;
- 30 publications with ordered authors, areas, DOI values, project links, multiple years, and all publication types;
- 8 future events;
- 8 news records, including one unpublished draft;
- 8 resources, including one unpublished administrative record;
- 5 contact messages covering all message-workflow statuses.

The dataset is intentionally interconnected to demonstrate counts, pagination, filters, detail pages, relationship management, and assistant retrieval. Running the seed is destructive to existing data and is intended for demonstration/development databases.

## 4.10 Chapter summary

The model resolves core research relationships explicitly and provides strong database-level integrity. Its documented array trade-off and identified future constraints make the analysis more accurate than a blanket normalization claim.

---

# Chapter 5 — Platform implementation

## 5.1 Public homepage

The homepage introduces ZURC through an academic hero section and directs visitors toward research exploration and the AI assistant. Statistics are loaded from PostgreSQL. Featured projects, recent publications, selected researchers, upcoming events, latest news, and the assistant section create multiple discovery paths.

**Screenshot instruction:** capture one 1440 px desktop view and one 390 px mobile view. Demonstrate the orange AI call-to-action, blue search treatment, responsive navigation, and absence of horizontal overflow.

## 5.2 About page

The About page communicates mission, open-science orientation, excellence, and collaboration. It uses an editorial layout rather than a generic card-only presentation. On small screens, the columns stack in reading order.

## 5.3 Research areas

Each area contains a name, description, icon/image, and objective list. Area records connect to researchers, projects, and publications through junction tables. Public list queries include relationship counts, demonstrating institutional activity within each theme.

## 5.4 Researchers and profiles

The directory supports keyword search and pagination. Public researcher profiles display identity, position, affiliation, biography, interests, areas, projects, and publications. Contact uses a mail link; optional ORCID, LinkedIn, Scholar, and photo fields exist in the model.

## 5.5 Projects

Project cards summarize title, description, status, and areas. Catalogue controls support text and status filtering. A detail page displays overview, objectives, dates, funding, team membership, research areas, and related publications.

## 5.6 Publication library

Publication search supports:

- title/abstract/keyword query;
- author;
- research area;
- publication year;
- publication type;
- newest/oldest sorting;
- pagination.

The detail page presents type, title, ordered authors, abstract, keywords, publication date, venue, DOI, and external source. Author order is loaded from `PublicationAuthor.authorOrder` rather than inferred.

## 5.7 Events, news, and resources

Public endpoints return only records whose `published` flag is true. Events show date/location information; news cards provide excerpts and dates; resources distinguish documents, datasets, software, and links. Administrators can maintain all three categories.

## 5.8 Global search

One search request returns grouped results across publications, researchers, projects, and areas. The page maintains clear loading, empty, and error states. Academic blue distinguishes search from orange AI actions.

## 5.9 AI research assistant

The chat begins with usage guidance. Suggested prompts demonstrate supported intents. Each request carries a persistent browser session ID. Assistant messages include source cards and identify whether the answer used Ollama or deterministic search mode. A greeting is handled directly, avoiding unnecessary model work.

Recommended demonstrations:

1. “Who works on cybersecurity?”
2. “Find publications about smart cities.”
3. “Which projects are active?”
4. “Who published papers about machine learning?”
5. A query with no database match.
6. The same relevant query with Ollama running and stopped.

## 5.10 Contact and message processing

The contact form validates name, email, subject, and message length. Submission stores a `ContactMessage` with `NEW` status and displays success/error feedback. In administration, the message detail shows sender, email, subject, body, and status. `Reply by email` opens the local mail client; ZURC itself does not claim to send mail. The administrator records progress as `NEW`, `READ`, `REPLIED`, or `ARCHIVED`.

## 5.11 Authentication interfaces

Registration provides live password requirements and field-specific server errors. The enforced policy is at least eight characters, one uppercase letter, and one number. Duplicate email produces conflict feedback. Login intentionally uses a generic incorrect-email-or-password message to reduce account enumeration. Successful authentication shows a toast and redirects to the public portal.

## 5.12 Researcher workspace

The workspace loads the JWT-linked researcher profile. Researchers can update position, affiliation, biography, and interests, view assigned projects, and edit selected metadata on authored publications. The backend verifies authorship before publication update. Empty and failure states prevent indefinite spinners.

## 5.13 Administrator dashboard

The administrator shell has a dedicated responsive sidebar and overview. Modules include users, researchers, research areas, projects, publications, events, news, resources, and messages. Data tables provide record, details, status, and actions. Dialogs use fixed headers/action bars, scrollable content, responsive columns, keyboard Escape support, background scroll lock, inline errors, and toasts.

### User management

- list accounts;
- create account;
- edit name/email;
- assign role;
- activate/deactivate;
- create/change password subject to the password policy.

### Research relationship management

- assign researcher areas;
- assign project areas and team members;
- assign publication project, areas, and ordered authors;
- use database transactions when replacing relationship sets.

### Deletion behavior

Users are deactivated rather than deleted through the interface. Supported content/research records require confirmation. Database FK errors are translated into understandable conflict messages.

## 5.14 Feedback and state design

The application includes reusable:

- loading indicators;
- empty-result states;
- full-page error states;
- inline field errors;
- success/error/info toasts;
- disabled “Saving…”, “Sending…”, and “Please wait…” buttons;
- confirmation dialogs.

Toasts use an ARIA live region, may be dismissed manually, and automatically expire. Error notifications remain longer than success notifications.

## 5.15 REST API summary

Base URL: `http://localhost:4000/api`.

| Method | Endpoint                       | Access                   | Purpose                            |
| ------ | ------------------------------ | ------------------------ | ---------------------------------- |
| GET    | `/health`                      | Public                   | Health status                      |
| POST   | `/auth/register`               | Public                   | Register VISITOR                   |
| POST   | `/auth/login`                  | Public                   | Authenticate and issue JWT         |
| GET    | `/auth/me`                     | JWT                      | Current identity                   |
| GET    | `/home`                        | Public                   | Homepage aggregates/statistics     |
| GET    | `/areas`                       | Public                   | Areas and counts                   |
| GET    | `/researchers`                 | Public                   | Search/paginate researchers        |
| GET    | `/researchers/:slug`           | Public                   | Researcher detail                  |
| GET    | `/projects`                    | Public                   | Search/filter/paginate projects    |
| GET    | `/projects/:slug`              | Public                   | Project detail                     |
| GET    | `/publications`                | Public                   | Filter/sort/paginate publications  |
| GET    | `/publications/:slug`          | Public                   | Publication detail                 |
| GET    | `/content/:kind`               | Public                   | Published events/news/resources    |
| GET    | `/search?q=`                   | Public                   | Cross-entity search                |
| POST   | `/contact`                     | Public                   | Store contact message              |
| POST   | `/ai/ask`                      | Public/optional identity | Grounded assistant response        |
| GET    | `/researcher/me`               | RESEARCHER/ADMIN         | Linked profile and relationships   |
| PUT    | `/researcher/me`               | RESEARCHER/ADMIN         | Update linked profile              |
| PUT    | `/researcher/publications/:id` | Author only              | Update authored publication fields |
| GET    | `/admin/stats`                 | ADMIN                    | Dashboard counts                   |
| GET    | `/admin/:entity`               | ADMIN                    | Management list                    |
| POST   | `/admin/:entity`               | ADMIN                    | Supported entity creation          |
| PUT    | `/admin/:entity/:id`           | ADMIN                    | Supported entity update            |
| PUT    | `/admin/messages/:id`          | ADMIN                    | Message-status update              |
| DELETE | `/admin/:entity/:id`           | ADMIN                    | Supported record deletion          |

## 5.16 Representative workflows

### Administrator publication creation

```mermaid
sequenceDiagram
  actor A as Administrator
  participant UI as Admin editor
  participant API as Admin API
  participant Z as Zod
  participant P as Prisma transaction
  participant DB as PostgreSQL
  A->>UI: Enter metadata and select relationships
  UI->>API: POST /admin/publications + JWT
  API->>API: authenticate + authorize ADMIN
  API->>Z: Validate payload
  Z-->>API: Typed data
  API->>P: Create publication with areas/authors
  P->>DB: Atomic inserts
  DB-->>UI: Created record
  UI->>A: Update table + success toast
```

### Contact workflow

```mermaid
stateDiagram-v2
  [*] --> NEW: visitor submits
  NEW --> READ: administrator reviews
  READ --> REPLIED: external email response sent
  NEW --> ARCHIVED: no action required
  READ --> ARCHIVED: case closed
  REPLIED --> ARCHIVED: conversation closed
```

## 5.17 Chapter summary

The implementation covers public communication, structured research discovery, self-service, administration, and local-first AI. The interface exposes domain relationships rather than presenting unrelated CRUD tables.

---

# Chapter 6 — Testing, evaluation, and results

## 6.1 Testing strategy

| Level                  | Purpose                                                | Current mechanism                   | Status                            |
| ---------------------- | ------------------------------------------------------ | ----------------------------------- | --------------------------------- |
| Static type checking   | Detect TypeScript incompatibilities                    | `npm run build`                     | Implemented                       |
| Production build       | Verify bundling and server compilation                 | Vite + `tsc`                        | Implemented                       |
| Linting                | Enforce code-quality rules                             | ESLint, zero warnings               | Implemented                       |
| Unit tests             | Verify selected utilities/validation/API error objects | Vitest                              | Implemented, limited coverage     |
| Database migration     | Verify physical schema creation                        | Prisma migration                    | Implemented                       |
| Seed verification      | Populate realistic relationships                       | Prisma seed                         | Implemented                       |
| API integration        | Verify responses against PostgreSQL                    | Manual/acceptance checks            | Partially automated               |
| Authorization          | Verify 401/403 and ownership boundaries                | Acceptance matrix                   | Manual evidence required          |
| Responsive visual test | Check 320/390/768/1440 widths                          | Browser screenshots                 | Manually verified for key screens |
| AI availability test   | Compare Ollama and fallback modes                      | Controlled service on/off test      | Manual evidence required          |
| End-to-end regression  | Browser workflows                                      | Recommended Playwright suite        | Future work                       |
| Accessibility audit    | Keyboard/contrast/semantics                            | Manual + recommended axe/Lighthouse | Partial                           |

## 6.2 Reproducible technical results

At the latest implementation checkpoint documented for this project:

- server TypeScript compilation passed;
- client TypeScript compilation and Vite production build passed;
- ESLint passed for client, server, and seed files with zero warnings;
- server Vitest suite passed 3 tests;
- client Vitest suite passed 2 tests;
- a live invalid-registration request returned HTTP 422 with the exact uppercase-password field error;
- PostgreSQL Docker service, migration, and seed had been exercised during development;
- homepage and administrator dialog layouts were visually inspected at desktop and mobile widths;
- the project contained 1,607 transformed frontend modules in the observed production build.

These are engineering verification results, not claims of user satisfaction, high-load scalability, or statistical research impact.

## 6.3 Functional acceptance test matrix

Use this table during the final demonstration and attach screenshots/log excerpts as evidence.

| ID    | Scenario                                  | Expected result                                   | Evidence/status                |
| ----- | ----------------------------------------- | ------------------------------------------------- | ------------------------------ |
| AT-01 | Open homepage with seeded DB              | Live counts and featured records appear           | [Insert evidence]              |
| AT-02 | Search publications by title              | Matching records only                             | [Insert evidence]              |
| AT-03 | Combine author/area/year/type filters     | Results and pagination metadata remain consistent | [Insert evidence]              |
| AT-04 | Register weak password                    | Clear 422 field error and toast                   | Verified for missing uppercase |
| AT-05 | Register duplicate email                  | Clear 409 conflict                                | [Insert evidence]              |
| AT-06 | Log in with demo administrator            | Admin overview opens                              | [Insert evidence]              |
| AT-07 | Call admin route without token            | 401                                               | [Insert evidence]              |
| AT-08 | Call admin route as researcher            | 403                                               | [Insert evidence]              |
| AT-09 | Create area/project/publication           | Record and relationships persist; toast confirms  | [Insert evidence]              |
| AT-10 | Edit project team and areas               | Old junction rows replaced atomically             | [Insert evidence]              |
| AT-11 | Delete referenced/unsupported record      | Confirmation and clear safe error                 | [Insert evidence]              |
| AT-12 | Deactivate user                           | Login no longer succeeds                          | [Insert evidence]              |
| AT-13 | Researcher updates profile                | Public data changes; success toast                | [Insert evidence]              |
| AT-14 | Researcher edits authored publication     | Update succeeds                                   | [Insert evidence]              |
| AT-15 | Researcher edits non-authored publication | 403 ownership error                               | [Insert evidence]              |
| AT-16 | Submit valid contact form                 | Message stored as NEW; admin count changes        | [Insert evidence]              |
| AT-17 | Update message status                     | Selected status persists                          | [Insert evidence]              |
| AT-18 | Ask supported AI question with Ollama     | Grounded answer, sources, mode `ollama`           | [Insert evidence]              |
| AT-19 | Stop Ollama and repeat                    | Useful sourced answer, mode `fallback`            | [Insert evidence]              |
| AT-20 | Ask unrelated question                    | Explicit no-data statement                        | [Insert evidence]              |
| AT-21 | Stop backend and submit a form            | Clear connectivity error; UI remains stable       | [Insert evidence]              |
| AT-22 | Expire/modify JWT                         | Session cleared; protected access denied          | [Insert evidence]              |

## 6.4 Responsive test matrix

| Viewport          | Navigation                   | Content grids           | Forms/dialogs                | Tables/chat                              | Expected result                         |
| ----------------- | ---------------------------- | ----------------------- | ---------------------------- | ---------------------------------------- | --------------------------------------- |
| 320–390 px mobile | Collapsed menu               | One column              | One column, viewport-bounded | Horizontal table container; compact chat | No page overflow; touch controls usable |
| 768 px tablet     | Adaptive navigation          | One/two columns         | Adaptive grid                | Detail/sidebar stacks as defined         | Clear hierarchy                         |
| 1024 px laptop    | Full or near-full navigation | Multi-column            | Two-column admin forms       | Normal dashboard                         | No collisions                           |
| 1440 px desktop   | Full navigation              | Three/four-column cards | Centered dialogs             | Wide readable tables                     | Balanced whitespace                     |

For each width, test the homepage, publication filters, detail pages, contact/auth forms, assistant, researcher workspace, admin list, and longest admin dialog.

## 6.5 Security verification checklist

| Control                  | Implementation                                                   | Verification                                     |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| Password hashing         | bcrypt cost 12                                                   | Inspect DB: no plaintext; compare login behavior |
| Password policy          | 8+ chars, uppercase, number                                      | Unit and live 422 tests                          |
| JWT signature/expiry     | Configurable secret and expiry                                   | Invalid/expired token returns 401                |
| Role authorization       | Express middleware                                               | Researcher token cannot access `/admin`          |
| Ownership                | PublicationAuthor lookup                                         | Non-author update returns 403                    |
| Input validation         | Zod at API boundary                                              | Invalid types/lengths/URLs return 422            |
| CORS                     | Configured client origin; flexible localhost only in development | Foreign origin rejected                          |
| Headers                  | Helmet                                                           | Inspect response headers                         |
| Payload size             | Express JSON limit 1 MB                                          | Oversized body rejected by parser                |
| Safe errors              | Central handler                                                  | 500 response hides internals                     |
| Secrets                  | `.env`, example placeholders                                     | No real secrets committed                        |
| SQL injection resistance | Prisma query parameters                                          | No string-built SQL in current code              |
| Referential integrity    | PostgreSQL FKs/constraints                                       | Invalid relation fails safely                    |

### Production security limitations

- Add rate limiting to login, registration, contact, search, and AI endpoints.
- Prefer HttpOnly, Secure, SameSite cookies and refresh-token rotation.
- Add CSRF protection if cookie authentication is adopted.
- Add email verification, password recovery, and breach-password screening.
- Add security event/audit logs.
- Add CSP review for production asset hosts.
- Add dependency scanning and automated security tests.
- Add request correlation IDs and centralized monitoring.

## 6.6 AI evaluation plan

Create a fixed benchmark of at least 30 questions divided among publications, researchers, projects, areas, active-status questions, authorship questions, summarization, greetings, and no-answer cases.

| Metric                | Definition                                                     | Evaluation target (not yet measured)   |
| --------------------- | -------------------------------------------------------------- | -------------------------------------- |
| Retrieval precision@5 | Relevant sources / top five returned                           | ≥ 0.80 on seeded benchmark             |
| Retrieval recall      | Relevant known records retrieved                               | ≥ 0.80                                 |
| Grounded-answer rate  | Answers whose factual claims are supported by returned records | 100% target                            |
| No-answer correctness | Unknown questions correctly rejected                           | ≥ 0.95                                 |
| Fallback availability | Relevant response while Ollama is stopped                      | 100% when DB/API available             |
| Response time         | End-to-end median and p95                                      | Measure separately for fallback/Ollama |
| Source usefulness     | Evaluator can navigate to supporting record                    | ≥ 0.90                                 |

Do not enter invented percentages in the final thesis. Execute the benchmark, preserve questions/expected records, and calculate results.

## 6.7 Usability evaluation plan

Recruit a small representative sample, subject to supervisor approval: researchers, students/visitors, and one or more administrative users. Give each participant tasks such as finding a cybersecurity researcher, filtering publications, submitting contact, editing a profile, creating a project, and asking the assistant.

Collect:

- task completion rate;
- time on task;
- number of errors/recoveries;
- Single Ease Question after each task;
- System Usability Scale after the session;
- qualitative comments on terminology, navigation, filters, and trust in AI sources.

Report participant count, procedure, consent/privacy approach, device, task script, descriptive statistics, and limitations. Do not generalize from a very small convenience sample.

## 6.8 Performance evaluation plan

Measure rather than estimate:

- Vite asset sizes from production build;
- Lighthouse performance/accessibility/best-practice scores on selected public pages;
- API median/p95 latency for catalogue and search endpoints;
- PostgreSQL query plans for publication filters and global search;
- behavior with increasing seeded volumes;
- Ollama and fallback response time separately;
- error rate under a controlled concurrent-request test.

Record hardware, dataset size, Node/PostgreSQL versions, command, run count, and whether caches were warm.

## 6.9 Evaluation against hypotheses

| Hypothesis                      | Current evidence                                               | Conclusion allowed now                                              |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| H1 relational consistency       | Junction tables, constraints, transactions, seed relationships | Structurally supported; comparative maintenance study not performed |
| H2 role isolation               | Backend middleware and ownership checks                        | Implemented; complete endpoint penetration matrix still recommended |
| H3 grounded resilient assistant | Retrieval-first code, sources, timeout, fallback               | Architecturally supported; benchmark metrics pending                |
| H4 responsive usability         | CSS breakpoints and key visual inspections                     | Key screens verified; broader device/user study pending             |

## 6.10 Limitations and threats to validity

- Unit-test coverage is currently small.
- There is no automated browser end-to-end suite.
- Seed data is realistic demonstration content, not a production institutional dataset.
- Search uses substring/array matching without relevance scoring.
- AI quality varies with the locally installed model.
- Returned source records reduce but do not mathematically eliminate generated misstatements.
- External URLs and demo DOI values are not guaranteed to resolve to real works.
- No formal usability sample, load test, or accessibility certification has yet been documented.
- Client-side rendering may limit search-engine optimization.
- Local-storage JWT handling should be hardened for production.

## 6.11 Chapter summary

Current evidence proves reproducible compilation, linting, selected tests, live validation behavior, and implemented safeguards. The proposed matrices define how to gather defensible empirical results without overstating prototype performance.

---

# General conclusion and future work

## Conclusion

This project designed and implemented ZURC as a dynamic research-center platform that connects institutional communication with structured scientific information. The relational model links researchers, areas, projects, publications, and authorship while keeping editorial and communication records manageable. Public visitors can explore and search the center, researchers receive a controlled self-service workspace, and administrators manage the complete information lifecycle through protected backend operations.

The assistant is the project's most distinctive feature. Its knowledge comes from center records retrieved before generation. Optional local Ollama integration improves wording without becoming a mandatory dependency, and deterministic fallback protects availability. Clickable sources and explicit no-answer behavior support transparency.

The technical implementation demonstrates a coherent Master's-level combination of database analysis, API design, authentication, authorization, responsive UI/UX, validation, failure handling, testing, and documentation. Equally important, the report identifies prototype limitations and separates verified engineering facts from future evaluation targets.

## Main contributions

- A complete public research-center portal.
- A relational research-information model with ordered authorship and explicit memberships.
- Role-aware visitor, researcher, and administrator workflows.
- Multi-criteria and cross-entity discovery.
- A no-paid-API, PostgreSQL-grounded assistant with fallback.
- Responsive academic design across public and management interfaces.
- Central validation, safe errors, and accessible operation feedback.
- Reproducible migration, seed, test, lint, and build workflow.
- Full technical documentation and thesis-ready modeling artifacts.

## Future work

### Search and scholarly interoperability

- PostgreSQL full-text search, ranking, and trigram similarity.
- Local embeddings with `pgvector` and hybrid lexical/semantic retrieval.
- DOI/Crossref metadata import and BibTeX/RIS export.
- ORCID authentication/synchronization.
- OAI-PMH or CERIF-aligned interoperability for institutional exchange.

### Governance and editorial workflow

- Draft/review/approve publication workflow.
- Audit trail recording actor, time, and before/after values.
- Soft deletion, restoration, and retention rules.
- Fine-grained permissions beyond three broad roles.
- Researcher invitations and account-profile linking workflow.

### Security and identity

- Email verification and password recovery.
- MFA for administrators.
- HttpOnly refresh cookies and token rotation.
- Login/contact/AI rate limits and abuse monitoring.
- Automated dependency and authorization security tests.

### AI improvements

- Local embedding and reranking models.
- Document/PDF ingestion with traceable chunks and page citations.
- Conversation history UI and deletion controls.
- Claim-level source validation and answer-quality benchmark.
- Model administration and privacy/retention controls.

### Platform and user experience

- Managed file storage for publications and images.
- Multilingual English/French/Arabic interface with RTL support.
- Advanced analytics and downloadable center reports.
- Calendar and iCalendar export for events.
- Email notifications and internal response tracking.
- WCAG audit, Playwright end-to-end tests, and performance monitoring.
- Progressive Web App or dedicated mobile application if user research justifies it.

## Final perspective

ZURC demonstrates that a research center does not need to choose between structured information management and approachable public discovery. A carefully modeled database, secure modular API, responsive interface, and retrieval-grounded local assistant can work together as one maintainable platform. The implemented foundation is suitable for academic demonstration and provides a clear roadmap toward a production institutional system.

---

# References

Use the faculty's required citation style consistently. The following references are suitable starting points; verify access dates in the final document.

1. P. Lewis et al., “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,” _Advances in Neural Information Processing Systems 33_, 2020. DOI: [10.48550/arXiv.2005.11401](https://doi.org/10.48550/arXiv.2005.11401).
2. OWASP Foundation, “OWASP API Security Top 10 — 2023,” [https://owasp.org/API-Security/](https://owasp.org/API-Security/).
3. OWASP Foundation, “REST Security Cheat Sheet,” [https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
4. React Team, “React Documentation,” [https://react.dev/](https://react.dev/).
5. Vite Team, “Vite Documentation,” [https://vite.dev/guide/](https://vite.dev/guide/).
6. OpenJS Foundation, “Node.js Documentation,” [https://nodejs.org/docs/latest/api/](https://nodejs.org/docs/latest/api/).
7. Express.js, “Express Documentation,” [https://expressjs.com/](https://expressjs.com/).
8. PostgreSQL Global Development Group, “PostgreSQL 16 Documentation,” [https://www.postgresql.org/docs/16/](https://www.postgresql.org/docs/16/).
9. PostgreSQL Global Development Group, “Full Text Search,” [https://www.postgresql.org/docs/16/textsearch.html](https://www.postgresql.org/docs/16/textsearch.html).
10. Prisma Data, “Prisma ORM Documentation,” [https://www.prisma.io/docs/orm](https://www.prisma.io/docs/orm).
11. M. Jones, J. Bradley, and N. Sakimura, “JSON Web Token (JWT),” RFC 7519, IETF, 2015. [https://www.rfc-editor.org/rfc/rfc7519](https://www.rfc-editor.org/rfc/rfc7519).
12. N. Provos and D. Mazières, “A Future-Adaptable Password Scheme,” _USENIX Annual Technical Conference_, 1999 (bcrypt foundation).
13. Zod, “TypeScript-first schema validation,” [https://zod.dev/](https://zod.dev/).
14. Ollama, “Ollama Documentation,” [https://github.com/ollama/ollama/tree/main/docs](https://github.com/ollama/ollama/tree/main/docs).
15. W3C, “Web Content Accessibility Guidelines (WCAG) 2.2,” [https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/).
16. Docker, “Docker Compose Documentation,” [https://docs.docker.com/compose/](https://docs.docker.com/compose/).
17. OpenAIRE, “Guidelines and Services for Research Information,” [https://www.openaire.eu/](https://www.openaire.eu/).
18. ISO/IEC, _ISO/IEC 25010 Systems and Software Quality Models_. Use the edition required by the faculty/library.

Project-internal sources that may be cited as implementation artifacts:

- `server/prisma/schema.prisma` — authoritative physical schema.
- `server/prisma/migrations/` — generated SQL migration history.
- `server/prisma/seed.ts` — demonstration dataset.
- `server/src/` — REST, security, search, and AI implementation.
- `client/src/` — responsive interface and state handling.
- `docs/API.md`, `docs/AI.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` — focused technical documentation.

---

# Appendices

## Appendix A — Installation and execution

### Prerequisites

- Node.js 20 or newer;
- npm 10 or newer;
- Docker Desktop or PostgreSQL 15+;
- optional Ollama.

### Environment preparation

```bash
cp .env.example server/.env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:5173`. The API is `http://localhost:4000/api`, and health is `http://localhost:4000/api/health`.

### Demo accounts

| Role          | Email                      | Password       |
| ------------- | -------------------------- | -------------- |
| Administrator | `admin@zurc-demo.edu`      | `Admin123!`    |
| Researcher    | `researcher@zurc-demo.edu` | `Research123!` |

These are development-only credentials and must be changed or removed in production.

### Optional Ollama

```bash
ollama pull llama3.2:3b
ollama serve
```

No application setting needs to be changed to demonstrate fallback: stop Ollama and ask a question with a known seeded match.

### Verification commands

```bash
npm test
npm run lint
npm run build
```

## Appendix B — Environment variables

| Variable         |      Required       | Example                                                                       | Purpose                  |
| ---------------- | :-----------------: | ----------------------------------------------------------------------------- | ------------------------ |
| `DATABASE_URL`   |         Yes         | `postgresql://research:research@localhost:5432/research_center?schema=public` | Prisma connection        |
| `JWT_SECRET`     |         Yes         | Replace with 32+ random characters                                            | Token signature          |
| `JWT_EXPIRES_IN` |         Yes         | `8h`                                                                          | Access-token lifetime    |
| `PORT`           |         Yes         | `4000`                                                                        | API port                 |
| `CLIENT_URL`     |         Yes         | `http://localhost:5173`                                                       | Production CORS origin   |
| `OLLAMA_URL`     |      Optional       | `http://localhost:11434`                                                      | Local generation service |
| `OLLAMA_MODEL`   |      Optional       | `llama3.2:3b`                                                                 | Local model name         |
| `VITE_API_URL`   | Frontend deployment | `http://localhost:4000/api`                                                   | Browser API base URL     |

## Appendix C — Screenshot capture checklist

For each screenshot:

1. Use seeded data and a clean browser window.
2. Avoid exposing real secrets or personal information.
3. Capture a meaningful state rather than an empty screen.
4. Include validation, loading, empty, error, and success states where relevant.
5. Use consistent desktop dimensions and at least one mobile viewport.
6. Add numbered captions below images and refer to them in prose.
7. Do not claim an Ollama screenshot is fallback mode (or vice versa); show the mode label.
8. Capture unauthorized responses with a safe API client or browser network panel.

Suggested Markdown placeholder:

```md
![Administrator publication editor](figures/admin-publication-editor.png)

**Figure 26 — Administrator publication editor with relationship selection and validation.**
```

## Appendix D — Final thesis completion checklist

### Academic content

- [ ] Replace cover-page placeholders.
- [ ] Obtain supervisor approval for title, questions, hypotheses, and methodology.
- [ ] Confirm citation style and validate every bibliographic reference.
- [ ] Add genuine literature sources relevant to CRIS, search, RAG, security, and usability.
- [ ] Remove any claim not supported by implementation evidence or measured data.
- [ ] Add page numbers, list of figures, list of tables, and automatic TOC in the final word processor/LaTeX template.

### Models and implementation

- [ ] Compare diagrams against the final Prisma schema.
- [ ] Re-export Mermaid diagrams at print resolution if required.
- [ ] Include migration/seed evidence.
- [ ] Include public, researcher, and administrator screenshots.
- [ ] Demonstrate both AI modes and no-result behavior.
- [ ] Explain the array/normalization trade-off.

### Testing and results

- [ ] Execute every acceptance test and record pass/fail/date.
- [ ] Add endpoint authorization evidence.
- [ ] Run Lighthouse/axe and document findings/fixes.
- [ ] Run the AI benchmark and calculate actual metrics.
- [ ] If conducting user testing, document participants, consent, procedure, results, and limitations.
- [ ] Add performance measurements with hardware/dataset context.

### Production-readiness discussion

- [ ] Explain current local-storage JWT limitation.
- [ ] Explain missing SMTP, password recovery, and email verification.
- [ ] Describe backup, logging, HTTPS, rate-limiting, and monitoring needs.
- [ ] Remove/change demo credentials before any public deployment.

## Appendix E — Viva/demonstration scenario

1. Open the responsive homepage and explain database-derived statistics.
2. Navigate from an area to associated research concepts.
3. Filter publications by author, area, year, and type.
4. Ask the assistant for cybersecurity researchers; open a returned source.
5. Stop Ollama and show that the same flow returns fallback results.
6. Submit a contact message as a visitor.
7. Log in as researcher, update the profile, and show the success toast.
8. Attempt an unauthorized action and explain backend protection.
9. Log in as administrator and show changed message count/status.
10. Create a publication with authors, areas, and a project.
11. Explain `PublicationAuthor` and author ordering in the ERD.
12. Resize to mobile and demonstrate navigation, forms, dialog, table, and chatbot.
13. End with tests/build output and known limitations.

## Appendix F — Mapping from the reference report to ZURC

| Reference-report section                              | ZURC equivalent in this document                      |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Background, objective, problematic, hypothesis, goals | General introduction                                  |
| Academic studies and existing platforms               | Chapter 1                                             |
| Advanced tools and technologies                       | Chapter 3 §§3.1–3.2                                   |
| System architecture and workflows                     | Chapter 3 §§3.3–3.9                                   |
| Data dictionary                                       | Chapter 4 §4.6, all 16 physical tables                |
| Conceptual Data Model                                 | Chapter 4 §4.2                                        |
| Logical Data Model                                    | Chapter 4 §4.3                                        |
| Platform implementation screenshots                   | Chapter 5 and figure checklist                        |
| Implementation stages and libraries                   | General approach, Chapter 3, Chapter 5                |
| Evaluation and results                                | Chapter 6 with verified vs proposed results separated |
| Conclusion and future work                            | General conclusion                                    |
| References                                            | Verified technical/academic starting bibliography     |

This mapping preserves the useful organization of the supplied thesis while expanding the database, requirements, security, AI, testing, and validity sections needed for the substantially richer ZURC domain.
