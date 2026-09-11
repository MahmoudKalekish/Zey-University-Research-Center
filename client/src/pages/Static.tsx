import { useState } from "react";
import {
  Search,
  Mail,
  MapPin,
  Phone,
  Target,
  Eye,
  Handshake,
} from "lucide-react";
import { ApiError, api } from "../services/api";
import { useToast } from "../components/Toast";
import { useFetch } from "../hooks/useFetch";
import {
  Container,
  PageHero,
  Loading,
  Empty,
  ErrorState,
  Badge,
} from "../components/ui";
export function About() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Rigorous, open, and engaged research"
        text="Since 2012, ZURC has brought disciplines together around digital and environmental transformation."
      />
      <Container>
        <section className="editorial">
          <div>
            <span>OUR MISSION</span>
            <h2>Create knowledge that matters.</h2>
          </div>
          <p>
            We bring together researchers, doctoral students, institutions, and
            companies to address complex challenges. Our model is built on open
            science, integrity, and dialogue with society.
          </p>
        </section>
        <div className="cards three values">
          {[
            [
              Target,
              "Excellence",
              "Peer-reviewed, reproducible, and ambitious research.",
            ],
            [Eye, "Openness", "Shared findings and accessible research data."],
            [
              Handshake,
              "Collaboration",
              "Solutions co-designed with our partners.",
            ],
          ].map(([I, t, p]: any) => (
            <article className="card" key={t}>
              <I />
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </Container>
    </>
  );
}
export function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [state, setState] = useState("");
  const [failed, setFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setState("");
    setFailed(false);
    setFieldErrors({});
    try {
      await api("/contact", { method: "POST", body: JSON.stringify(form) });
      setState("Your message has been sent successfully.");
      toast.success("Your message has been sent to the research center.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (e: any) {
      setState(e.message);
      setFailed(true);
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Let’s build something together"
        text="Have a question, a partnership proposal, or a project to share?"
      />
      <Container className="contact-grid">
        <div>
          <h2>Contact details</h2>
          <p>
            <MapPin /> Science Campus, Beirut
          </p>
          <p>
            <Mail /> contact@zurc-demo.edu
          </p>
          <p>
            <Phone /> +961 1 000 000
          </p>
        </div>
        <form className="form-card" onSubmit={submit}>
          {state && (
            <div className={failed ? "form-error" : "notice"} role="status">
              {state}
            </div>
          )}
          <div className="form-row">
            <label>
              Name
              <input
                required
                minLength={2}
                maxLength={100}
                aria-invalid={Boolean(fieldErrors.name?.length)}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {fieldErrors.name?.[0] && (
                <span className="field-error">{fieldErrors.name[0]}</span>
              )}
            </label>
            <label>
              Email
              <input
                type="email"
                required
                aria-invalid={Boolean(fieldErrors.email?.length)}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {fieldErrors.email?.[0] && (
                <span className="field-error">{fieldErrors.email[0]}</span>
              )}
            </label>
          </div>
          <label>
            Subject
            <input
              required
              minLength={3}
              maxLength={150}
              aria-invalid={Boolean(fieldErrors.subject?.length)}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            {fieldErrors.subject?.[0] && (
              <span className="field-error">{fieldErrors.subject[0]}</span>
            )}
          </label>
          <label>
            Message
            <textarea
              required
              minLength={10}
              maxLength={5000}
              aria-invalid={Boolean(fieldErrors.message?.length)}
              rows={6}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            {fieldErrors.message?.[0] && (
              <span className="field-error">{fieldErrors.message[0]}</span>
            )}
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      </Container>
    </>
  );
}
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data, loading, error } = useFetch<any>(
    `/search?q=${encodeURIComponent(term)}`,
  );
  const groups = data
    ? Object.entries(data).filter(([, v]: any) => v.length)
    : [];
  return (
    <>
      <PageHero
        eyebrow="Global search"
        title="Explore all our research"
        text="One search across publications, people, projects, and research areas."
      />
      <Container>
        <form
          className="global-search"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q);
          }}
        >
          <Search />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Artificial intelligence, mobility, cybersecurity…"
          />
          <button className="button search-cta">Search</button>
        </form>
        {loading && term ? (
          <Loading />
        ) : error && term ? (
          <ErrorState text={error} />
        ) : term && !groups.length ? (
          <Empty />
        ) : (
          <div className="search-results">
            {groups.map(([name, items]: any) => (
              <section key={name}>
                <h2>{name}</h2>
                {items.map((x: any) => (
                  <a
                    key={x.id}
                    href={`/${name === "researchers" ? "researchers" : name === "projects" ? "projects" : name === "publications" ? "publications" : "research-areas"}/${x.slug}`}
                  >
                    <Badge>{name}</Badge>
                    <h3>{x.title || x.name}</h3>
                    <p>{x.description || x.abstract || x.position}</p>
                  </a>
                ))}
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
