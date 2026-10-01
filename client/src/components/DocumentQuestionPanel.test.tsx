import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentQuestionPanel } from "./DocumentQuestionPanel";
import { api } from "../services/api";
vi.mock("../services/api", async (load) => ({
  ...(await load<object>()),
  api: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(api).mockReset();
});
describe("document question panel", () => {
  it("asks only the selected publication and links the cited page", async () => {
    vi.mocked(api).mockResolvedValue({
      answer: "Nine confirmed leaks",
      mode: "OLLAMA",
      evidence: [
        {
          chunkId: "c",
          pageStart: 8,
          pageEnd: 8,
          snippet: "Results: nine leaks",
        },
      ],
    });
    render(<DocumentQuestionPanel slug="water-paper" title="Water paper" />);
    fireEvent.change(screen.getByLabelText("Question about this publication"), {
      target: { value: "How many leaks?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Nine confirmed leaks")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Page 8" })).toHaveProperty(
      "href",
      expect.stringContaining("/water-paper/document#page=8"),
    );
    expect(vi.mocked(api).mock.calls[0]![0]).toBe(
      "/publications/water-paper/ask",
    );
  });
  it("displays insufficient evidence and server errors without invented sources", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({
        answer: "Cannot be determined",
        mode: "FALLBACK",
        evidence: [],
      })
      .mockRejectedValueOnce(new Error("Access denied"));
    render(<DocumentQuestionPanel slug="paper" title="Paper" />);
    const input = screen.getByLabelText("Question about this publication");
    fireEvent.change(input, { target: { value: "Population on the moon?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Cannot be determined")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.change(input, { target: { value: "Other question" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Access denied",
    );
  });
});
