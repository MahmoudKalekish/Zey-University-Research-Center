import { useParams, Link } from "react-router-dom";
import { Mail, ExternalLink, CalendarDays, Users } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { Container, ErrorState, Loading, Badge } from "../components/ui";
import { PublicationCard, ResearcherCard } from "../components/Cards";
import type { Project, Publication, Researcher } from "../types";
export function ResearcherDetail() {
  const { slug } = useParams();
  const {
    data: x,
    loading,
    error,
  } = useFetch<Researcher & { publications: any[]; projects: any[] }>(
    `/researchers/${slug}`,
  );
  if (loading) return <Loading />;
  if (error || !x)
    return (
      <Container>
        <ErrorState text={error || "Researcher not found."} />
      </Container>
    );
  return (
    <>
      <header className="profile-hero">
        <Container>
          <div className="avatar large">
            {x.name
              .split(" ")
              .slice(-2)
              .map((s) => s[0])
              .join("")}
          </div>
          <div>
            <span>RESEARCHER PROFILE</span>
            <h1>{x.name}</h1>
            <h3>{x.position}</h3>
            <p>{x.affiliation}</p>
            <a href={`mailto:${x.email}`}>
              <Mail /> {x.email}
            </a>
          </div>
        </Container>
      </header>
      <Container className="detail-grid">
        <article>
          <h2>Biography</h2>
          <p>{x.biography}</p>
          <h2>Research interests</h2>
          <div className="tags">
            {x.interests.map((i) => (
              <Badge key={i}>{i}</Badge>
            ))}
          </div>
          <h2>Publications</h2>
          <div className="publication-list">
            {x.publications.map((a) => (
              <PublicationCard
                key={a.publication.id}
                x={{ ...a.publication, authors: [] } as any}
              />
            ))}
          </div>
        </article>
        <aside>
          <h3>Research areas</h3>
          {x.areas.map((a) => (
            <Link key={a.area.id} to="/research-areas">
              {a.area.name}
            </Link>
          ))}
          <h3>Projects</h3>
          {x.projects.map((a) => (
            <Link key={a.project.id} to={`/projects/${a.project.slug}`}>
              {a.project.title}
            </Link>
          ))}
        </aside>
      </Container>
    </>
  );
}
export function ProjectDetail() {
  const { slug } = useParams();
  const {
    data: x,
    loading,
    error,
  } = useFetch<Project & { publications: Publication[] }>(`/projects/${slug}`);
  if (loading) return <Loading />;
  if (error || !x)
    return (
      <Container>
        <ErrorState text={error || "Project not found."} />
      </Container>
    );
  return (
    <>
      <header className="detail-hero">
        <Container>
          <Badge>{x.status}</Badge>
          <h1>{x.title}</h1>
          <p>{x.description}</p>
          <div>
            <span>
              <CalendarDays /> Since{" "}
              {new Date(x.startDate).toLocaleDateString("en")}
            </span>
            <span>
              <Users /> {x.researchers.length} members
            </span>
          </div>
        </Container>
      </header>
      <Container className="detail-grid">
        <article>
          <h2>Project overview</h2>
          <p>{x.abstract}</p>
          <h2>Objectives</h2>
          <ul>
            {(x as any).objectives.map((o: string) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <h2>Related publications</h2>
          <div className="publication-list">
            {x.publications.map((p) => (
              <PublicationCard key={p.id} x={p} />
            ))}
          </div>
        </article>
        <aside>
          <h3>Research team</h3>
          {x.researchers.map((a) => (
            <ResearcherCard key={a.researcher.id} x={a.researcher} />
          ))}
          <h3>Funding</h3>
          <p>{x.funding}</p>
        </aside>
      </Container>
    </>
  );
}
export function PublicationDetail() {
  const { slug } = useParams();
  const {
    data: x,
    loading,
    error,
  } = useFetch<Publication>(`/publications/${slug}`);
  if (loading) return <Loading />;
  if (error || !x)
    return (
      <Container>
        <ErrorState text={error || "Publication not found."} />
      </Container>
    );
  return (
    <>
      <header className="detail-hero">
        <Container>
          <Badge>{x.type.replaceAll("_", " ")}</Badge>
          <h1>{x.title}</h1>
          <p>{x.authors.map((a) => a.researcher.name).join(" · ")}</p>
        </Container>
      </header>
      <Container className="detail-grid">
        <article>
          <h2>Abstract</h2>
          <p>{x.abstract}</p>
          <h2>Keywords</h2>
          <div className="tags">
            {x.keywords.map((k) => (
              <Badge key={k}>{k}</Badge>
            ))}
          </div>
        </article>
        <aside>
          <h3>Publication details</h3>
          <p>
            <b>Published</b>
            <br />
            {new Date(x.publicationDate).toLocaleDateString("en", {
              dateStyle: "long",
            })}
          </p>
          <p>
            <b>Journal / conference</b>
            <br />
            {x.venue}
          </p>
          {x.doi && (
            <p>
              <b>DOI</b>
              <br />
              {x.doi}
            </p>
          )}
          {x.externalUrl && (
            <a className="button small" href={x.externalUrl} target="_blank">
              Open publication <ExternalLink />
            </a>
          )}
        </aside>
      </Container>
    </>
  );
}
