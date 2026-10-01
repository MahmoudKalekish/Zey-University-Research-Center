import type { PrismaClient } from "@prisma/client";
import { createPdf } from "../../test/fixtures/pdf.js";
import { storePdf } from "../../src/services/documents/storage.service.js";
import { extractPdfPages } from "../../src/services/documents/pdf.service.js";
import { chunkPages } from "../../src/services/documents/chunk.service.js";

// Original fictional research content, written for teaching. It is not a real study.
export const demoPaperPages = [
  "Introduction\nZURC Teaching Fixture: Campus Water Sensor Evaluation\nThis fictional study evaluates water sensors in a campus network.\nThe objective is to assess whether sensor alerts help detect leaks.\nAll participants, observations, and numbers are synthetic demo data.",
  "Introduction\nThe pilot addresses water loss in university infrastructure.\nReliable leak detection could help maintenance teams act earlier.\nThe study does not evaluate municipal networks or other campuses.",
  "Methods\nResearchers selected twelve measurement locations on one campus.\nThe fictional pilot lasted thirty days.\nThe same maintenance team checked alerts throughout the pilot.",
  "Methods\nResearchers installed 12 sensors and observed them for 30 days.\nThey compared sensor alerts with manually confirmed leaks.\nMaintenance staff recorded each inspection in a daily log.",
  "Methods\nAn alert was classified as correct after a manual inspection.\nAlerts without an observed leak were recorded as false alarms.\nThis procedure was used consistently across the twelve locations.",
  "Results\nThe daily logs contained ten manually confirmed leaks.\nNine of these leaks were also detected by the sensor system.\nOne confirmed leak did not produce a sensor alert.",
  "Results\nThe sensor system recorded two additional false alarms.\nThe study did not measure the volume of water saved.\nCost effectiveness was not evaluated during this teaching pilot.",
  "Results\nThe sensors detected 9 of 10 confirmed leaks.\nTwo sensor alerts were false alarms.\nThese results describe the combined system, not an individual sensor.",
  "Discussion\nManual inspections remain necessary to verify sensor alerts.\nA missed leak and two false alarms show that alerts are imperfect.\nThe findings should be interpreted within this limited pilot.",
  "Discussion\nThe prototype could support earlier maintenance inspections.\nThis potential benefit requires evaluation with longer observations.\nThe synthetic pilot does not establish performance in real networks.",
  "Conclusion\nSensors helped detect campus water leaks in this fictional pilot.\nThe combined system identified nine of ten confirmed leaks.\nThe study supports further evaluation rather than wider deployment.",
  "Conclusion\nSensors helped detect campus water leaks.\nLimitations\nThis study evaluated one campus for only 30 days.\nLonger studies at other campuses are needed.\nNo seasonal, economic, or municipal network evaluation was performed.",
];
export async function seedPublicationDocuments(
  database: PrismaClient,
  authorId: string,
  areaId: string,
) {
  const create = (
    title: string,
    slug: string,
    workflowStatus: "DRAFT" | "READY_FOR_REVIEW" | "PUBLISHED",
  ) =>
    database.publication.create({
      data: {
        title,
        slug,
        workflowStatus,
        abstract:
          "An original fictional teaching paper evaluating a campus water sensor pilot. All data is synthetic; read the PDF for methods, results, conclusions, and limitations.",
        venue: "ZURC Teaching Collection · Synthetic Data",
        publicationDate: new Date("2026-10-01"),
        type: "REPORT",
        keywords: ["water", "sensors", "campus", "teaching"],
        ...(workflowStatus === "PUBLISHED" ? { publishedAt: new Date() } : {}),
        ...(workflowStatus === "READY_FOR_REVIEW"
          ? { submittedAt: new Date() }
          : {}),
        authors: { create: [{ researcherId: authorId, authorOrder: 0 }] },
        areas: { create: [{ areaId }] },
      },
    });
  for (const [title, slug, workflow] of [
    [
      "Campus Water Sensor Evaluation (Teaching Fixture)",
      "campus-water-sensor-evaluation",
      "PUBLISHED",
    ],
    [
      "Campus Water Sensors: Awaiting Review",
      "campus-water-sensors-review",
      "READY_FOR_REVIEW",
    ],
  ] as const) {
    const publication = await create(title, slug, workflow);
    const stored = await storePdf(createPdf(demoPaperPages));
    const extracted = await extractPdfPages(stored.absolutePath);
    await database.publicationDocument.create({
      data: {
        publicationId: publication.id,
        originalName: "zurc-campus-water-sensors.pdf",
        mimeType: "application/pdf",
        storageKey: stored.storageKey,
        sha256: stored.sha256,
        sizeBytes: stored.sizeBytes,
        status: "READY",
        pageCount: extracted.pageCount,
        characterCount: extracted.pages.reduce(
          (total, page) => total + page.text.length,
          0,
        ),
        processedAt: new Date(),
        chunks: { create: chunkPages(extracted.pages) },
      },
    });
  }
  await create("Campus Sensor Draft", "campus-sensor-draft", "DRAFT");
  const failed = await create(
    "Scanned Paper: OCR Required",
    "scanned-paper-ocr-required",
    "DRAFT",
  );
  const stored = await storePdf(createPdf([""]));
  await database.publicationDocument.create({
    data: {
      publicationId: failed.id,
      originalName: "scanned-teaching-fixture.pdf",
      mimeType: "application/pdf",
      storageKey: stored.storageKey,
      sha256: stored.sha256,
      sizeBytes: stored.sizeBytes,
      status: "FAILED",
      failureCode: "OCR_REQUIRED",
      failureMessage:
        "No usable embedded text was found. This PDF requires OCR.",
    },
  });
}
