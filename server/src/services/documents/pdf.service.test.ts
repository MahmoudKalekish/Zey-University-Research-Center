import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extractPdfPages } from "./pdf.service.js";
import { isTextUsable } from "./chunk.service.js";

function createPdf(pageTexts: string[]) {
  const objects: string[] = [];
  const fontId = 3 + pageTexts.length * 2;
  const kids = pageTexts.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageTexts.length} >>`);
  for (let index = 0; index < pageTexts.length; index += 1) {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    const lines = pageTexts[index]!
      .split("\n")
      .map((line) => `(${line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")}) Tj T*`)
      .join("\n");
    const stream = `BT /F1 11 Tf 72 720 Td 14 TL\n${lines}\nET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

describe("complete PDF extraction", () => {
  let directory: string;
  let paperPath: string;
  let imageOnlyPath: string;
  let corruptPath: string;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "zurc-pdf-extract-"));
    paperPath = path.join(directory, "research-paper.pdf");
    imageOnlyPath = path.join(directory, "image-only.pdf");
    corruptPath = path.join(directory, "corrupt.pdf");
    await writeFile(
      paperPath,
      createPdf([
        "Research Overview FIRST-PAGE-MARKER",
        "Methods MIDDLE-PAGE-MARKER sample design and observations",
        "Results statistically material outcome",
        "Conclusion and Limitations FINAL-PAGE-MARKER",
      ]),
    );
    await writeFile(imageOnlyPath, createPdf(["", ""]));
    await writeFile(corruptPath, Buffer.from("%PDF-1.7\nthis is corrupt"));
  });

  afterAll(async () => rm(directory, { recursive: true, force: true }));

  it("extracts every page in source order, including the final page", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await extractPdfPages(paperPath);
    expect(result.pageCount).toBe(4);
    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3, 4]);
    expect(result.pages[0]!.text).toContain("FIRST-PAGE-MARKER");
    expect(result.pages[1]!.text).toContain("MIDDLE-PAGE-MARKER");
    expect(result.pages[3]!.text).toContain("FINAL-PAGE-MARKER");
    expect(isTextUsable(result.pages)).toBe(true);
    expect(warning.mock.calls.flat().join(" ")).not.toContain("standardFontDataUrl");
    warning.mockRestore();
  });

  it("classifies corrupt PDFs without leaking parser internals", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await expect(extractPdfPages(corruptPath)).rejects.toMatchObject({
        code: "CORRUPT_OR_ENCRYPTED_PDF",
      });
    } finally {
      warning.mockRestore();
    }
  });

  it("allows callers to identify an image-only PDF as unusable text", async () => {
    const result = await extractPdfPages(imageOnlyPath);
    expect(result.pageCount).toBe(2);
    expect(isTextUsable(result.pages)).toBe(false);
  });
});
