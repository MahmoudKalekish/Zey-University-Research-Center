import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Database } from "lucide-react";
import { api } from "../services/api";
import { Container, PageHero } from "../components/ui";
import { useToast } from "../components/Toast";
type Msg = {
  role: "user" | "assistant";
  text: string;
  sources?: any[];
  mode?: string;
};
export function Assistant() {
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hello! I can find publications, researchers, projects, and research areas in the center's database. What would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useRef(localStorage.getItem("chatSession") || crypto.randomUUID());
  useEffect(() => localStorage.setItem("chatSession", id.current), []);
  async function send(text = input) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await api<any>("/ai/ask", {
        method: "POST",
        body: JSON.stringify({ question: text, sessionId: id.current }),
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: r.answer, sources: r.sources, mode: r.mode },
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
          <h2>AI grounded in our data</h2>
          <p>
            The assistant searches the center's records first. It never relies
            on fabricated research information.
          </p>
          <span>
            <Database /> Verifiable sources
          </span>
          <span>
            <Sparkles /> Optional local Ollama
          </span>
        </aside>
        <section className="chat">
          <div className="messages">
            {messages.map((m, i) => (
              <div className={`message ${m.role}`} key={i}>
                <div>
                  {m.role === "assistant" && <Bot />}
                  <p>{m.text}</p>
                </div>
                {m.sources && m.sources.length > 0 && (
                  <section className="sources">
                    <small>
                      CENTER SOURCES ·{" "}
                      {m.mode === "ollama" ? "OLLAMA RESPONSE" : "SEARCH MODE"}
                    </small>
                    {m.sources.map((s) => (
                      <a
                        href={`/${s.type === "publication" ? "publications" : s.type === "researcher" ? "researchers" : s.type === "project" ? "projects" : "research-areas"}/${s.slug}`}
                        key={s.id}
                      >
                        {s.title}
                      </a>
                    ))}
                  </section>
                )}
              </div>
            ))}
            {busy && (
              <div className="message assistant">
                <div>
                  <Bot />
                  <p className="dots">Searching the database…</p>
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
