import { useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import {
  AreaCard,
  ProjectCard,
  PublicationCard,
  ResearcherCard,
  EventCard,
} from "../components/Cards";
import {
  Container,
  PageHero,
  Loading,
  Empty,
  ErrorState,
  Badge,
} from "../components/ui";
import type { Area, Page, Project, Publication, Researcher } from "../types";
function Pagination({
  meta,
  set,
}: {
  meta: Page<any>["meta"];
  set: (n: number) => void;
}) {
  if (meta.pages < 2) return null;
  return (
    <div className="pagination">
      <button disabled={meta.page === 1} onClick={() => set(meta.page - 1)}>
        <ChevronLeft />
      </button>
      <span>
        Page {meta.page} of {meta.pages}
      </span>
      <button
        disabled={meta.page === meta.pages}
        onClick={() => set(meta.page + 1)}
      >
        <ChevronRight />
      </button>
    </div>
  );
}
function Catalog<T>({
  kind,
  title,
  text,
  render,
}: {
  kind: string;
  title: string;
  text: string;
  render: (x: T) => React.ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const { data, loading, error } = useFetch<Page<T>>(`/${kind}?${params}`);
  const { data: filterAreas } = useFetch<Area[]>("/areas");
  const { data: filterResearchers } = useFetch<Page<Researcher>>(
    "/researchers?limit=24",
  );
  function update(k: string, v: string) {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== "page") n.set("page", "1");
    setParams(n);
  }
  return (
    <>
      <PageHero eyebrow="Explore" title={title} text={text} />
      <Container>
        <div className="filterbar">
          <label>
            <Search />
            <input
              value={q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search by keyword…"
            />
          </label>
          {kind === "projects" && (
            <select
              value={params.get("status") || ""}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
          )}
          {kind === "publications" && (
            <>
              <select
                value={params.get("area") || ""}
                onChange={(e) => update("area", e.target.value)}
                aria-label="Research area"
              >
                <option value="">All research areas</option>
                {filterAreas?.map((x) => (
                  <option value={x.slug} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select
                value={params.get("author") || ""}
                onChange={(e) => update("author", e.target.value)}
                aria-label="Author"
              >
                <option value="">All authors</option>
                {filterResearchers?.items.map((x) => (
                  <option value={x.slug} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select
                value={params.get("year") || ""}
                onChange={(e) => update("year", e.target.value)}
                aria-label="Year"
              >
                <option value="">All years</option>
                {[2026, 2025, 2024, 2023, 2022].map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
              <select
                value={params.get("type") || ""}
                onChange={(e) => update("type", e.target.value)}
              >
                <option value="">All publication types</option>
                <option value="JOURNAL_ARTICLE">Journal article</option>
                <option value="CONFERENCE_PAPER">Conference paper</option>
                <option value="REPORT">Report</option>
              </select>
              <select
                value={params.get("sort") || ""}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </>
          )}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState text={error} />
        ) : !data?.items.length ? (
          <Empty />
        ) : (
          <>
            <div
              className={
                kind === "publications" ? "publication-list" : "cards three"
              }
            >
              {data.items.map((x: any) => render(x))}
            </div>
            <Pagination
              meta={data.meta}
              set={(n) => update("page", String(n))}
            />
          </>
        )}
      </Container>
    </>
  );
}
export const Researchers = () => (
  <Catalog<Researcher>
    kind="researchers"
    title="Our research community"
    text="Discover our researchers' expertise, backgrounds, and publications."
    render={(x) => <ResearcherCard key={x.id} x={x} />}
  />
);
export const Projects = () => (
  <Catalog<Project>
    kind="projects"
    title="Research projects"
    text="Interdisciplinary programs connecting laboratory work to societal impact."
    render={(x) => <ProjectCard key={x.id} x={x} />}
  />
);
export const Publications = () => (
  <Catalog<Publication>
    kind="publications"
    title="Research library"
    text="Explore the center's research output using precise filters."
    render={(x) => <PublicationCard key={x.id} x={x} />}
  />
);
export function Areas() {
  const { data, loading, error } = useFetch<Area[]>("/areas");
  return (
    <>
      <PageHero
        eyebrow="Scientific focus"
        title="Our research areas"
        text="Five complementary areas shape our scientific ambition."
      />
      <Container>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState text={error} />
        ) : !data?.length ? (
          <Empty text="No research areas are available yet." />
        ) : (
          <div className="cards three">
            {data?.map((x) => (
              <AreaCard key={x.id} x={x} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
export function ContentPage({
  kind,
  title,
  text,
}: {
  kind: "events" | "news" | "resources";
  title: string;
  text: string;
}) {
  const { data, loading, error } = useFetch<any[]>(`/content/${kind}`);
  return (
    <>
      <PageHero eyebrow="Center life" title={title} text={text} />
      <Container>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState text={error} />
        ) : !data?.length ? (
          <Empty text={`No ${kind} are available yet.`} />
        ) : (
          <div className="cards three">
            {data?.map((x) =>
              kind === "events" ? (
                <EventCard x={x} key={x.id} />
              ) : (
                <article className="card content-card" key={x.id}>
                  {kind === "news" ? (
                    <>
                      <Badge>News</Badge>
                      <h3>{x.title}</h3>
                      <p>{x.excerpt}</p>
                      <small>
                        <CalendarDays />{" "}
                        {new Date(x.publishedAt).toLocaleDateString("fr")}
                      </small>
                    </>
                  ) : (
                    <>
                      <Badge>{x.type}</Badge>
                      <h3>{x.title}</h3>
                      <p>{x.description}</p>
                      <a className="arrow-link" href={x.url} target="_blank">
                        Open resource <ExternalLink />
                      </a>
                    </>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </Container>
    </>
  );
}
