import { useState } from "react";
import { openManagedPdf } from "../services/publication-documents";
export function PageEvidence({
  slug,
  pages,
}: {
  slug: string;
  pages: number[];
  managed?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-evidence">
        {[...new Set(pages)].map((page) => (
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
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
