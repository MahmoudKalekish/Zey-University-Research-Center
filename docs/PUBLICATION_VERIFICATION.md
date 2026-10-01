# Publication document verification — 1 October 2026

Verified in `.worktrees/publication-document-analysis` on `codex/research-document-ai`, preserving the earlier feature commits and API work. Main checkout remained clean on `master` at `950ae80`. This report records the tested revision before its final feature commit; it is not a guarantee about later revisions or other environments.

## Automated gates

| Check                               | Observed result                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm test`                          | 78 server tests and 22 client tests passed. Database acceptance is deliberately skipped in the default run.         |
| Dedicated PostgreSQL/API acceptance | 1 test passed separately with `ZURC_DOCUMENT_ACCEPTANCE=1` on `zurc_publication_test_clean_20261001`.               |
| `npm run lint`                      | Server and client passed with zero lint warnings.                                                                   |
| `npm run build`                     | Server TypeScript and client TypeScript/Vite production builds passed.                                              |
| Prisma generation and validation    | Passed with Prisma 6.19.3. The legacy package.json configuration deprecation warning remains.                       |
| Fresh migration and seed            | Both migrations deployed to a new dedicated database; guarded seed completed. Migration status reported up to date. |
| `git diff --check`                  | Passed.                                                                                                             |

The fresh seed contained 34 publications: 31 PUBLISHED, one READY_FOR_REVIEW and two DRAFT. Both READY PDFs had 12 pages and 13 chunks spanning pages 1–12. The OCR-required fixture was FAILED with no chunks. The normal application database was not destructively seeded or migrated for these checks.

Acceptance exercises real JWT authorization, multipart upload, filesystem storage, full PDF extraction, restart recovery without duplicate chunks, researcher ownership, readiness checks, administrator-only publication, public visibility, document download, summary/question fallback, scanned/corrupt failures, published-document replacement and deletion cleanup. It creates and cleans its own records/storage.

## Actual local model and offline checks

`npx tsx test/live-document-ai.ts --all-levels --dense` passed against the running `zurc-ollama` container and `qwen2.5:0.5b` at `http://localhost:11434`. The script extracted an original synthetic PDF with 12 text-bearing pages and 13 chunks, checked all three summary modes, Results evidence on page 8, final-page conclusions/limitations on page 12, a specific numerical question, unsupported-question refusal and unreachable-local-service fallback. Every source chunk participates in summary evidence processing.

In the browser, “How many confirmed leaks were detected?” returned nine with supporting evidence on pages 6, 8 and 11. The Standard overview included objective, methodology, findings, conclusion and limitations rather than just introductory content.

Ollama was also actually stopped temporarily. Public question answering and queued summary generation returned labeled FALLBACK content with source pages, while the PDF remained accessible. The verification restored the container in a `finally` block; PostgreSQL remained running. These checks used original fictional teaching content, not real research data.

## Browser and responsive checks

The local preview used port 5174 and a backend on port 4010, connected only to `zurc_publication_test_20261001` and temporary PDF storage. The administrator review editor, researcher draft/document workflow and publication summary/question interface were checked at 320, 390, 768, 1024 and 1440 px. No horizontal overflow was observed in the recorded checks. Browser inspection exposed overlapping administrator form/review sections at narrow widths; the dialog now uses a single vertical flow, and the 320 px layout was checked after that repair.

An administrator could inspect document readiness, existing author/area selections and review controls. A researcher created a draft through the UI, uploaded a 12-page PDF and submitted it. The workspace displayed READY_FOR_REVIEW; reopening the submission showed disabled metadata and locked replacement controls. Public summary sections and PDF evidence links, publication-context assistant mode and a real Qwen answer were inspected visually. Browser-only test content stays in the disposable preview database.

## Remaining limits and maintenance

The configured 0.5B model can produce weak synthesis. Verified source quotations constrain summaries; question citations do not constitute a formal semantic correctness guarantee. There is no OCR implementation, scholarly accuracy benchmark, embedding retrieval or conversation-history resolution. Recovery assumes a single worker process. See [workflow documentation](PUBLICATION_DOCUMENTS.md) and [investigation/SOLID rationale](PROJECT_INVESTIGATION.md).

`npm audit` reported six dependency findings: four high and two moderate, including Prisma/@prisma/config through deepmerge-ts, brace-expansion and Vitest/@vitest/mocker. Forced major-version upgrades were not applied. This dependency maintenance remains outstanding; the feature branch is kept separate from master for review and remediation.
