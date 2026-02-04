import { vi } from "vitest";

// Mock the libsql client
export const mockExecute = vi.fn();

vi.mock("@libsql/client", () => ({
  createClient: () => ({
    execute: mockExecute,
  }),
}));

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
