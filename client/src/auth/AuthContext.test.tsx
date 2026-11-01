import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "../services/api";
vi.mock("../services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/api")>()),
  api: vi.fn(),
}));
const visitor = {
  id: "user",
  email: "user@zurc.test",
  firstName: "New",
  lastName: "User",
  role: "VISITOR",
};
function Identity() {
  const { user, logout } = useAuth();
  return (
    <>
      <span>{user?.role ?? "signed out"}</span>
      <button onClick={logout}>Logout</button>
    </>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem("token", "session");
  vi.mocked(api).mockResolvedValue(visitor);
});
afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe("current account role", () => {
  it("refreshes a promoted account when the user returns to the tab without logging in again", async () => {
    render(
      <AuthProvider>
        <Identity />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("VISITOR")).toBeTruthy());
    vi.mocked(api).mockResolvedValue({ ...visitor, role: "RESEARCHER" });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByText("RESEARCHER")).toBeTruthy();
    expect(localStorage.getItem("token")).toBe("session");
  });

  it("refreshes role changes while the page remains open", async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(
        <AuthProvider>
          <Identity />
        </AuthProvider>,
      );
    });
    expect(screen.getByText("VISITOR")).toBeTruthy();
    vi.mocked(api).mockResolvedValue({ ...visitor, role: "RESEARCHER" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(screen.getByText("RESEARCHER")).toBeTruthy();
  });
});
