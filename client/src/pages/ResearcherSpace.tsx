import { Navigate, Link } from "react-router-dom";
import { BookOpen, FolderKanban, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../services/api";
import {
  Container,
  Empty,
  ErrorState,
  Loading,
  PageHero,
} from "../components/ui";
import { ProjectCard, PublicationCard } from "../components/Cards";
import type { Publication, Project, Researcher } from "../types";
import { useToast } from "../components/Toast";

export function ResearcherSpace() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<
    Researcher & {
      projects: { project: Project }[];
      publications: { publication: Publication }[];
    }
  >();
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    api<any>("/researcher/me")
      .then((result) => {
        if (!result)
          throw new Error("No researcher profile is linked to this account.");
        setProfile(result);
      })
      .catch((e) => setError(e.message))
      .finally(() => setProfileLoading(false));
  }, [user]);
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (profileLoading) return <Loading />;
  if (error || !profile)
    return <ErrorState text={error || "Researcher profile not found."} />;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await api<any>("/researcher/me", {
        method: "PUT",
        body: JSON.stringify({
          biography: profile.biography,
          position: profile.position,
          affiliation: profile.affiliation,
          interests: profile.interests,
        }),
      });
      setProfile((current: any) => ({ ...current, ...updated }));
      toast.success("Your researcher profile was updated successfully.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Researcher workspace"
        title={`Welcome, ${user.firstName}`}
        text="Manage your public research profile and scientific contributions."
      />
      <Container>
        <div className="researcher-dashboard">
          <form className="form-card" onSubmit={save}>
            <h2>Public profile</h2>
            <label>
              Position
              <input
                required
                value={profile.position}
                onChange={(e) =>
                  setProfile({ ...profile, position: e.target.value })
                }
              />
            </label>
            <label>
              Affiliation
              <input
                required
                value={profile.affiliation}
                onChange={(e) =>
                  setProfile({ ...profile, affiliation: e.target.value })
                }
              />
            </label>
            <label>
              Biography
              <textarea
                rows={7}
                required
                minLength={20}
                value={profile.biography}
                onChange={(e) =>
                  setProfile({ ...profile, biography: e.target.value })
                }
              />
            </label>
            <label>
              Research interests (comma-separated)
              <input
                value={profile.interests.join(", ")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    interests: e.target.value
                      .split(",")
                      .map((x: string) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <button className="button" disabled={saving}>
              <Save />
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
          <div>
            <h2>
              <FolderKanban /> My projects
            </h2>
            <div className="cards">
              {profile.projects.length ? (
                profile.projects.map((x: any) => (
                  <ProjectCard
                    key={x.project.id}
                    x={{ ...x.project, researchers: [] }}
                  />
                ))
              ) : (
                <Empty text="You are not assigned to any projects yet." />
              )}
            </div>
            <h2>
              <BookOpen /> My publications
            </h2>
            <Link className="button small" to="/researcher/publications/new">
              New publication draft
            </Link>
            {["DRAFT", "READY_FOR_REVIEW", "PUBLISHED", "ARCHIVED"].map(
              (status) => (
                <section key={status} className="workspace-publications">
                  <h3>
                    {status === "DRAFT"
                      ? "Editable drafts"
                      : status === "READY_FOR_REVIEW"
                        ? "Under review"
                        : status === "PUBLISHED"
                          ? "Published work"
                          : "Archived work"}
                  </h3>
                  <div className="publication-list">
                    {profile.publications
                      .filter(
                        (entry) => entry.publication.workflowStatus === status,
                      )
                      .map(({ publication }) => (
                        <article
                          className="researcher-pub"
                          key={publication.id}
                        >
                          {status === "PUBLISHED" ? (
                            <PublicationCard
                              x={{ ...publication, authors: [] }}
                            />
                          ) : (
                            <div>
                              <h3>{publication.title}</h3>
                              <p>{publication.venue}</p>
                            </div>
                          )}
                          <span className="status">
                            {status.replaceAll("_", " ")}
                          </span>
                          <Link
                            className="button small ghost"
                            to={`/researcher/publications/${publication.id}`}
                          >
                            {status === "DRAFT"
                              ? "Edit draft"
                              : "View submission"}
                          </Link>
                        </article>
                      ))}
                    {!profile.publications.some(
                      (entry) => entry.publication.workflowStatus === status,
                    ) && <p>No publications in this stage.</p>}
                  </div>
                </section>
              ),
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
