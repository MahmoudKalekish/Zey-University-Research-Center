import { useState, type FormEvent } from "react";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";
import { Loading } from "./ui";

interface Application {
  id: string;
  category: string;
  institution: string;
  department: string;
  institutionalEmail: string;
  applicantEmail: string;
  area: { name: string };
  user: { firstName: string; lastName: string; email: string };
  proposal: string;
  experience: string;
  benefit: string;
  keywords: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
}

export function ResearcherApplicationReview() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const results = useFetch<{ items: Application[]; total: number }>(
    "/admin/researcher-applications?" +
      new URLSearchParams({
        q: query,
        status: filter,
        page: String(page),
        refresh: String(version),
      }),
  );
  return (
    <section className="application-queue">
      <form
        className="form-card"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(
            String(
              new FormData(event.currentTarget).get("keywords") || "",
            ).trim(),
          );
          setPage(1);
        }}
      >
        <label>
          Search applications
          <input
            name="keywords"
            maxLength={100}
            placeholder="Keyword, research area, name or institution"
          />
        </label>
        <label>
          Status
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <button className="button">Search</button>
      </form>
      {message && <p role="status">{message}</p>}
      {results.loading ? (
        <Loading />
      ) : results.error ? (
        <p role="alert">{results.error}</p>
      ) : !results.data?.items.length ? (
        <p>No matching applications.</p>
      ) : (
        results.data.items.map((item) => (
          <ReviewCard
            key={item.id}
            item={item}
            onDone={(decision) => {
              setMessage(
                decision === "APPROVED"
                  ? "Application approved. Researcher access is active."
                  : "Application rejected.",
              );
              setVersion((n) => n + 1);
            }}
          />
        ))
      )}
      <div className="document-actions">
        <button
          className="button ghost"
          disabled={page < 2}
          onClick={() => setPage((n) => n - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="button ghost"
          disabled={page * 20 >= (results.data?.total ?? 0)}
          onClick={() => setPage((n) => n + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
function ReviewCard({
  item,
  onDone,
}: {
  item: Application;
  onDone: (decision: string) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const decision = String(form.get("decision"));
    if (decision === "APPROVED" && !form.has("verified")) {
      setError(
        "Verify the applicant’s identity and affiliation with their institution before approving.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(
        "/admin/researcher-applications/" +
          encodeURIComponent(item.id) +
          "/review",
        {
          method: "POST",
          body: JSON.stringify({
            decision,
            note: form.get("note"),
            verified: form.has("verified"),
          }),
        },
      );
      onDone(decision);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="card">
      <summary>
        <strong>
          {item.user.firstName} {item.user.lastName}
        </strong>{" "}
        · {item.area.name} · {item.status}
      </summary>
      <p>
        {item.category.replaceAll("_", " ")} · {item.institution} ·{" "}
        {item.department}
      </p>
      <p>
        Account: {item.applicantEmail} · Institutional email:{" "}
        {item.institutionalEmail}
      </p>
      <p>
        <strong>Proposal:</strong> {item.proposal}
      </p>
      <p>
        <strong>Current work:</strong> {item.experience}
      </p>
      <p>
        <strong>Expected benefit:</strong> {item.benefit}
      </p>
      <p>
        <strong>Keywords:</strong> {item.keywords.join(", ")}
      </p>
      {item.reviewNote && (
        <p>
          <strong>Review note:</strong> {item.reviewNote}
        </p>
      )}
      {item.status === "PENDING" && (
        <form className="form-card" onSubmit={review}>
          <label>
            Decision
            <select name="decision" defaultValue="" required>
              <option value="" disabled>
                Choose a decision
              </option>
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
            </select>
          </label>
          <label className="check-field">
            <input name="verified" type="checkbox" /> I independently confirmed
            the applicant’s identity and affiliation with their institution
            using an official contact or directory.
          </label>
          <label>
            Review note
            <textarea
              name="note"
              minLength={10}
              maxLength={1000}
              rows={3}
              required
              placeholder="Record the verification method or reason. Do not include ID numbers."
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            Save decision
          </button>
        </form>
      )}
    </details>
  );
}
