import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { useProcessingResource } from "./useProcessingResource";
vi.mock("../services/api", async (load) => ({
  ...(await load<object>()),
  api: vi.fn(),
}));
afterEach(() => {
  vi.useRealTimers();
  vi.mocked(api).mockReset();
});
describe("processing polling", () => {
  it("polls pending work, stops at READY, and cancels on unmount", async () => {
    vi.useFakeTimers();
    vi.mocked(api)
      .mockResolvedValueOnce({ status: "PENDING" })
      .mockResolvedValueOnce({ status: "READY" });
    const view = renderHook(() => useProcessingResource("/job"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.result.current.data).toEqual({ status: "PENDING" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(view.result.current.data).toEqual({ status: "READY" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(api).toHaveBeenCalledTimes(2);
    view.unmount();
  });
  it("does not poll completed work after unmount or disabled capabilities", async () => {
    vi.useFakeTimers();
    vi.mocked(api).mockResolvedValue({ status: "PROCESSING" });
    const view = renderHook(() => useProcessingResource("/job"));
    await act(async () => {
      await Promise.resolve();
    });
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(api).toHaveBeenCalledTimes(1);
    renderHook(() => useProcessingResource("/private", false));
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("displays authorization errors rather than treating them as absent documents", async () => {
    vi.mocked(api).mockRejectedValue(
      new Error("You may only manage publications you author"),
    );
    const view = renderHook(() => useProcessingResource("/job"));
    await waitFor(() => expect(view.result.current.error).toContain("author"));
  });
});
