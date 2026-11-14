import { fireEvent, render, screen, within } from "@testing-library/react";
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
      answer:
        "## Key findings\nNine confirmed leaks\n\n- **Detection:** 9 of 10\n- <b>Two false alarms</b>",
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
    expect(screen.getByRole("heading", { name: "Key findings" })).toBeTruthy();
    const findings = within(screen.getByRole("list"));
    expect(findings.getAllByRole("listitem")).toHaveLength(2);
    expect(findings.getByText("Detection:").tagName).toBe("STRONG");
    expect(findings.getByText("<b>Two false alarms</b>")).toBeTruthy();
    const supporting = screen.getByText("Supporting passages (1)");
    expect(supporting.closest("details")?.open).toBe(false);
    fireEvent.click(supporting);
    expect(screen.getByRole("button", { name: "Page 8" })).toBeTruthy();
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
