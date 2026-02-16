import { vi } from "vitest";

// Mock the libsql client
export const mockExecute = vi.fn();

vi.mock("@libsql/client/web", () => ({
  createClient: () => ({
    execute: mockExecute,
  }),
}));

process.env.TURSO_DATABASE_URL = "libsql://test-db.turso.io";
process.env.TURSO_AUTH_TOKEN = "test-token";

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
}
