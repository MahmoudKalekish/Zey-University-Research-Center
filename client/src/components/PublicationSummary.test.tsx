import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationSummary } from "./PublicationSummary";
import { api, ApiError } from "../services/api";
vi.mock("../services/api", async (load) => ({
  ...(await load<object>()),
  api: vi.fn(),
}));
const section = { text: "Evidence from the final page", pages: [12] };
const content = {
  detailLevel: "STANDARD",
  inShort: section,
  researchObjective: section,
  methodology: section,
  keyFindings: section,
  conclusions: section,
  limitations: { text: "Not stated in the document", pages: [] },
  whyItMatters: section,
  keywords: ["water"],
  sourcePages: [12],
};
beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockResolvedValue({
    status: "READY",
    mode: "OLLAMA",
    content,
  });
});
describe("publication summary", () => {
  it("renders structured cached content and page evidence", async () => {
    render(<PublicationSummary slug="paper" available />);
    await screen.findByRole("heading", { name: "Key Findings" });
    expect(screen.getByRole("heading", { name: "Methodology" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Page 12" })[0]).toHaveProperty(
      "href",
      expect.stringContaining("#page=12"),
    );
    expect(screen.getByText("Not stated in the document")).toBeTruthy();
  });
  it("loads each detail level independently", async () => {
    render(<PublicationSummary slug="paper" available />);
    await screen.findByRole("heading", { name: "In Short" });
    fireEvent.click(screen.getByRole("button", { name: "Detailed" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/publications/paper/summary?detailLevel=DETAILED",
      ),
    );
  });
  it("shows explicit deterministic fallback evidence", async () => {
    vi.mocked(api).mockResolvedValue({
      status: "READY",
      mode: "FALLBACK",
      content: {
        mode: "FALLBACK",
        notice: "Local AI unavailable",
        metadata: { title: "Paper", abstract: "Metadata abstract" },
        evidence: [{ section: "Results", text: "Nine leaks", pages: [8] }],
      },
    });
    render(<PublicationSummary slug="paper" available />);
    expect(await screen.findByText("Nine leaks")).toBeTruthy();
    expect(screen.getByText("Local AI unavailable")).toBeTruthy();
  });
  it("queues missing summaries and displays pending status", async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(new ApiError("Not requested", 404))
      .mockResolvedValue({ status: "PENDING" });
    render(<PublicationSummary slug="paper" available />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Generate summary" }),
    );
    expect(await screen.findByText(/Generating/)).toBeTruthy();
    expect(api).toHaveBeenCalledWith(
      "/publications/paper/summary",
      expect.objectContaining({ method: "POST" }),
    );
  });
  it("keeps metadata-only publications clear about missing full text", () => {
    render(<PublicationSummary slug="paper" available={false} />);
    expect(screen.getByText(/No processed PDF/)).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });
});
