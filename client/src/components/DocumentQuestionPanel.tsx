import { useEffect, useRef, useState } from "react";
import { askDocument } from "../services/publication-documents";
import type { DocumentAnswer } from "../types/publication-document";
import { PageEvidence } from "./PageEvidence";
export function DocumentQuestionPanel({
  slug,
  title,
  managed = false,
}: {
  slug: string;
  title: string;
  managed?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<
    Array<DocumentAnswer & { question: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionId = useRef(crypto.randomUUID());
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    const asked = question.trim();
    setBusy(true);
    setError("");
    try {
      const answer = await askDocument(slug, asked, sessionId.current);
      if (active.current) {
        setAnswers((previous) => [...previous, { ...answer, question: asked }]);
        setQuestion("");
      }
    } catch (failure) {
      if (active.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to answer this question.",
        );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <section
      className="document-question document-card"
      aria-labelledby="document-question-title"
    >
      <h2 id="document-question-title">Ask this publication</h2>
      <p className="context-banner">
        Reading: <strong>{title}</strong>. Answers use this uploaded PDF and
        show supporting pages.
      </p>
      {!answers.length && (
        <p>
          Ask about the objective, methods, findings, or limitations. Missing
          information will be identified.
        </p>
      )}
      <div aria-live="polite">
        {answers.map((answer, index) => (
          <article className="document-answer" key={index}>
            <h3>{answer.question}</h3>
            <span className="status">
              {answer.mode === "OLLAMA"
                ? "Local Qwen"
                : "Document evidence fallback"}
            </span>
            <p>{answer.answer}</p>
            {answer.evidence.map((evidence) => (
              <blockquote key={evidence.chunkId}>
                <p>{evidence.snippet}</p>
                <PageEvidence
                  managed={managed}
                  slug={slug}
                  pages={
                    evidence.pageStart === evidence.pageEnd
                      ? [evidence.pageStart]
                      : [evidence.pageStart, evidence.pageEnd]
                  }
                />
              </blockquote>
            ))}
          </article>
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <form onSubmit={ask} className="document-question-form">
        <label>
          Question about this publication
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={2000}
            required
            rows={3}
            placeholder="What did the study find?"
          />
        </label>
        <button className="button" disabled={busy || !question.trim()}>
          {busy ? "Reading document…" : "Ask"}
        </button>
      </form>
    </section>
  );
}
