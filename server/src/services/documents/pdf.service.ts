import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const standardFontDataUrl = `${path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts")}${path.sep}`;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export class PdfProcessingError extends Error {
  constructor(
    public code: "CORRUPT_OR_ENCRYPTED_PDF" | "PDF_EXTRACTION_FAILED",
    message: string,
  ) {
    super(message);
  }
}

export async function extractPdfPages(filePath: string) {
  try {
    const [{ getDocument }, source] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      readFile(filePath),
    ]);
    const loadingTask = getDocument({
      data: new Uint8Array(source),
      isEvalSupported: false,
      useWorkerFetch: false,
      standardFontDataUrl,
    });
    const document = await loadingTask.promise;
    const pages: ExtractedPage[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        text += item.hasEOL ? "\n" : " ";
      }
      pages.push({ pageNumber, text: text.replace(/[ \t]+\n/g, "\n").trim() });
      page.cleanup();
    }
    await document.destroy();
    return { pages, pageCount: document.numPages };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const corrupt = ["InvalidPDFException", "PasswordException", "MissingPDFException"].includes(name);
    throw new PdfProcessingError(
      corrupt ? "CORRUPT_OR_ENCRYPTED_PDF" : "PDF_EXTRACTION_FAILED",
      corrupt
        ? "The PDF is corrupt, encrypted, or cannot be read"
        : "The PDF text could not be extracted",
    );
  }
}
