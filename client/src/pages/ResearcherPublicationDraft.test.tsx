import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResearcherPublicationDraft } from "./ResearcherPublicationDraft";
import { api, ApiError } from "../services/api";
vi.mock("../services/api", async (load) => ({
  ...(await load<object>()),
  api: vi.fn(),
}));
vi.mock("../auth/AuthContext", () => {
  const user = { role: "RESEARCHER", firstName: "Karim" };
  return { useAuth: () => ({ user, loading: false }) };
});
vi.mock("../components/PublicationDocumentPanel", () => ({
  PublicationDocumentPanel: () => <div>Author document management</div>,
}));
const paper = {
  id: "paper",
  slug: "paper",
  title: "Paper",
  abstract: "Long enough abstract for a research paper",
  venue: "ZURC",
  keywords: [],
  publicationDate: "2026-10-01",
  type: "REPORT",
  workflowStatus: "READY_FOR_REVIEW",
};
function show(path = "/researcher/publications/new") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/researcher/publications/new"
          element={<ResearcherPublicationDraft />}
        />
        <Route
          path="/researcher/publications/:id"
          element={<ResearcherPublicationDraft />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.mocked(api).mockReset();
});
describe("researcher draft editor", () => {
  it("creates a draft with author assignment controlled by the server", async () => {
    vi.mocked(api).mockResolvedValue({ ...paper, workflowStatus: "DRAFT" });
    show();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "New research" },
    });
    fireEvent.change(screen.getByLabelText("Abstract"), {
      target: { value: "This study tests a campus sensing method." },
    });
    fireEvent.change(screen.getByLabelText("Journal / conference"), {
      target: { value: "ZURC" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/researcher/publications",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const body = JSON.parse(vi.mocked(api).mock.calls[0]![1]?.body as string);
    expect(body.authorIds).toBeUndefined();
    expect(body.workflowStatus).toBeUndefined();
    expect(await screen.findByText("Author document management")).toBeTruthy();
  });
  it("locks metadata after submission", async () => {
    vi.mocked(api).mockResolvedValue(paper);
    show("/researcher/publications/paper");
    expect(
      (await screen.findByLabelText("Title")).closest("fieldset"),
    ).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });
  it("shows non-author authorization failures", async () => {
    vi.mocked(api).mockImplementation(async () => {
      throw new ApiError("You may only manage publications you author", 403);
    });
    show("/researcher/publications/other");
    await waitFor(() =>
      expect(screen.queryByText(/You may only/)).not.toBeNull(),
    );
    expect(screen.getByRole("alert").textContent).toContain("author");
  });
});
