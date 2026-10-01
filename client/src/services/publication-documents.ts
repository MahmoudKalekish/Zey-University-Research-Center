import { api, ApiError } from "./api";
import type {
  DocumentAnswer,
  DocumentStatus,
  ManagedPublication,
  SummaryDetailLevel,
  SummaryStatus,
} from "../types/publication-document";
export const publicationPath = (slug: string) =>
  `/publications/${encodeURIComponent(slug)}`;
export const pdfUrl = (slug: string, page?: number) =>
  `${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}${publicationPath(slug)}/document${page ? `#page=${page}` : ""}`;
export const loadDocumentStatus = (id: string) =>
  api<DocumentStatus>(`${publicationPath(id)}/document/status`);
export function validatePdf(file: File) {
  if (!/\.pdf$/i.test(file.name) || file.type !== "application/pdf")
    return "Select a PDF file with the application/pdf type.";
  if (!file.size) return "The PDF is empty.";
  if (file.size > 25 * 1024 * 1024) return "The maximum PDF size is 25 MiB.";
  return null;
}
export function uploadDocument(id: string, file: File) {
  const body = new FormData();
  body.append("document", file);
  return api<DocumentStatus>(`${publicationPath(id)}/document`, {
    method: "POST",
    body,
  });
}
export const transitionPublication = (
  id: string,
  action: string,
  administrator: boolean,
  reviewNote?: string,
) =>
  api<ManagedPublication>(
    `/${administrator ? "admin" : "researcher"}/publications/${encodeURIComponent(id)}/${action}`,
    { method: "POST", body: JSON.stringify({ reviewNote }) },
  );
export const requestSummary = (slug: string, detailLevel: SummaryDetailLevel) =>
  api<SummaryStatus>(`${publicationPath(slug)}/summary`, {
    method: "POST",
    body: JSON.stringify({ detailLevel }),
  });
export const askDocument = (
  slug: string,
  question: string,
  sessionId: string,
) =>
  api<DocumentAnswer>(`${publicationPath(slug)}/ask`, {
    method: "POST",
    body: JSON.stringify({ question, sessionId }),
  });
export async function openManagedPdf(slug: string, page?: number) {
  const preview = window.open("about:blank", "_blank");
  if (preview) preview.opener = null;
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(pdfUrl(slug), {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok)
      throw new ApiError(
        "The PDF could not be opened. Please refresh and try again.",
        response.status,
      );
    const url = URL.createObjectURL(await response.blob());
    if (preview) preview.location.href = `${url}${page ? `#page=${page}` : ""}`;
    else {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}.pdf`;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (failure) {
    preview?.close();
    throw failure;
  }
}
