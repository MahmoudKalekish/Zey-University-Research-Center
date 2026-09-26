import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http.js";

const serverRoot = fileURLToPath(new URL("../../../", import.meta.url));
const storageKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

export interface StoredPdf {
  storageKey: string;
  absolutePath: string;
  sha256: string;
  sizeBytes: number;
}

function storageRoot() {
  return path.resolve(serverRoot, env.PUBLICATION_STORAGE_DIR);
}

export function validatePdfUpload(file: Express.Multer.File) {
  if (!file.buffer.length || file.size === 0) throw new HttpError(415, "The PDF file is empty");
  if (!file.originalname.toLowerCase().endsWith(".pdf")) {
    throw new HttpError(415, "Only files with a .pdf extension are accepted");
  }
  if (file.mimetype.toLowerCase() !== "application/pdf") {
    throw new HttpError(415, "Only application/pdf files are accepted");
  }
  const limit = env.MAX_PUBLICATION_PDF_MB * 1024 * 1024;
  if (file.size > limit) {
    throw new HttpError(413, `The PDF exceeds the ${env.MAX_PUBLICATION_PDF_MB} MiB limit`);
  }
  if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new HttpError(415, "The uploaded file does not have a valid PDF signature");
  }
}

export function resolveStoragePath(storageKey: string) {
  if (!storageKeyPattern.test(storageKey)) {
    throw new HttpError(400, "Invalid publication storage key");
  }
  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  if (path.dirname(resolved) !== root) throw new HttpError(400, "Invalid publication storage key");
  return resolved;
}

export async function storePdf(buffer: Buffer): Promise<StoredPdf> {
  const storageKey = `${randomUUID()}.pdf`;
  const absolutePath = resolveStoragePath(storageKey);
  const temporaryPath = `${absolutePath}.${randomUUID()}.tmp`;
  try {
    await mkdir(storageRoot(), { recursive: true });
    await writeFile(temporaryPath, buffer, { flag: "wx", mode: 0o600 });
    await rename(temporaryPath, absolutePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw new HttpError(503, "The PDF could not be stored safely", error);
  }
  return {
    storageKey,
    absolutePath,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    sizeBytes: buffer.length,
  };
}

export async function deleteStoredPdf(storageKey: string) {
  await rm(resolveStoragePath(storageKey), { force: true });
}
