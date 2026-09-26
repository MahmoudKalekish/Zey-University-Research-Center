import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { env } from "../../config/env.js";
import {
  deleteStoredPdf,
  resolveStoragePath,
  storePdf,
  validatePdfUpload,
} from "./storage.service.js";

const pdf = (size = 32) => Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(size - 9, 65)]);
const upload = (overrides: Partial<Express.Multer.File> = {}) =>
  ({
    originalname: "paper.pdf",
    mimetype: "application/pdf",
    size: 32,
    buffer: pdf(),
    ...overrides,
  }) as Express.Multer.File;

describe("publication PDF storage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "zurc-pdf-"));
    env.PUBLICATION_STORAGE_DIR = root;
    env.MAX_PUBLICATION_PDF_MB = 25;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("accepts only a real, non-empty PDF with matching metadata", async () => {
    expect(() => validatePdfUpload(upload())).not.toThrow();
    expect(() => validatePdfUpload(upload({ originalname: "paper.txt" }))).toThrow(/PDF/i);
    expect(() => validatePdfUpload(upload({ mimetype: "text/plain" }))).toThrow(/PDF/i);
    expect(() => validatePdfUpload(upload({ buffer: Buffer.from("not a pdf") }))).toThrow(/signature/i);
    expect(await readdir(root)).toEqual([]);
    expect(() => validatePdfUpload(upload({ buffer: Buffer.alloc(0), size: 0 }))).toThrow(/empty/i);
  });

  it("reports storage failures without leaving a temporary upload", async () => {
    const blockedRoot = path.join(root, "not-a-directory");
    await writeFile(blockedRoot, "blocked");
    env.PUBLICATION_STORAGE_DIR = blockedRoot;
    await expect(storePdf(pdf())).rejects.toThrow(/stored safely/i);
    expect(await readdir(root)).toEqual(["not-a-directory"]);
  });

  it("enforces the configured MiB boundary", () => {
    const max = 25 * 1024 * 1024;
    expect(() => validatePdfUpload(upload({ size: max, buffer: pdf(16) }))).not.toThrow();
    expect(() => validatePdfUpload(upload({ size: max + 1, buffer: pdf(16) }))).toThrow(/25 MiB/i);
  });

  it("stores with an indirect key and a stable checksum", async () => {
    const first = await storePdf(pdf());
    const second = await storePdf(pdf());
    expect(first.storageKey).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(first.storageKey).not.toBe(second.storageKey);
    expect(first.sha256).toBe(second.sha256);
    expect(first.absolutePath).toBe(resolveStoragePath(first.storageKey));
    expect(first.sizeBytes).toBe(32);
  });

  it("rejects traversal keys and deletes stored files idempotently", async () => {
    expect(() => resolveStoragePath("../outside.pdf")).toThrow(/storage key/i);
    expect(() => resolveStoragePath("nested/paper.pdf")).toThrow(/storage key/i);
    const stored = await storePdf(pdf());
    await deleteStoredPdf(stored.storageKey);
    await deleteStoredPdf(stored.storageKey);
    expect(await readdir(root)).toEqual([]);
  });
});
