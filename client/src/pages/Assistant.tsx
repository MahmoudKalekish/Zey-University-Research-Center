import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AnswerText } from "../components/AnswerText";
import { useFetch } from "../hooks/useFetch";
import type { Publication } from "../types";
import { DocumentQuestionPanel } from "../components/DocumentQuestionPanel";
import { PublicationSummary } from "../components/PublicationSummary";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, BookOpen, ArrowUpRight } from "lucide-react";
import { api } from "../services/api";
import { Container, PageHero } from "../components/ui";
import { useToast } from "../components/Toast";
type Source = {
  id: string;
  title: string;
  slug: string;
  type: "publication" | "researcher" | "project" | "area";
};
const sourceLabels = {
  publication: "Publication",
  researcher: "Researcher",
  project: "Project",
  area: "Research area",
};
function sourcePath(source: Source) {
  if (source.type === "area")
    return `/research-areas?area=${encodeURIComponent(source.slug)}`;
  return `/${source.type}s/${encodeURIComponent(source.slug)}`;
}
type Msg = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
};
export function Assistant() {
  const [parameters] = useSearchParams();
  const publication = parameters.get("publication");
  return publication ? (
    <PublicationAssistant key={publication} slug={publication} />
  ) : (
    <CenterAssistant />
  );
}
function PublicationAssistant({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { data, loading, error } = useFetch<Publication>(
    `/publications/${encodeURIComponent(slug)}`,
    user?.role,
  );
  return (
    <>
      <PageHero
        eyebrow="Publication analysis"
        title="Read and ask the research"
        text="Summaries and answers use the selected research PDF stored in ZURC."
      />
      <Container>
        {loading ? (
          <p role="status">Loading publication…</p>
        ) : error || !data ? (
          <p role="alert">{error || "Publication not found."}</p>
        ) : data.documentRestricted ? (
          <p>
            Document analysis requires approved researcher access.{" "}
            <Link to={user ? "/researcher-application" : "/login"}>
              {user ? "Apply for access" : "Sign in"}
            </Link>
            .
          </p>
        ) : (
          <>
            <PublicationSummary
              slug={data.slug}
              available={Boolean(data.documentCapabilities?.canSummarize)}
            />
            {data.documentCapabilities?.canAsk && (
              <DocumentQuestionPanel slug={data.slug} title={data.title} />
            )}
          </>
        )}
      </Container>
    </>
  );
}
function CenterAssistant() {
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hello! I can find publications, researchers, projects, and research areas from the center. What would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const latestQuestion = useRef<HTMLDivElement>(null);
  const messagePane = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!busy || !latestQuestion.current || !messagePane.current) return;
    messagePane.current.scrollTop = latestQuestion.current.offsetTop - 12;
  }, [busy]);
  const id = useRef(localStorage.getItem("chatSession") || crypto.randomUUID());
  useEffect(() => localStorage.setItem("chatSession", id.current), []);
  async function send(text = input) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await api<{ answer: string; sources?: Source[] }>("/ai/ask", {
        method: "POST",
        body: JSON.stringify({ question: text, sessionId: id.current }),
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: r.answer, sources: r.sources },
      ]);
    } catch (e: any) {
      const message = `I could not complete that search: ${e.message}`;
      setMessages((m) => [...m, { role: "assistant", text: message }]);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHero
        eyebrow="Augmented discovery"
        title="Research assistant"
        text="Explore the center's research collection using natural language."
      />
      <Container className="chat-layout">
        <aside className="chat-info">
          <Bot />
          <h2>Explore the center’s research</h2>
          <p>
            The assistant searches the center's records first. Open a
            publication to summarize its uploaded PDF or ask questions about its
            full text.
          </p>
          <span>
            <BookOpen /> Sources you can open
          </span>
        </aside>
        <section className="chat">
          <div
            className="messages"
            role="log"
            aria-label="Research conversation"
            ref={messagePane}
          >
            {messages.map((m, i) => (
              <div
                className={`message ${m.role}`}
                ref={
                  m.role === "user" && i === messages.length - 1
                    ? latestQuestion
                    : undefined
                }
                key={i}
              >
                {m.role === "assistant" && (
                  <span className="assistant-avatar">
                    <Bot aria-hidden="true" size={18} />
                  </span>
                )}
                <div className="message-bubble">
                  <span className="message-author">
                    {m.role === "assistant" ? "Research assistant" : "You"}
                  </span>
                  {m.role === "assistant" ? (
                    <AnswerText text={m.text} />
                  ) : (
                    <p className="message-question">{m.text}</p>
                  )}
                  {!!m.sources?.length && (
                    <section
                      className="answer-sources"
                      aria-label="Sources for this answer"
                    >
                      <h3>
                        Sources <span>{m.sources.length}</span>
                      </h3>
                      <ul>
                        {m.sources.map((source) => (
                          <li key={`${source.type}-${source.id}`}>
                            <Link to={sourcePath(source)}>
                              <span>
                                <small>{sourceLabels[source.type]}</small>
                                <strong>{source.title}</strong>
                              </span>
                              <ArrowUpRight size={16} aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="message assistant">
                <span className="assistant-avatar">
                  <Bot aria-hidden="true" size={18} />
                </span>
                <div className="message-bubble">
                  <p className="dots" role="status">
                    Looking for relevant research…
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="suggestions">
            {[
              "Which projects are active?",
              "Who works on cybersecurity?",
              "Publications about smart cities",
            ].map((x) => (
              <button onClick={() => send(x)} key={x}>
                {x}
              </button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask your question"
              placeholder="Ask your question…"
            />
            <button
              className="assistant-send"
              disabled={busy}
              aria-label="Send"
            >
              <Send />
            </button>
          </form>
        </section>
      </Container>
    </>
  );
}
