import { Navigate } from "react-router-dom";
import { BookOpen, FolderKanban, Save, PenLine, X } from "lucide-react";
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
import { useToast } from "../components/Toast";

export function ResearcherSpace() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<any>();
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publicationSaving, setPublicationSaving] = useState(false);
  const [publicationError, setPublicationError] = useState("");
  const [editingPublication, setEditingPublication] = useState<any>();
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

  async function savePublication(e: React.FormEvent) {
    e.preventDefault();
    setPublicationSaving(true);
    setPublicationError("");
    try {
      const updated = await api<any>(
        `/researcher/publications/${editingPublication.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: editingPublication.title,
            abstract: editingPublication.abstract,
            venue: editingPublication.venue,
            keywords: editingPublication.keywords,
          }),
        },
      );
      setProfile((current: any) => ({
        ...current,
        publications: current.publications.map((x: any) =>
          x.publication.id === updated.id
            ? { ...x, publication: { ...x.publication, ...updated } }
            : x,
        ),
      }));
      setEditingPublication(undefined);
      toast.success("Publication updated successfully.");
    } catch (e: any) {
      setPublicationError(e.message);
      toast.error(e.message);
    } finally {
      setPublicationSaving(false);
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
            <div className="publication-list">
              {profile.publications.length ? (
                profile.publications.map((x: any) => (
                  <div className="researcher-pub" key={x.publication.id}>
                    <PublicationCard x={{ ...x.publication, authors: [] }} />
                    <button
                      onClick={() => setEditingPublication(x.publication)}
                    >
                      <PenLine /> Edit
                    </button>
                  </div>
                ))
              ) : (
                <Empty text="You have no publications yet." />
              )}
            </div>
          </div>
        </div>
      </Container>
      {editingPublication && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="admin-editor" onSubmit={savePublication}>
            <header>
              <div>
                <small>PUBLICATION</small>
                <h2>Edit my publication</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingPublication(undefined)}
                aria-label="Close dialog"
              >
                <X />
              </button>
            </header>
            <div className="editor-fields">
              {publicationError && (
                <div className="form-error editor-error" role="alert">
                  {publicationError}
                </div>
              )}
              <label>
                Title
                <input
                  required
                  minLength={3}
                  value={editingPublication.title}
                  onChange={(e) =>
                    setEditingPublication({
                      ...editingPublication,
                      title: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Journal / conference
                <input
                  required
                  minLength={2}
                  value={editingPublication.venue}
                  onChange={(e) =>
                    setEditingPublication({
                      ...editingPublication,
                      venue: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Abstract
                <textarea
                  required
                  minLength={20}
                  rows={6}
                  value={editingPublication.abstract}
                  onChange={(e) =>
                    setEditingPublication({
                      ...editingPublication,
                      abstract: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Keywords (comma-separated)
                <input
                  value={editingPublication.keywords.join(", ")}
                  onChange={(e) =>
                    setEditingPublication({
                      ...editingPublication,
                      keywords: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
            </div>
            <footer>
              <button
                type="button"
                className="button ghost"
                onClick={() => setEditingPublication(undefined)}
              >
                Cancel
              </button>
              <button className="button" disabled={publicationSaving}>
                {publicationSaving ? "Saving…" : "Save changes"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
