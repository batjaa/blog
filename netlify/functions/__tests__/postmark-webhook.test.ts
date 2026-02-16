import { beforeEach, describe, expect, it } from "vitest";
import { createMockEvent, mockExecute, resetMocks } from "./setup";
import { handler } from "../postmark-webhook";

describe("postmark webhook function", () => {
  beforeEach(() => {
    resetMocks();
    delete process.env.POSTMARK_WEBHOOK_TOKEN;
  });

  it("rejects non-POST requests", async () => {
    const event = createMockEvent({ httpMethod: "GET" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
  });

  it("rejects invalid JSON body", async () => {
    const event = createMockEvent({
      httpMethod: "POST",
      body: "{invalid-json}",
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: "Invalid JSON" });
  });

  it("enforces webhook token when configured", async () => {
    process.env.POSTMARK_WEBHOOK_TOKEN = "expected-token";

    const event = createMockEvent({
      httpMethod: "POST",
      body: JSON.stringify({ RecordType: "Bounce", Email: "user@example.com" }),
      headers: {},
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({ error: "Unauthorized" });
  });

  it("marks bounced recipient as suppressed", async () => {
    process.env.POSTMARK_WEBHOOK_TOKEN = "expected-token";
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: JSON.stringify({ RecordType: "Bounce", Email: "User@Example.com" }),
      headers: { "x-postmark-server-token": "expected-token" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ["bounce", "user@example.com"],
      })
    );
  });
});
