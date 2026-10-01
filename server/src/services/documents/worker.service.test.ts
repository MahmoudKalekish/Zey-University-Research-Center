import { describe, expect, it, vi } from "vitest";
import { PdfProcessingError } from "./pdf.service.js";
import { createDocumentWorker } from "./worker.service.js";

const pages = [
  { pageNumber: 1, text: "Methods: a meaningful experimental method with enough content for extraction." },
  { pageNumber: 2, text: "Results: a meaningful reported result with enough content for extraction." },
];
const chunks = [{ chunkIndex: 0, pageStart: 1, pageEnd: 2, sectionTitle: "Methods", content: "Methods and results", normalizedText: "methods and results", tokenEstimate: 5 }];

function harness() {
  let pending = true;
  let persisted = [...chunks, { ...chunks[0]!, chunkIndex: 9 }];
  const failures: Array<{ code: string; message: string }> = [];
  const repository = {
    claimPending: vi.fn(async () => {
      if (!pending) return null;
      pending = false;
      return { id: "doc-1", storageKey: "paper.pdf" };
    }),
    complete: vi.fn(async (_id, _pages, nextChunks) => {
      persisted = [...nextChunks];
    }),
    fail: vi.fn(async (_id, code, message) => void failures.push({ code, message })),
    recoverInterrupted: vi.fn(async () => 2),
  };
  return { repository, failures, getPersisted: () => persisted };
}

describe("recoverable document worker", () => {
  it("claims a pending PDF, processes every page, and atomically replaces chunks", async () => {
    const state = harness();
    const worker = createDocumentWorker({
      repository: state.repository,
      resolvePath: () => "/stored/paper.pdf",
      extract: async () => ({ pages, pageCount: 2 }),
      usable: () => true,
      chunk: () => chunks,
    });
    expect(await worker.processNextDocument()).toBe(true);
    expect(state.repository.complete).toHaveBeenCalledWith("doc-1", pages, chunks);
    expect(state.getPersisted()).toEqual(chunks);
    expect(await worker.processNextDocument()).toBe(false);
  });

  it("classifies scanned and corrupt PDFs with safe failure messages", async () => {
    const scanned = harness();
    const scannedWorker = createDocumentWorker({
      repository: scanned.repository,
      resolvePath: () => "/stored/scanned.pdf",
      extract: async () => ({ pages: [{ pageNumber: 1, text: "" }], pageCount: 1 }),
      usable: () => false,
      chunk: () => [],
    });
    await scannedWorker.processNextDocument();
    expect(scanned.failures).toEqual([{ code: "OCR_REQUIRED", message: expect.stringMatching(/scanned|text/i) }]);

    const corrupt = harness();
    const corruptWorker = createDocumentWorker({
      repository: corrupt.repository,
      resolvePath: () => "/stored/corrupt.pdf",
      extract: async () => { throw new PdfProcessingError("CORRUPT_OR_ENCRYPTED_PDF", "parser internals"); },
      usable: () => true,
      chunk: () => [],
    });
    await corruptWorker.processNextDocument();
    expect(corrupt.failures).toEqual([{ code: "CORRUPT_OR_ENCRYPTED_PDF", message: "The PDF is corrupt, encrypted, or cannot be read" }]);
  });

  it("recovers interrupted work on startup", async () => {
    const state = harness();
    const worker = createDocumentWorker({
      repository: state.repository,
      resolvePath: vi.fn(),
      extract: vi.fn(),
      usable: vi.fn(),
      chunk: vi.fn(),
    });
    await expect(worker.recoverInterruptedJobs()).resolves.toBe(2);
    expect(state.repository.recoverInterrupted).toHaveBeenCalledOnce();
  });
});
