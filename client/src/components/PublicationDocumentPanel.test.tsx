import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationDocumentPanel } from "./PublicationDocumentPanel";
import { api } from "../services/api";
vi.mock("../services/api", async (load) => ({
  ...(await load<object>()),
  api: vi.fn(),
}));
const publication = {
  id: "paper",
  slug: "paper",
  title: "Paper",
  workflowStatus: "DRAFT" as const,
};
const ready = {
  id: "doc",
  status: "READY",
  originalName: "paper.pdf",
  sizeBytes: 1024,
  pageCount: 12,
};
beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockResolvedValue(ready);
});
describe("document management", () => {
  it("validates a disguised upload before sending it", async () => {
    render(
      <PublicationDocumentPanel
        publication={publication}
        canPublish={false}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Publication PDF"), {
      target: {
        files: [new File(["text"], "paper.txt", { type: "text/plain" })],
      },
    });
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("PDF"),
    );
    expect(
      vi
        .mocked(api)
        .mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(false);
  });
  it("submits only a ready authored draft and never offers researcher publication", async () => {
    const changed = vi.fn();
    render(
      <PublicationDocumentPanel
        publication={publication}
        canPublish={false}
        onChanged={changed}
      />,
    );
    await screen.findByText(/12 pages/);
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/researcher/publications/paper/submit",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
  it("locks author replacement while under review", async () => {
    render(
      <PublicationDocumentPanel
        publication={{ ...publication, workflowStatus: "READY_FOR_REVIEW" }}
        canPublish={false}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Publication PDF")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Submit for review" }),
    ).toBeNull();
  });
  it("disables publication when PDF processing failed and shows retry", async () => {
    vi.mocked(api).mockResolvedValue({
      ...ready,
      status: "FAILED",
      failureMessage: "OCR required",
    });
    render(
      <PublicationDocumentPanel
        publication={{ ...publication, workflowStatus: "READY_FOR_REVIEW" }}
        canPublish
        onChanged={vi.fn()}
      />,
    );
    await screen.findByText("OCR required");
    expect(screen.getByRole("button", { name: "Publish" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByRole("button", { name: "Retry processing" }),
    ).toBeTruthy();
  });
});
