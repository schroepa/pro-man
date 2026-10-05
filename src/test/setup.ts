import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-theme");
  }
});
