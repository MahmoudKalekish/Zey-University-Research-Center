import {
  ArrowRight,
  Bot,
  Sparkles,
  BookOpen,
  Microscope,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";
import {
  Container,
  SectionTitle,
  Loading,
  ErrorState,
  ArrowLink,
} from "../components/ui";
import {
  ProjectCard,
  PublicationCard,
  ResearcherCard,
  EventCard,
} from "../components/Cards";
import type { Project, Publication, Researcher } from "../types";
type HomeData = {
  stats: Record<string, number>;
  featuredProjects: Project[];
  recentPublications: Publication[];
  researchers: Researcher[];
  events: any[];
  news: any[];
};
export function Home() {
  const { data, loading, error } = useFetch<HomeData>("/home");
  return (
    <>
      <section className="hero">
        <Container>
          <div className="hero-copy">
            <span className="kicker">
              <Sparkles size={15} /> Research · Innovation · Society
            </span>
            <h1>
              Research that shapes <em>the world of tomorrow.</em>
            </h1>
            <p>
              An interdisciplinary center where researchers, partners, and
              students turn major questions into sustainable solutions.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/projects">
                Explore our research <ArrowRight size={17} />
              </Link>
              <Link className="button ai-cta" to="/assistant">
                <Bot size={17} /> Ask the assistant
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orb one" />
            <div className="orb two" />
            <div className="research-window">
              <small>RESEARCH OBSERVATORY</small>
              <h3>From data to discovery</h3>
              <div className="signal">
                {[35, 60, 48, 82, 70, 96, 77, 88].map((n, i) => (
                  <i key={i} style={{ height: `${n}%` }} />
                ))}
              </div>
              <div className="window-row">
                <span>
                  <Microscope /> 5 research areas
                </span>
                <span>
                  <BookOpen /> Open science
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>
      {loading ? (
        <Loading />
      ) : error ? (
        <Container>
          <ErrorState text={error} />
        </Container>
      ) : (
        data && (
          <>
            <section className="stats">
              <Container>
                {[
                  [data.stats.publications, "Publications", BookOpen],
                  [data.stats.researchers, "Researchers", Users],
                  [data.stats.projects, "Projects", Microscope],
                  [data.stats.areas, "Research areas", Sparkles],
                ].map(([n, l, I]: any) => (
                  <div key={l}>
                    <I />
                    <strong>{n}</strong>
                    <span>{l}</span>
                  </div>
                ))}
              </Container>
            </section>
            <section>
              <Container>
                <SectionTitle
                  eyebrow="Our work"
                  title="Research projects designed for impact"
                  text="Our teams work across disciplines and alongside real-world partners."
                />
                <div className="cards three">
                  {data.featuredProjects.map((x) => (
                    <ProjectCard x={x} key={x.id} />
                  ))}
                </div>
                <ArrowLink to="/projects">Explore all projects</ArrowLink>
              </Container>
            </section>
            <section className="soft">
              <Container>
                <SectionTitle
                  eyebrow="Research output"
                  title="Recent publications"
                />
                <div className="publication-list">
                  {data.recentPublications.map((x) => (
                    <PublicationCard x={x} key={x.id} />
                  ))}
                </div>
                <ArrowLink to="/publications">Browse the library</ArrowLink>
              </Container>
            </section>
            <section>
              <Container>
                <SectionTitle
                  eyebrow="Our community"
                  title="Meet the people behind the research"
                />
                <div className="cards four">
                  {data.researchers.map((x) => (
                    <ResearcherCard x={x} key={x.id} />
                  ))}
                </div>
              </Container>
            </section>
            <section className="ai-band">
              <Container>
                <div>
                  <span>
                    <Bot /> RESEARCH ASSISTANT
                  </span>
                  <h2>
                    Have a question? Explore our work in natural language.
                  </h2>
                  <p>
                    The assistant searches only the center's database and always
                    shows its sources.
                  </p>
                  <Link className="button ai-cta ai-cta-light" to="/assistant">
                    Start exploring <ArrowRight />
                  </Link>
                </div>
                <div className="prompt-list">
                  <p>“Who works on cybersecurity?”</p>
                  <p>“Find publications about smart cities.”</p>
                  <p>“Which projects are currently active?”</p>
                </div>
              </Container>
            </section>
            <section>
              <Container>
                <SectionTitle eyebrow="Calendar" title="Upcoming events" />
                <div className="cards three">
                  {data.events.map((x) => (
                    <EventCard x={x} key={x.id} />
                  ))}
                </div>
              </Container>
            </section>
          </>
        )
      )}
    </>
  );
}
