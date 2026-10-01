import { describe, expect, it } from "vitest";
import { validatePdf } from "./publication-documents";
describe("PDF upload feedback", () => {
  it("accepts exactly 25 MiB and rejects a byte over the default limit", () => {
    const file = new File(["%PDF-"], "paper.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", {
      value: 25 * 1024 * 1024,
      configurable: true,
    });
    expect(validatePdf(file)).toBeNull();
    Object.defineProperty(file, "size", { value: 25 * 1024 * 1024 + 1 });
    expect(validatePdf(file)).toContain("25 MiB");
  });
  it("rejects empty files and wrong MIME types", () => {
    expect(
      validatePdf(new File([], "paper.pdf", { type: "application/pdf" })),
    ).toContain("empty");
    expect(
      validatePdf(new File(["text"], "paper.pdf", { type: "text/plain" })),
    ).toContain("PDF");
  });
});
