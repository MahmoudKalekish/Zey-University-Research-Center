import { CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { Area, Project, Publication, Researcher } from "../types";
import { Badge } from "./ui";
export function AreaCard({ x }: { x: Area }) {
  return (
    <Link className="card area-card" to={`/research-areas?area=${x.slug}`}>
      <div className="icon-mark">{x.name.slice(0, 2)}</div>
      <h3>{x.name}</h3>
      <p>{x.description}</p>
      {x._count && (
        <small>
          {x._count.projects} projects · {x._count.publications} publications
        </small>
      )}
    </Link>
  );
}
export function ResearcherCard({ x }: { x: Researcher }) {
  return (
    <Link className="card person-card" to={`/researchers/${x.slug}`}>
      <div className="avatar">
        {x.name
          .split(" ")
          .slice(-2)
          .map((s) => s[0])
          .join("")}
      </div>
      <div>
        <h3>{x.name}</h3>
        <strong>{x.position}</strong>
        <p>{x.affiliation}</p>
        <div className="tags">
          {x.areas?.slice(0, 2).map((a) => (
            <Badge key={a.area.id}>{a.area.name}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
export function ProjectCard({ x }: { x: Project }) {
  return (
    <Link className="card project-card" to={`/projects/${x.slug}`}>
      <div className="card-top">
        <Badge>{x.status === "ACTIVE" ? "Active" : x.status}</Badge>
        <span>{new Date(x.startDate).getFullYear()}</span>
      </div>
      <h3>{x.title}</h3>
      <p>{x.description}</p>
      <div className="tags">
        {x.areas?.slice(0, 2).map((a) => (
          <Badge key={a.area.id}>{a.area.name}</Badge>
        ))}
      </div>
      <small>
        <Users size={15} />
        {x.researchers?.length || 0} researchers
      </small>
    </Link>
  );
}
export function PublicationCard({ x }: { x: Publication }) {
  return (
    <Link className="publication-row" to={`/publications/${x.slug}`}>
      <div className="pub-date">
        <strong>{new Date(x.publicationDate).getFullYear()}</strong>
        <span>{x.type.replaceAll("_", " ")}</span>
      </div>
      <div>
        <h3>{x.title}</h3>
        <p>{x.authors?.map((a) => a.researcher.name).join(", ")}</p>
        <small>{x.venue}</small>
      </div>
    </Link>
  );
}
export function EventCard({ x }: { x: any }) {
  return (
    <article className="event-card">
      <div className="date-box">
        <strong>{new Date(x.startDate).getDate()}</strong>
        <span>
          {new Date(x.startDate).toLocaleDateString("en", { month: "short" })}
        </span>
      </div>
      <div>
        <h3>{x.title}</h3>
        <p>
          <CalendarDays size={15} />
          {new Date(x.startDate).toLocaleDateString("en", {
            dateStyle: "long",
          })}
        </p>
        <p>
          <MapPin size={15} />
          {x.location}
        </p>
      </div>
    </article>
  );
}
