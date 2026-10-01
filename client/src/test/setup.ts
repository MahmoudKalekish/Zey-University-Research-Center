import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
// Supply browser storage when Node's experimental storage shadows jsdom.
const values = new Map<string, string>();
const storage: Storage = {
  get length() {
    return values.size;
  },
  key: (index) => [...values.keys()][index] ?? null,
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => {
    values.set(key, String(value));
  },
  removeItem: (key) => {
    values.delete(key);
  },
  clear: () => values.clear(),
};
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});
