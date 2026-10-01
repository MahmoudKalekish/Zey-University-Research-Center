import { describe, expect, it } from "vitest";
import { chunkPages, isTextUsable, normalizeDocumentText } from "./chunk.service.js";

const paragraph = (marker: string) =>
  `${marker} ${"Academic evidence remains tied to its original page and is never invented. ".repeat(7)}`;

describe("page-aware document chunking", () => {
  const pages = [
    { pageNumber: 1, text: `Research Overview\n${paragraph("P1-A")}\n\n${paragraph("P1-B")}` },
    { pageNumber: 2, text: `Methods\n${paragraph("P2-A")}\n\n${paragraph("P2-B")}` },
    { pageNumber: 3, text: `Results\n${paragraph("P3-A")}\n\n${paragraph("P3-B")}` },
    { pageNumber: 4, text: `Conclusion\n${paragraph("P4-A")}\n\nLimitations\n${paragraph("P4-B")}` },
  ];

  it("creates deterministic ordered chunks with bounded size and page provenance", () => {
    const chunks = chunkPages(pages, { targetCharacters: 2800, overlapCharacters: 250 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(chunks.map((_, index) => index));
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(3500);
      expect(chunk.pageStart).toBeLessThanOrEqual(chunk.pageEnd);
      expect(chunk.normalizedText).toBe(normalizeDocumentText(chunk.content));
      expect(chunk.tokenEstimate).toBeGreaterThan(0);
    }
    expect(chunks.some((chunk) => chunk.sectionTitle === "Methods")).toBe(true);
    expect(chunks.some((chunk) => chunk.sectionTitle === "Results")).toBe(true);
  });

  it("never loses source paragraphs while introducing only bounded overlap", () => {
    const chunks = chunkPages(pages, { targetCharacters: 1200, overlapCharacters: 180 });
    for (const marker of ["P1-A", "P1-B", "P2-A", "P2-B", "P3-A", "P3-B", "P4-A", "P4-B"]) {
      expect(chunks.some((chunk) => chunk.content.includes(marker))).toBe(true);
    }
    expect(chunks.every((chunk) => chunk.content.length <= 3500)).toBe(true);
  });

  it("normalizes whitespace consistently and detects textless documents", () => {
    expect(normalizeDocumentText("  Methods\r\n\r\n value   with\tspaces ")).toBe("methods value with spaces");
    expect(isTextUsable([{ pageNumber: 1, text: "" }, { pageNumber: 2, text: "  " }])).toBe(false);
    expect(isTextUsable([{ pageNumber: 1, text: "A meaningful paragraph with enough research content to index." }])).toBe(true);
  });
});
