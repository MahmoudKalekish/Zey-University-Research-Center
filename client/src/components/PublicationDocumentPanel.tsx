import { useState } from "react";
import { api } from "../services/api";
import {
  openManagedPdf,
  publicationPath,
  transitionPublication,
  uploadDocument,
  validatePdf,
} from "../services/publication-documents";
import { useProcessingResource } from "../hooks/useProcessingResource";
import {
  isProcessing,
  type DocumentStatus,
  type ManagedPublication,
} from "../types/publication-document";
import { PublicationSummary } from "./PublicationSummary";
import { DocumentQuestionPanel } from "./DocumentQuestionPanel";
export function PublicationDocumentPanel({
  publication,
  canPublish,
  onChanged,
}: {
  publication: ManagedPublication;
  canPublish: boolean;
  onChanged: (publication: ManagedPublication) => void;
}) {
  const job = useProcessingResource<DocumentStatus>(
    `${publicationPath(publication.id)}/document/status`,
  );
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  const editable = canPublish || publication.workflowStatus === "DRAFT";
  const ready = job.data?.status === "READY";
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "The operation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function transition(action: string) {
    await perform(async () => {
      onChanged(
        await transitionPublication(publication.id, action, canPublish, note),
      );
      setMessage("Publication workflow updated.");
      setArchiveConfirm(false);
    });
  }
  return (
    <section className="document-management document-card">
      <h2>Document and review</h2>
      <p className="status">
        {publication.workflowStatus.replaceAll("_", " ")}
      </p>
      {publication.reviewNote && (
        <p className="review-note">
          <strong>Review note:</strong> {publication.reviewNote}
        </p>
      )}
      {(error || job.error) && (
        <p className="form-error" role="alert">
          {error || job.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div aria-live="polite">
        {job.loading ? (
          <p>Loading document status…</p>
        ) : !job.data ? (
          <p>No PDF uploaded yet.</p>
        ) : (
          <>
            <p>
              <strong>{job.data.originalName}</strong> ·{" "}
              {(job.data.sizeBytes / 1024 / 1024).toFixed(2)} MiB ·{" "}
              {job.data.pageCount ?? "—"} pages
            </p>
            <p role="status">
              {job.data.status.replaceAll("_", " ")}
              {isProcessing(job.data.status) && " · Extracting every page…"}
            </p>
            {job.data.failureMessage && (
              <p className="form-error">{job.data.failureMessage}</p>
            )}
          </>
        )}
      </div>
      {editable && (
        <div className="document-upload">
          <label>
            Publication PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                setFile(undefined);
                setError("");
                if (selected) {
                  const invalid = validatePdf(selected);
                  if (invalid) setError(invalid);
                  else setFile(selected);
                }
              }}
            />
          </label>
          <p>
            Maximum 25 MiB. Text-based PDF required; scanned pages need OCR
            before upload.
          </p>
          {canPublish && publication.workflowStatus === "PUBLISHED" && (
            <p>
              Replacing the PDF removes public access until it is reviewed and
              published again.
            </p>
          )}
          <button
            type="button"
            className="button"
            disabled={!file || busy || isProcessing(job.data?.status)}
            onClick={() =>
              void perform(async () => {
                if (!file) return;
                job.setData(await uploadDocument(publication.id, file));
                job.refresh();
                setFile(undefined);
                setPreview(false);
                onChanged(
                  publication.workflowStatus === "PUBLISHED"
                    ? { ...publication, workflowStatus: "READY_FOR_REVIEW" }
                    : publication,
                );
                setMessage("PDF uploaded. Processing has started.");
              })
            }
          >
            {busy ? "Working…" : job.data ? "Replace PDF" : "Upload PDF"}
          </button>
        </div>
      )}
      {!editable && (
        <p>
          Submitted publications are locked. An administrator must return this
          publication for changes.
        </p>
      )}
      <div className="document-actions">
        {ready && (
          <>
            <button
              type="button"
              className="button ghost"
              disabled={busy}
              onClick={() =>
                void perform(() => openManagedPdf(publication.slug))
              }
            >
              Read PDF
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => setPreview((value) => !value)}
            >
              Preview analysis
            </button>
          </>
        )}
        {canPublish && job.data?.status === "FAILED" && (
          <button
            type="button"
            className="button ghost"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                job.setData(
                  await api<DocumentStatus>(
                    `/admin/publications/${publication.id}/document/retry`,
                    { method: "POST" },
                  ),
                );
                job.refresh();
              })
            }
          >
            Retry processing
          </button>
        )}
        {publication.workflowStatus === "DRAFT" && (
          <button
            type="button"
            className="button"
            disabled={!ready || busy}
            onClick={() => void transition("submit")}
          >
            Submit for review
          </button>
        )}
        {canPublish && publication.workflowStatus === "READY_FOR_REVIEW" && (
          <button
            type="button"
            className="button"
            disabled={!ready || busy}
            onClick={() => void transition("publish")}
          >
            Publish
          </button>
        )}
        {canPublish && publication.workflowStatus === "PUBLISHED" && (
          <button
            type="button"
            className="button ghost"
            disabled={busy}
            onClick={() => setArchiveConfirm(true)}
          >
            Archive
          </button>
        )}
      </div>
      {!ready && (
        <p>
          A successfully processed PDF is required before submission or
          publication.
        </p>
      )}
      {canPublish &&
        ["READY_FOR_REVIEW", "ARCHIVED"].includes(
          publication.workflowStatus,
        ) && (
          <div className="review-actions">
            <label>
              Return note
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                minLength={5}
                maxLength={2000}
                rows={3}
              />
            </label>
            <button
              type="button"
              className="button ghost"
              disabled={note.trim().length < 5 || busy}
              onClick={() => void transition("return")}
            >
              Return for changes
            </button>
          </div>
        )}
      {archiveConfirm && (
        <div className="review-note">
          <p>Archive this publication and remove it from public access?</p>
          <div className="document-actions">
            <button
              type="button"
              className="button"
              onClick={() => void transition("archive")}
              disabled={busy}
            >
              Confirm archive
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => setArchiveConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {preview && ready && (
        <>
          <PublicationSummary slug={publication.slug} available managed />
          <DocumentQuestionPanel
            key={publication.slug}
            slug={publication.slug}
            title={publication.title}
            managed
          />
        </>
      )}
    </section>
  );
}
