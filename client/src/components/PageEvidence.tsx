import { useState } from "react";
import { pdfUrl, openManagedPdf } from "../services/publication-documents";
export function PageEvidence({
  slug,
  pages,
  managed = false,
}: {
  slug: string;
  pages: number[];
  managed?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-evidence">
        {[...new Set(pages)].map((page) =>
          managed ? (
            <button
              key={page}
              type="button"
              onClick={() =>
                void openManagedPdf(slug, page).catch((failure: Error) =>
                  setError(failure.message),
                )
              }
            >
              Page {page}
            </button>
          ) : (
            <a
              key={page}
              href={pdfUrl(slug, page)}
              target="_blank"
              rel="noreferrer"
            >
              Page {page}
            </a>
          ),
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
