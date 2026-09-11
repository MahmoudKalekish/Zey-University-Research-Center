import type { ReactNode } from "react";
import { LoaderCircle, SearchX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
export const Container = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`container ${className}`}>{children}</div>;
export const SectionTitle = ({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) => (
  <div className="section-title">
    {eyebrow && <span>{eyebrow}</span>}
    <h2>{title}</h2>
    {text && <p>{text}</p>}
  </div>
);
export const Loading = () => (
  <div className="state">
    <LoaderCircle className="spin" />
    <p>Loading data…</p>
  </div>
);
export const Empty = ({ text = "No results found." }: { text?: string }) => (
  <div className="state">
    <SearchX />
    <p>{text}</p>
  </div>
);
export const ErrorState = ({ text }: { text: string }) => (
  <div className="state error">
    <p>{text}</p>
  </div>
);
export const Badge = ({ children }: { children: ReactNode }) => (
  <span className="badge">{children}</span>
);
export const PageHero = ({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) => (
  <header className="page-hero">
    <Container>
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </Container>
  </header>
);
export const ArrowLink = ({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) => (
  <Link className="arrow-link" to={to}>
    {children}
    <ArrowRight size={16} />
  </Link>
);
