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
      body: JSON.stringify({ RecordType: "Bounce", Email: "User@Example.com", Type: "HardBounce", Inactive: true }),
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

  it.each(["SpamNotification", "SoftBounce", "Transient"])("does not suppress an active recipient after %s", async (Type) => {
    const result = await handler(createMockEvent({
      body: JSON.stringify({ RecordType: "Bounce", Email: "user@example.com", Type, Inactive: false }),
    }), {} as any);
    expect(result.statusCode).toBe(200);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it.each([
    { RecordType: "SpamComplaint", Email: "user@example.com" },
    { RecordType: "Bounce", Type: "SoftBounce", Inactive: true, Email: "user@example.com" },
    { RecordType: "SubscriptionChange", SuppressSending: true, Recipient: "user@example.com" },
  ])("suppresses recipients when Postmark disables sending: %j", async (payload) => {
    const result = await handler(createMockEvent({ body: JSON.stringify(payload) }), {} as any);
    expect(result.statusCode).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({
      args: [payload.RecordType.toLowerCase(), "user@example.com"],
    }));
  });

  it("does not suppress or reactivate subscribers on a suppression removal notification", async () => {
    const result = await handler(createMockEvent({
      body: JSON.stringify({ RecordType: "SubscriptionChange", Recipient: "user@example.com", SuppressSending: false }),
    }), {} as any);
    expect(result.statusCode).toBe(200);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
