import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ApiError, api } from "../services/api";
import { PublicationDocumentPanel } from "./PublicationDocumentPanel";
import { useToast } from "./Toast";

type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  readOnly?: boolean;
};
const common: Record<string, Field[]> = {
  users: [
    { key: "firstName", label: "First name", required: true },
    { key: "lastName", label: "Last name", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "password", label: "Password", type: "password" },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: ["RESEARCHER", "ADMIN", "VISITOR"],
    },
    {
      key: "active",
      label: "Account status",
      type: "select",
      options: ["true", "false"],
    },
  ],
  areas: [
    { key: "name", label: "Name", required: true },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      required: true,
    },
    { key: "icon", label: "Icon" },
    { key: "objectives", label: "Objectives (one per line)", type: "lines" },
  ],
  researchers: [
    { key: "name", label: "Full name", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "position", label: "Position", required: true },
    { key: "affiliation", label: "Affiliation", required: true },
    { key: "biography", label: "Biography", type: "textarea", required: true },
    { key: "orcid", label: "ORCID" },
    {
      key: "interests",
      label: "Research interests (one per line)",
      type: "lines",
    },
    { key: "areaIds", label: "Research areas", type: "areas" },
  ],
  projects: [
    { key: "title", label: "Title", required: true },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      required: true,
    },
    { key: "abstract", label: "Abstract", type: "textarea", required: true },
    { key: "objectives", label: "Objectives (one per line)", type: "lines" },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["PLANNED", "ACTIVE", "COMPLETED", "SUSPENDED"],
    },
    { key: "funding", label: "Funding" },
    { key: "areaIds", label: "Research areas", type: "areas" },
    { key: "researcherIds", label: "Research team", type: "researchers" },
  ],
  publications: [
    { key: "title", label: "Title", required: true },
    { key: "abstract", label: "Abstract", type: "textarea", required: true },
    { key: "publicationDate", label: "Date", type: "date", required: true },
    { key: "venue", label: "Journal / conference", required: true },
    { key: "doi", label: "DOI" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        "JOURNAL_ARTICLE",
        "CONFERENCE_PAPER",
        "BOOK_CHAPTER",
        "THESIS",
        "REPORT",
        "DATASET",
      ],
    },
    { key: "keywords", label: "Keywords (one per line)", type: "lines" },
    { key: "externalUrl", label: "External URL", type: "url" },
    { key: "projectId", label: "Project", type: "project" },
    { key: "areaIds", label: "Research areas", type: "areas" },
    { key: "authorIds", label: "Authors", type: "researchers" },
  ],
  events: [
    { key: "title", label: "Title", required: true },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      required: true,
    },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date" },
    { key: "location", label: "Location", required: true },
  ],
  news: [
    { key: "title", label: "Title", required: true },
    { key: "excerpt", label: "Excerpt", required: true },
    { key: "content", label: "Content", type: "textarea", required: true },
    { key: "publishedAt", label: "Publication date", type: "date" },
  ],
  resources: [
    { key: "title", label: "Title", required: true },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      required: true,
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["DOCUMENT", "DATASET", "SOFTWARE", "LINK"],
    },
    { key: "url", label: "URL", type: "url", required: true },
  ],
  messages: [
    { key: "name", label: "Sender", readOnly: true },
    { key: "email", label: "Email", type: "email", readOnly: true },
    { key: "subject", label: "Subject", readOnly: true },
    {
      key: "message",
      label: "Message",
      type: "textarea",
      readOnly: true,
    },
    {
      key: "status",
      label: "Message status",
      type: "select",
      options: ["NEW", "READ", "REPLIED", "ARCHIVED"],
    },
  ],
};
export function AdminEditor({
  entity,
  item,
  onClose,
  onSaved,
}: {
  entity: string;
  item?: any;
  onClose: () => void;
  onSaved: (x: any) => void;
}) {
  const [form, setForm] = useState<any>(() => ({
    ...item,
    areaIds: item?.areas?.map((entry: { areaId: string }) => entry.areaId),
    authorIds: item?.authors?.map(
      (entry: { researcherId: string }) => entry.researcherId,
    ),
    active: item?.active ?? true,
    published: item?.published ?? true,
  }));
  const [refs, setRefs] = useState<Record<string, any[]>>({});
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    Promise.all(
      ["areas", "researchers", "projects"].map((k) =>
        api<any[]>(`/admin/${k}`).then((v) => [k, v] as const),
      ),
    )
      .then((x) => setRefs(Object.fromEntries(x)))
      .catch((e) => {
        setError(e.message);
        toast.error(`Could not load form options: ${e.message}`);
      });
  }, [toast]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
  const fields = common[entity] || [];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    const data = { ...form };
    for (const f of fields) {
      if (f.type === "select" && data[f.key] === undefined)
        data[f.key] = f.options?.[0];
      if (f.key === "active") data[f.key] = String(data[f.key]) === "true";
      if (f.key === "projectId" && data[f.key] === "") data[f.key] = null;
      if (f.type === "lines" && typeof data[f.key] === "string")
        data[f.key] = data[f.key]
          .split("\n")
          .map((x: string) => x.trim())
          .filter(Boolean);
      if (f.type === "date" && data[f.key] === "") data[f.key] = null;
    }
    try {
      const result = await api<any>(
        `/admin/${entity}${item ? `/${item.id}` : ""}`,
        { method: item ? "PUT" : "POST", body: JSON.stringify(data) },
      );
      toast.success(
        entity === "messages"
          ? "Message status updated."
          : `${item ? "Changes saved" : "Record created"} successfully.`,
      );
      onSaved(result);
    } catch (e: any) {
      setError(e.message);
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-editor-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-editor">
        <header>
          <div>
            <small>
              {entity === "messages"
                ? "CONTACT MESSAGE"
                : item
                  ? "EDIT"
                  : "NEW RECORD"}
            </small>
            <h2 id="admin-editor-title">
              {item?.title || item?.subject || item?.name || "Create record"}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          {entity === "publications" && (
            <h2 className="editor-section-title">Metadata and relationships</h2>
          )}
          <div className="editor-fields">
            {error && (
              <div className="form-error editor-error" role="alert">
                {error}
              </div>
            )}
            {fields.map((f) => (
              <label key={f.key}>
                {f.label}
                {f.type === "textarea" || f.type === "lines" ? (
                  <textarea
                    rows={f.type === "lines" ? 3 : 5}
                    required={f.required}
                    readOnly={f.readOnly}
                    aria-invalid={Boolean(fieldErrors[f.key]?.length)}
                    value={
                      Array.isArray(form[f.key])
                        ? form[f.key].join("\n")
                        : form[f.key] || ""
                    }
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                ) : f.type === "select" ? (
                  <select
                    value={form[f.key] || f.options?.[0]}
                    aria-invalid={Boolean(fieldErrors[f.key]?.length)}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  >
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {f.key === "active"
                          ? o === "true"
                            ? "Active"
                            : "Inactive"
                          : o
                              .toLowerCase()
                              .replaceAll("_", " ")
                              .replace(/^./, (letter) => letter.toUpperCase())}
                      </option>
                    ))}
                  </select>
                ) : f.type === "project" ? (
                  <select
                    value={form[f.key] || ""}
                    aria-invalid={Boolean(fieldErrors[f.key]?.length)}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  >
                    <option value="">No project</option>
                    {(refs.projects || []).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title}
                      </option>
                    ))}
                  </select>
                ) : ["areas", "researchers"].includes(f.type || "") ? (
                  <>
                    <select
                      multiple
                      size={4}
                      aria-invalid={Boolean(fieldErrors[f.key]?.length)}
                      value={Array.isArray(form[f.key]) ? form[f.key] : []}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f.key]: Array.from(
                            e.target.selectedOptions,
                            (x) => x.value,
                          ),
                        })
                      }
                    >
                      {(refs[f.type!] || []).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name || x.title}
                        </option>
                      ))}
                    </select>
                    <span className="field-hint">
                      Hold Ctrl or Cmd to select more than one.
                    </span>
                  </>
                ) : (
                  <input
                    type={f.type || "text"}
                    required={f.required}
                    readOnly={f.readOnly}
                    aria-invalid={Boolean(fieldErrors[f.key]?.length)}
                    value={
                      Array.isArray(form[f.key])
                        ? form[f.key].join("\n")
                        : (f.type === "date"
                            ? form[f.key]?.slice?.(0, 10)
                            : form[f.key]) || ""
                    }
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                )}
                {fieldErrors[f.key]?.[0] && (
                  <span className="field-error">{fieldErrors[f.key][0]}</span>
                )}
                {f.type === "password" && (
                  <span className="field-hint">
                    Use 8+ characters with an uppercase letter and a number.
                  </span>
                )}
              </label>
            ))}
          </div>
          <footer>
            {entity === "messages" && item?.email && (
              <a
                className="button ghost message-reply"
                href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`}
              >
                Reply by email
              </a>
            )}
            <button type="button" className="button ghost" onClick={onClose}>
              {entity === "messages" ? "Close" : "Cancel"}
            </button>
            <button className="button" disabled={busy}>
              {busy
                ? "Saving…"
                : entity === "messages"
                  ? "Update status"
                  : "Save"}
            </button>
          </footer>
        </form>
        {entity === "publications" && item?.id && (
          <PublicationDocumentPanel
            publication={form}
            canPublish
            onChanged={(updated) => {
              setForm((current: Record<string, unknown>) => ({
                ...current,
                ...updated,
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}
