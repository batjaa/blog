import { vi } from "vitest";

// Mock the libsql client
export const mockExecute = vi.fn();
export const mockGetSubscriberByEmail = vi.fn();
export const mockEnsureSubscribersSchema = vi.fn().mockResolvedValue(undefined);
export const mockFetch = vi.fn();

vi.mock("@libsql/client/web", () => ({
  createClient: () => ({
    execute: mockExecute,
  }),
}));

vi.mock("../subscribers", () => ({
  ensureSubscribersSchema: mockEnsureSubscribersSchema,
  getSubscriberByEmail: mockGetSubscriberByEmail,
  hashToken: (value: string) => `hash:${value}`,
}));

process.env.TURSO_DATABASE_URL = "libsql://test-db.turso.io";
process.env.TURSO_AUTH_TOKEN = "test-token";
process.env.POSTMARK_API_KEY = "test-postmark-token";

vi.stubGlobal("fetch", mockFetch);
mockFetch.mockResolvedValue({
  ok: true,
  status: 200,
  text: async () => "",
});

vi.spyOn(console, "error").mockImplementation(() => {});

// Helper to create mock Netlify events
export function createMockEvent(overrides: {
  httpMethod?: string;
  body?: string;
  headers?: Record<string, string>;
  rawQuery?: string;
} = {}) {
  return {
    httpMethod: overrides.httpMethod || "POST",
    body: overrides.body || "",
    headers: overrides.headers || {},
    rawQuery: overrides.rawQuery || "",
    rawUrl: "",
    path: "",
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
  };
}

export function resetMocks() {
  mockExecute.mockReset();
  mockGetSubscriberByEmail.mockReset();
  mockEnsureSubscribersSchema.mockClear();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => "",
  });
}
