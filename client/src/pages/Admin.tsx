import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  BookOpen,
  FolderKanban,
  CalendarDays,
  Newspaper,
  Library,
  MessageSquare,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../services/api";
import { Empty, ErrorState, Loading } from "../components/ui";
import { AdminEditor } from "../components/AdminEditor";
import { useToast } from "../components/Toast";
const sections = [
  ["users", "Users", Users],
  ["researchers", "Researchers", FlaskConical],
  ["areas", "Research areas", Library],
  ["projects", "Projects", FolderKanban],
  ["publications", "Publications", BookOpen],
  ["events", "Events", CalendarDays],
  ["news", "News", Newspaper],
  ["resources", "Resources", Library],
  ["messages", "Messages", MessageSquare],
];
export function Admin() {
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const [active, setActive] = useState("dashboard"),
    [stats, setStats] = useState<any>(),
    [items, setItems] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<any | null>(null),
    [pendingDelete, setPendingDelete] = useState<any | null>(null);
  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    setBusy(true);
    setError("");
    api<any>(active === "dashboard" ? "/admin/stats" : `/admin/${active}`)
      .then((x) => (active === "dashboard" ? setStats(x) : setItems(x)))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [active, user]);
  if (loading) return <Loading />;
  if (user?.role !== "ADMIN") return <Navigate to="/login" />;
  async function remove(id: string) {
    try {
      await api(`/admin/${active}/${id}`, { method: "DELETE" });
      setItems((x) => x.filter((i) => i.id !== id));
      setPendingDelete(null);
      toast.success("Record deleted successfully.");
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  return (
    <div className="admin-shell">
      <aside>
        <div className="brand light">
          <span>ZR</span>
          <div>
            Administration<small>Zey University</small>
          </div>
        </div>
        <nav>
          <button
            className={active === "dashboard" ? "active" : ""}
            onClick={() => setActive("dashboard")}
          >
            <LayoutDashboard />
            Overview
          </button>
          {sections.map(([k, n, I]: any) => (
            <button
              key={k}
              className={active === k ? "active" : ""}
              onClick={() => setActive(k)}
            >
              <I />
              {n}
            </button>
          ))}
        </nav>
        <button onClick={logout}>
          <LogOut />
          Sign out
        </button>
      </aside>
      <main>
        <header>
          <div>
            <small>ADMINISTRATOR AREA</small>
            <h1>
              {active === "dashboard"
                ? "Overview"
                : String(
                    sections.find((x) => x[0] === active)?.[1] || "Management",
                  )}
            </h1>
          </div>
          {active !== "dashboard" && active !== "messages" && (
            <button className="button small" onClick={() => setEditing({})}>
              <Plus />
              Add record
            </button>
          )}
        </header>
        {busy ? (
          <Loading />
        ) : error ? (
          <ErrorState text={error} />
        ) : active === "dashboard" ? (
          <>
            <div className="admin-stats">
              {stats &&
                Object.entries(stats).map(([k, v]: any) => (
                  <article key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </article>
                ))}
            </div>
            <section className="admin-welcome">
              <h2>Welcome, {user.firstName}.</h2>
              <p>
                Here is the current state of the platform. All figures are
                loaded directly from PostgreSQL.
              </p>
            </section>
          </>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <strong>
                          {x.title || x.name || `${x.firstName} ${x.lastName}`}
                        </strong>
                        <small>{x.email || x.slug}</small>
                      </td>
                      <td>
                        {x.position || x.type || x.role || x.subject || "—"}
                      </td>
                      <td>
                        <BadgeText x={x} />
                      </td>
                      <td className="table-actions">
                        <button
                          className="table-edit"
                          onClick={() => setEditing(x)}
                        >
                          {active === "messages" ? "View" : "Edit"}
                        </button>
                        {active !== "users" && (
                          <button
                            className="danger-icon"
                            onClick={() => setPendingDelete(x)}
                            aria-label={`Delete ${x.title || x.name || "record"}`}
                          >
                            <Trash2 />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <Empty text="No records have been added yet." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {editing && (
        <AdminEditor
          entity={active}
          item={editing.id ? editing : undefined}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setItems((old) =>
              editing.id
                ? old.map((x) => (x.id === saved.id ? saved : x))
                : [saved, ...old],
            );
            setEditing(null);
          }}
        />
      )}
      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <h2>Delete this record?</h2>
            <p>
              This will delete “{pendingDelete.title || pendingDelete.name}” and
              its dependent relationships.
            </p>
            <div>
              <button
                className="button ghost"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                className="button danger"
                onClick={() => remove(pendingDelete.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function BadgeText({ x }: { x: any }) {
  return (
    <span className="status">
      {x.active === false || x.published === false
        ? "Inactive"
        : x.status || "Active"}
    </span>
  );
}
