import { describe, expect, it, vi } from "vitest";
import {
  createDocumentDeletionService,
  createDocumentService,
} from "./document.service.js";

const upload = {
  originalname: "paper.pdf",
  mimetype: "application/pdf",
  size: 12,
  buffer: Buffer.from("%PDF-1.7\nok"),
} as Express.Multer.File;

describe("publication document replacement", () => {
  it("commits the new record before deleting the prior file and returns a safe status", async () => {
    const events: string[] = [];
    const service = createDocumentService({
      validateUpload: () => events.push("validated"),
      store: async () => {
        events.push("stored-new");
        return {
          storageKey: "new.pdf",
          absolutePath: "/secret/new.pdf",
          sha256: "abc",
          sizeBytes: 12,
        };
      },
      replaceRecord: async () => {
        events.push("committed");
        return {
          previousStorageKey: "old.pdf",
          document: {
            id: "doc-1",
            publicationId: "pub-1",
            status: "PENDING",
            originalName: "paper.pdf",
            sizeBytes: 12,
            pageCount: null,
            characterCount: null,
            failureCode: null,
            failureMessage: null,
            processedAt: null,
            updatedAt: new Date("2026-10-01T10:00:00Z"),
          },
        };
      },
      remove: async (key) => {
        events.push(`deleted-${key}`);
      },
      findStatus: vi.fn(),
    });

    const result = await service.replacePublicationDocument("pub-1", upload);

    expect(events).toEqual([
      "validated",
      "stored-new",
      "committed",
      "deleted-old.pdf",
    ]);
    expect(result).toEqual({
      id: "doc-1",
      publicationId: "pub-1",
      status: "PENDING",
      originalName: "paper.pdf",
      sizeBytes: 12,
      pageCount: null,
      characterCount: null,
      failureCode: null,
      failureMessage: null,
      processedAt: null,
      updatedAt: "2026-10-01T10:00:00.000Z",
    });
    expect(result).not.toHaveProperty("storageKey");
    expect(result).not.toHaveProperty("absolutePath");
  });

  it("removes the new file and preserves the prior file if the database transaction fails", async () => {
    const removed: string[] = [];
    const service = createDocumentService({
      validateUpload: vi.fn(),
      store: async () => ({
        storageKey: "new.pdf",
        absolutePath: "/secret/new.pdf",
        sha256: "abc",
        sizeBytes: 12,
      }),
      replaceRecord: async () => {
        throw new Error("transaction rolled back");
      },
      remove: async (key) => void removed.push(key),
      findStatus: vi.fn(),
    });

    await expect(
      service.replacePublicationDocument("pub-1", upload),
    ).rejects.toThrow(/transaction rolled back/i);
    expect(removed).toEqual(["new.pdf"]);
  });

  it("retrieves a safe document status without exposing storage details", async () => {
    const service = createDocumentService({
      validateUpload: vi.fn(),
      store: vi.fn(),
      replaceRecord: vi.fn(),
      remove: vi.fn(),
      findStatus: async () => ({
        id: "doc-1",
        publicationId: "pub-1",
        status: "READY",
        originalName: "paper.pdf",
        sizeBytes: 120,
        pageCount: 8,
        characterCount: 4200,
        failureCode: null,
        failureMessage: null,
        processedAt: new Date("2026-10-01T11:00:00Z"),
        updatedAt: new Date("2026-10-01T11:00:00Z"),
      }),
    });
    const result = await service.getDocumentStatus("pub-1");
    expect(result.status).toBe("READY");
    expect(result.pageCount).toBe(8);
    expect(result).not.toHaveProperty("storageKey");
  });
});

describe("managed publication deletion", () => {
  it("deletes the database record before cleaning its managed PDF", async () => {
    const events: string[] = [];
    const remove = vi.fn(async (key: string) => {
      events.push(`file:${key}`);
    });
    const deletion = createDocumentDeletionService({
      deleteRecord: async () => {
        events.push("database");
        return "managed.pdf";
      },
      remove,
    });
    await deletion("pub-1");
    expect(events).toEqual(["database", "file:managed.pdf"]);
  });
});
