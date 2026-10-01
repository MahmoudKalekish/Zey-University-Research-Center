import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../services/api";
import type { Publication } from "../types";
import { Container, Loading, PageHero } from "../components/ui";
import { PublicationDocumentPanel } from "../components/PublicationDocumentPanel";
interface DraftForm {
  title: string;
  abstract: string;
  venue: string;
  keywords: string[];
  publicationDate: string;
  type: string;
}
const emptyDraft = (): DraftForm => ({
  title: "",
  abstract: "",
  venue: "",
  keywords: [],
  publicationDate: new Date().toISOString().slice(0, 10),
  type: "JOURNAL_ARTICLE",
});
export function ResearcherPublicationDraft() {
  const { user, loading } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [publication, setPublication] = useState<Publication>();
  const [form, setForm] = useState<DraftForm>(emptyDraft);
  const [fetching, setFetching] = useState(Boolean(id));
  const [keywordsText, setKeywordsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!id || !user) return;
    let active = true;
    setFetching(true);
    api<Publication>(`/researcher/publications/${encodeURIComponent(id)}`)
      .then((result) => {
        if (active) {
          setPublication(result);
          setKeywordsText(result.keywords.join(", "));
          setForm({
            ...result,
            publicationDate: result.publicationDate.slice(0, 10),
          });
        }
      })
      .catch((failure: Error) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [id, user]);
  if (loading || fetching) return <Loading />;
  if (user?.role !== "RESEARCHER") return <Navigate to="/login" />;
  const editable = !publication || publication.workflowStatus === "DRAFT";
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    setMessage("");
    try {
      const editing = Boolean(publication);
      const keywords = keywordsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const input = editing
        ? {
            title: form.title,
            abstract: form.abstract,
            venue: form.venue,
            keywords,
          }
        : { ...form, keywords, areaIds: [] };
      const result = await api<Publication>(
        `/researcher/publications${publication ? `/${publication.id}` : ""}`,
        { method: editing ? "PUT" : "POST", body: JSON.stringify(input) },
      );
      setPublication((current) => ({ ...current, ...result }));
      if (!editing)
        navigate(`/researcher/publications/${result.id}`, { replace: true });
      setMessage(
        editing
          ? "Changes saved."
          : "Draft created. You are assigned as an author. Upload the research PDF below.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to save draft.",
      );
      if (failure instanceof ApiError) setFieldErrors(failure.fieldErrors);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHero
        eyebrow="Researcher workspace"
        title={publication ? "My publication" : "New publication draft"}
        text="Prepare the publication and full PDF, then submit it for administrator review."
      />
      <Container className="draft-layout">
        <Link to="/researcher">← My workspace</Link>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {(!id || publication) && (
          <>
            <form onSubmit={save} className="form-card">
              <h2>Publication metadata</h2>
              {!editable && (
                <p>
                  Metadata is locked after submission. Ask the administrator to
                  return it for changes.
                </p>
              )}
              {message && <p role="status">{message}</p>}
              <fieldset disabled={!editable || busy}>
                <label>
                  Title
                  <input
                    value={form.title}
                    required
                    minLength={3}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                  />
                  {fieldErrors.title?.[0] && (
                    <span className="field-error">{fieldErrors.title[0]}</span>
                  )}
                </label>
                <label>
                  Abstract
                  <textarea
                    value={form.abstract}
                    required
                    minLength={20}
                    rows={6}
                    onChange={(event) =>
                      setForm({ ...form, abstract: event.target.value })
                    }
                  />
                  {fieldErrors.abstract?.[0] && (
                    <span className="field-error">
                      {fieldErrors.abstract[0]}
                    </span>
                  )}
                </label>
                <label>
                  Journal / conference
                  <input
                    value={form.venue}
                    required
                    minLength={2}
                    onChange={(event) =>
                      setForm({ ...form, venue: event.target.value })
                    }
                  />
                </label>
                <label>
                  Keywords (comma-separated)
                  <input
                    value={keywordsText}
                    onChange={(event) => setKeywordsText(event.target.value)}
                  />
                </label>
                {!publication && (
                  <div className="draft-metadata-grid">
                    <label>
                      Publication date
                      <input
                        type="date"
                        required
                        value={form.publicationDate}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            publicationDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Publication type
                      <select
                        value={form.type}
                        onChange={(event) =>
                          setForm({ ...form, type: event.target.value })
                        }
                      >
                        {[
                          "JOURNAL_ARTICLE",
                          "CONFERENCE_PAPER",
                          "BOOK_CHAPTER",
                          "THESIS",
                          "REPORT",
                          "DATASET",
                        ].map((type) => (
                          <option key={type} value={type}>
                            {type.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </fieldset>
              {editable && (
                <button className="button" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : publication
                      ? "Save changes"
                      : "Create draft"}
                </button>
              )}
            </form>
            {publication && (
              <PublicationDocumentPanel
                publication={publication}
                canPublish={false}
                onChanged={(updated) =>
                  setPublication((current) =>
                    current ? { ...current, ...updated } : current,
                  )
                }
              />
            )}
          </>
        )}
      </Container>
    </>
  );
}
