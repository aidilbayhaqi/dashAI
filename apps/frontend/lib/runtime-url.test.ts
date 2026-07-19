import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeRuntimeBaseUrl } from "./runtime-url";

describe("runtime URL normalization", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("upgrades non-local HTTP API URLs in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(normalizeRuntimeBaseUrl("http://dashai-production.up.railway.app"))
      .toBe("https://dashai-production.up.railway.app");
  });

  it("keeps localhost HTTP for local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(normalizeRuntimeBaseUrl("http://localhost:8000/"))
      .toBe("http://localhost:8000");
  });

  it("adds HTTPS when a deployed host is configured without a scheme", () => {
    expect(normalizeRuntimeBaseUrl("dashai-production.up.railway.app"))
      .toBe("https://dashai-production.up.railway.app");
  });
});
