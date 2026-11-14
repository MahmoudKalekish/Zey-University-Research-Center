import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Container, Loading, PageHero } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";
import type { Area } from "../types";

type Status = { status: "PENDING" | "APPROVED" | "REJECTED" };
export function ResearcherApplication() {
  const { user, loading } = useAuth();
  return (
    <>
      <PageHero
        eyebrow="Researcher access"
        title="Apply to become a researcher"
        text="Tell the center about your affiliation, research plan, and what you intend to contribute."
      />
      <Container className="draft-layout">
        {loading ? (
          <Loading />
        ) : !user ? (
          <p>
            <Link to="/login">Sign in</Link> or{" "}
            <Link to="/register">create an account</Link> to start an
            application.
          </p>
        ) : user.role !== "VISITOR" ? (
          <p>
            You already have elevated access.{" "}
            <Link to={user.role === "ADMIN" ? "/admin" : "/researcher"}>
              Open your workspace
            </Link>
            .
          </p>
        ) : (
          <ApplicationForm email={user.email} />
        )}
      </Container>
    </>
  );
}
function ApplicationForm({ email }: { email: string }) {
  const status = useFetch<Status | null>("/researcher-applications/me");
  const areas = useFetch<Area[]>("/areas");
  const [submitted, setSubmitted] = useState<Status>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = submitted ?? status.data;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form) as Record<string, string>;
    setBusy(true);
    setError("");
    try {
      setSubmitted(
        await api<Status>("/researcher-applications", {
          method: "POST",
          body: JSON.stringify({
            ...data,
            consent: form.has("consent"),
            keywords: data
              .keywords!.split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }),
        }),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not submit the application.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (status.loading || areas.loading) return <Loading />;
  if (status.error || areas.error)
    return <p role="alert">{status.error || areas.error}</p>;
  if (current)
    return (
      <section className="form-card" aria-live="polite">
        <h2>
          {current.status === "PENDING"
            ? "Application under review"
            : current.status === "REJECTED"
              ? "Application not approved"
              : "Application approved"}
        </h2>
        <p>
          {current.status === "PENDING"
            ? "An administrator will verify your institutional affiliation and review your proposal. Check this page for your status."
            : current.status === "REJECTED"
              ? "Contact the center if you need help with the decision."
              : "Your researcher workspace will be available shortly."}
        </p>
      </section>
    );
  return (
    <form className="form-card" onSubmit={submit}>
      <h2>Institutional affiliation</h2>
      <label>
        Applicant type
        <select name="category" required defaultValue="">
          <option value="" disabled>
            Select your role
          </option>
          <option value="STUDENT">Student</option>
          <option value="FACULTY">Faculty / doctor</option>
          <option value="RESEARCH_STAFF">Research staff</option>
          <option value="EXTERNAL_COLLABORATOR">External collaborator</option>
        </select>
      </label>
      <label>
        University or institution
        <input name="institution" required minLength={3} maxLength={150} />
      </label>
      <label>
        Department or program
        <input name="department" required minLength={2} maxLength={150} />
      </label>
      <label>
        Institutional email
        <input
          name="institutionalEmail"
          type="email"
          required
          maxLength={254}
          value={email}
          readOnly
        />
      </label>
      <p className="field-hint">
        This is your account email. Apply using an account registered with your
        institution-issued email.
      </p>
      <h2>Research plan</h2>
      <label>
        Primary research area
        <select name="areaId" required defaultValue="">
          <option value="" disabled>
            Choose an area
          </option>
          {areas.data?.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        What do you want to research or submit?
        <textarea
          name="proposal"
          required
          minLength={80}
          maxLength={2000}
          rows={4}
        />
        <small>
          At least 80 characters. Describe the topic, objective, and approach.
        </small>
      </label>
      <label>
        What work or study are you doing now?
        <textarea
          name="experience"
          required
          minLength={40}
          maxLength={1600}
          rows={3}
        />
        <small>At least 40 characters. Include relevant experience.</small>
      </label>
      <label>
        Who will benefit and how?
        <textarea
          name="benefit"
          required
          minLength={40}
          maxLength={1600}
          rows={3}
        />
        <small>At least 40 characters. Explain the expected benefit.</small>
      </label>
      <label>
        Research keywords
        <input
          name="keywords"
          required
          maxLength={500}
          placeholder="e.g. digital twins, sensing, urban planning"
        />
        <small>Enter 3–8 distinct keywords separated by commas.</small>
      </label>
      <label className="check-field">
        <input type="checkbox" name="consent" required /> I confirm these
        details are accurate and agree that the center may contact my
        institution to verify my affiliation.
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
