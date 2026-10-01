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
const levels: SummaryDetailLevel[] = ["SHORT", "STANDARD", "DETAILED"];
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
      job.setData(await requestSummary(slug, level));
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
      {!job.loading && (!job.data || job.data.status === "FAILED") && (
        <button className="button" onClick={generate} disabled={busy}>
          {busy ? "Queuing…" : "Generate summary"}
        </button>
      )}
      {job.data?.status === "READY" && content && (
        <>
          <p className="status">
            {job.data.mode === "OLLAMA"
              ? "Local Qwen · page-supported summary"
              : "Deterministic document evidence · fallback"}
          </p>
          {"notice" in content ? (
            <>
              <p>{content.notice}</p>
              <h3>Publication metadata</h3>
              <p>{content.metadata.abstract}</p>
              {content.evidence.map((item, index) => (
                <section key={index} className="summary-section">
                  <h3>{item.section}</h3>
                  <p>{item.text}</p>
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
                  section && (
                    <section className="summary-section" key={key}>
                      <h3>{label}</h3>
                      <p>{section.text}</p>
                      <PageEvidence
                        managed={managed}
                        slug={slug}
                        pages={section.pages}
                      />
                    </section>
                  )
                );
              })}
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
  const [level, setLevel] = useState<SummaryDetailLevel>("STANDARD");
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
        Read the uploaded paper in brief or explore its methods and findings.
        References open the supporting PDF pages.
      </p>
      <div className="document-actions" aria-label="Summary detail">
        {levels.map((value) => (
          <button
            key={value}
            className={`button ${level === value ? "" : "ghost"}`}
            aria-pressed={level === value}
            onClick={() => setLevel(value)}
          >
            {value[0] + value.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <SummaryLevel
        key={`${slug}-${level}`}
        slug={slug}
        level={level}
        managed={managed}
      />
    </section>
  );
}
