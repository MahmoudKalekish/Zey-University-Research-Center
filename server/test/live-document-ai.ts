import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createSummaryEngine,
  buildSummaryFallback,
} from "../src/services/documents/summary.service.js";
import {
  generateLocalJson,
  LocalGenerationError,
} from "../src/services/documents/ollama.service.js";
import { createDocumentQuestionService } from "../src/services/documents/question.service.js";
import { env } from "../src/config/env.js";
import { extractPdfPages } from "../src/services/documents/pdf.service.js";
import { chunkPages } from "../src/services/documents/chunk.service.js";
import { demoPaperPages } from "../prisma/fixtures/publication-documents.js";
import { createPdf } from "./fixtures/pdf.js";

const publication = {
  title: "Original ZURC water sensor test fixture",
  abstract: "An original test document about water sensor evaluation.",
  authors: ["ZURC Test Researcher"],
  publicationDate: "2026-10-01",
};
const pages = Array.from({ length: 12 }, () => "");
pages[0] =
  "Introduction\nEvaluate whether water sensors detect leaks in a campus water network.";
pages[3] =
  "Methods\nResearchers installed 12 sensors and observed them for 30 days.\nThey compared sensor alerts with manually confirmed leaks.";
pages[7] =
  "Results\nThe sensors detected 9 of 10 confirmed leaks.\nTwo sensor alerts were false alarms.";
pages[11] =
  "Conclusion\nSensors helped detect campus water leaks.\n\nLimitations\nThis study evaluated one campus for only 30 days.\nLonger studies at other campuses are needed.";
if (process.argv.includes("--dense"))
  pages.splice(0, pages.length, ...demoPaperPages);
const directory = await mkdtemp(path.join(tmpdir(), "zurc-live-ai-"));
let extracted;
try {
  const pdfPath = path.join(directory, "original-research-fixture.pdf");
  await writeFile(pdfPath, createPdf(pages));
  extracted = await extractPdfPages(pdfPath);
} finally {
  await rm(directory, { recursive: true, force: true });
}
assert.equal(extracted.pageCount, 12);
const chunks = chunkPages(extracted.pages);
if (process.argv.includes("--dense")) {
  for (let page = 1; page <= 12; page++)
    assert.ok(chunks.some((chunk) => chunk.pageStart === page));
}
assert.ok(
  chunks.some(
    (chunk) => chunk.pageStart === 12 && chunk.content.includes("30 days"),
  ),
);
console.log(
  `PASS: extracted all ${extracted.pageCount} PDF pages into ${chunks.length} page/section-aware chunks`,
);

console.log(
  "Testing real local Qwen; original test content only; no database writes.",
);
const engine = createSummaryEngine({
  generate: async (prompt, schema, options) => {
    const result = await generateLocalJson(prompt, schema, options);
    console.log(prompt.split("\n")[0], JSON.stringify(result));
    return result;
  },
});
if (!process.argv.includes("--questions-only")) {
  const levels = process.argv.includes("--all-levels")
    ? (["SHORT", "STANDARD", "DETAILED"] as const)
    : (["STANDARD"] as const);
  for (const level of levels) {
    const summary = await engine.summarize(publication, chunks, level);
    console.log(JSON.stringify(summary, null, 2));
    assert.ok(
      summary.keyFindings.pages.includes(8),
      "Results must cite page 8",
    );
    assert.match(
      summary.inShort.text,
      /9|nine|ten confirmed leaks/i,
      "The overview must include a result, not only introductory context",
    );
    assert.match(
      summary.keyFindings.text,
      /9|false alarms/i,
      "Summary must contain actual results",
    );
    assert.match(summary.inShort.text, /sensor/i);
    assert.ok(
      !/one (?:of the )?sensors? .*9/i.test(summary.inShort.text),
      "Do not invent a single-sensor outcome",
    );
    if ("conclusions" in summary) {
      assert.ok(
        summary.conclusions.pages.includes(12),
        "Conclusion must cite final page 12",
      );
      assert.match(summary.limitations.text, /campus|30 days/i);
    }
    console.log(`PASS: live ${level} summary with later-page evidence`);
  }
}

const record = {
  publication: { id: "fixture", slug: "fixture", title: publication.title },
  chunks: chunks.map((chunk) => ({
    ...chunk,
    id: `chunk-${chunk.chunkIndex}`,
    normalizedText: chunk.content.toLowerCase(),
  })),
};
const questions = createDocumentQuestionService({
  loadDocument: async () => record,
  generate: async (prompt, schema) => {
    const output = await generateLocalJson(prompt, schema, {
      maxOutputTokens: 700,
    });
    console.log("QUESTION_GENERATION", JSON.stringify(output));
    return output;
  },
  persist: async () => undefined,
});
const access = { sessionId: "fixture-only", canManage: false };
const answer = await questions.answerDocumentQuestion(
  "fixture",
  "How many confirmed leaks were detected?",
  access,
);
console.log(JSON.stringify(answer, null, 2));
assert.equal(answer.mode, "OLLAMA");
assert.match(answer.answer, /9|nine/i);
assert.ok(answer.evidence.some((item) => item.pageStart === 8));
const absent = await questions.answerDocumentQuestion(
  "fixture",
  "What is the moon population?",
  access,
);
assert.match(absent.answer, /cannot be determined/i);
assert.equal(absent.evidence.length, 0);
console.log("PASS: live question answer and unsupported-question refusal");

const previousUrl = env.OLLAMA_URL;
env.OLLAMA_URL = "http://127.0.0.1:9";
try {
  const offlineAnswer = await questions.answerDocumentQuestion(
    "fixture",
    "How many confirmed leaks were detected?",
    access,
  );
  assert.equal(offlineAnswer.mode, "FALLBACK");
  assert.ok(offlineAnswer.evidence.some((item) => item.pageStart === 8));
  await assert.rejects(
    () => engine.summarize(publication, chunks, "STANDARD"),
    LocalGenerationError,
  );
  const fallback = buildSummaryFallback(publication, chunks);
  assert.ok(fallback.sourcePages.includes(8));
  assert.ok(fallback.sourcePages.includes(12));
  console.log(
    "PASS: unreachable-local-service fallback with later-page evidence",
  );
} finally {
  env.OLLAMA_URL = previousUrl;
}
