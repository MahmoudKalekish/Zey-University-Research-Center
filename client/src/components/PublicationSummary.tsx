import { AnswerText } from "./AnswerText";
import { useState } from "react";
import { useProcessingResource } from "../hooks/useProcessingResource";
import {
  publicationPath,
  requestSummary,
} from "../services/publication-documents";
import {
  isProcessing,
  type SummaryDetailLevel,
  type SummaryStatus,
  type StructuredSummary,
} from "../types/publication-document";
import { PageEvidence } from "./PageEvidence";
const sections = [
  ["inShort", "In Short"],
  ["researchObjective", "Research Objective"],
  ["methodology", "Methodology"],
  ["keyFindings", "Key Findings"],
  ["conclusions", "Conclusions"],
  ["limitations", "Limitations"],
  ["whyItMatters", "Why It Matters"],
] as const;
function SummaryLevel({
  slug,
  level,
  managed,
}: {
  slug: string;
  level: SummaryDetailLevel;
  managed: boolean;
}) {
  const job = useProcessingResource<SummaryStatus>(
    `${publicationPath(slug)}/summary?detailLevel=${level}`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function generate() {
    setBusy(true);
    setError("");
    try {
      job.setData(
        await requestSummary(slug, level, job.data?.status === "READY"),
      );
      job.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Summary unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  const content = job.data?.content;
  const isResume = Boolean(
    content && "kind" in content && content.kind === "RESUME",
  );
  return (
    <div aria-live="polite">
      {(job.error || error) && (
        <p className="form-error" role="alert">
          {job.error || error}
        </p>
      )}
      {job.loading && <p role="status">Loading summary…</p>}
      {isProcessing(job.data?.status) && (
        <p role="status">
          Generating the summary from all document pages… You can return later.
        </p>
      )}
      {job.data?.status === "FAILED" && (
        <p role="alert">
          {job.data.failureMessage || "Summary generation failed."}
        </p>
      )}
      {!job.loading && !isProcessing(job.data?.status) && !isResume && (
        <button className="button" onClick={generate} disabled={busy}>
          {busy
            ? "Queuing…"
            : !job.data
              ? "Generate summary"
              : job.data.status === "READY" && job.data.mode === "OLLAMA"
                ? "Refresh summary"
                : "Retry summary"}
        </button>
      )}
      {job.data?.status === "READY" && content && (
        <>
          <p className="status">
            {isResume
              ? "CV overview · drawn from the PDF"
              : job.data.mode === "OLLAMA"
                ? "Page-supported summary"
                : "Document passages · AI summary unavailable"}
          </p>
          {"kind" in content ? (
            <>
              <p>
                Key details organized by section. Open a cited page to check the
                original.
              </p>
              {content.evidence.map((item) => (
                <section key={item.section} className="summary-section">
                  <h3>{item.section}</h3>
                  <AnswerText text={item.text} />
                  <PageEvidence slug={slug} pages={item.pages} />
                </section>
              ))}
            </>
          ) : "notice" in content ? (
            <>
              <p>{content.notice}</p>
              <h3>Publication metadata</h3>
              <p>{content.metadata.abstract}</p>
              {content.evidence.map((item, index) => (
                <section key={index} className="summary-section">
                  <h3>{item.section}</h3>
                  <AnswerText text={item.text} />
                  <PageEvidence
                    managed={managed}
                    slug={slug}
                    pages={item.pages}
                  />
                </section>
              ))}
            </>
          ) : (
            <>
              {sections.map(([key, label]) => {
                const section = (content as StructuredSummary)[key];
                return (
                  section &&
                  section.pages.length > 0 &&
                  section.text.trim().toLowerCase() !==
                    "not stated in the document" && (
                    <section className="summary-section" key={key}>
                      <h3>{label}</h3>
                      <AnswerText text={section.text} />
                      <PageEvidence
                        managed={managed}
                        slug={slug}
                        pages={section.pages}
                      />
                    </section>
                  )
                );
              })}
              {content.keywords.length > 0 && (
                <section className="summary-section">
                  <h3>Keywords</h3>
                  <div className="tags">
                    {content.keywords.map((keyword) => (
                      <span className="badge" key={keyword}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
export function PublicationSummary({
  slug,
  available,
  managed = false,
}: {
  slug: string;
  available: boolean;
  managed?: boolean;
}) {
  const level = "STANDARD";
  if (!available)
    return (
      <section className="document-card">
        <h2>Document analysis</h2>
        <p>
          No processed PDF is available. This record currently contains
          publication metadata only.
        </p>
      </section>
    );
  return (
    <section className="document-card publication-summary">
      <h2>Publication summary</h2>
      <p>
        Get the key points from this PDF. Open a cited page to check the source.
      </p>
      <SummaryLevel
        key={`${slug}-${level}`}
        slug={slug}
        level={level}
        managed={managed}
      />
    </section>
  );
}
