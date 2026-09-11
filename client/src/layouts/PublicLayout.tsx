import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Menu,
  X,
  Search,
  ArrowUpRight,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Container } from "../components/ui";
const nav = [
  ["Home", "/"],
  ["About", "/about"],
  ["Research areas", "/research-areas"],
  ["Researchers", "/researchers"],
  ["Projects", "/projects"],
  ["Publications", "/publications"],
  ["News", "/news"],
];
export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  return (
    <>
      <div className="topbar">
        <Container>
          Zey University{" "}
          <span>Center of excellence for interdisciplinary research</span>
        </Container>
      </div>
      <header className="navbar">
        <Container>
          <Link to="/" className="brand">
            <span>ZR</span>
            <div>
              Research Center<small>Zey University</small>
            </div>
          </Link>
          <nav className={open ? "open" : ""}>
            {nav.map(([n, u]) => (
              <NavLink onClick={() => setOpen(false)} key={u} to={u}>
                {n}
              </NavLink>
            ))}
            <NavLink
              to="/search"
              className="nav-search"
              aria-label="Search research"
              title="Search research"
            >
              <Search size={19} />
            </NavLink>
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                {user.role !== "VISITOR" && (
                  <Link
                    className="icon-btn"
                    to={user.role === "ADMIN" ? "/admin" : "/researcher"}
                  >
                    <LayoutDashboard size={18} />
                  </Link>
                )}
                <button className="icon-btn" onClick={logout}>
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="button small" to="/login">
                Sign in
              </Link>
            )}
            <button
              className="menu"
              onClick={() => setOpen(!open)}
              aria-label="Navigation menu"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </Container>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <Container className="footer-grid">
          <div>
            <Link to="/" className="brand light">
              <span>ZR</span>
              <div>
                Research Center<small>Zey University</small>
              </div>
            </Link>
            <p>
              Advancing knowledge through open, responsible research that
              benefits society.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link to="/research-areas">Research areas</Link>
            <Link to="/publications">Publications</Link>
            <Link to="/events">Events</Link>
            <Link to="/resources">Resources</Link>
          </div>
          <div>
            <h4>The center</h4>
            <Link to="/about">About us</Link>
            <Link to="/researchers">Our researchers</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/assistant">AI assistant</Link>
          </div>
          <div>
            <h4>Contact us</h4>
            <p>
              Science Campus
              <br />
              Beirut, Lebanon
            </p>
            <a href="mailto:contact@zurc-demo.edu">
              contact@zurc-demo.edu <ArrowUpRight size={14} />
            </a>
          </div>
        </Container>
        <Container className="footer-bottom">
          © 2026 Zey University Research Center{" "}
          <span>Open science · Ethics · Impact</span>
        </Container>
      </footer>
    </>
  );
}
