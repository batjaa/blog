import { describe, it, expect, beforeEach } from "vitest";
import {
  mockExecute,
  createMockEvent,
  resetMocks,
  mockGetSubscriberByEmail,
  mockFetch,
} from "./setup";
import { handler } from "../subscribe";

describe("subscribe function", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("rejects non-POST requests", async () => {
    const event = createMockEvent({ httpMethod: "GET" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
  });

  it("requires email field", async () => {
    const event = createMockEvent({
      httpMethod: "POST",
      body: "",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: "Email is required" });
  });

  it("validates email format", async () => {
    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=not-an-email",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: "Invalid email format" });
  });

  it("sends confirmation for new subscription", async () => {
    mockGetSubscriberByEmail.mockResolvedValueOnce(null);
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=new@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: "Check your inbox to confirm your subscription.",
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles already subscribed email", async () => {
    mockGetSubscriberByEmail.mockResolvedValueOnce({
      email: "existing@example.com",
      status: "active",
      confirm_token_hash: null,
      confirm_token_expires_at: null,
      confirmed_at: null,
      unsubscribed_at: null,
      suppressed_at: null,
      suppression_reason: null,
    });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=existing@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: "You're already subscribed!",
    });
    expect(mockExecute).toHaveBeenCalledTimes(0);
  });

  it("blocks suppressed email", async () => {
    mockGetSubscriberByEmail.mockResolvedValueOnce({
      email: "suppressed@example.com",
      status: "suppressed",
      confirm_token_hash: null,
      confirm_token_expires_at: null,
      confirmed_at: null,
      unsubscribed_at: null,
      suppressed_at: "2026-01-01",
      suppression_reason: "bounce",
    });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=suppressed@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: "This address cannot be subscribed right now. Please contact support.",
    });
  });

  it("normalizes email to lowercase for lookup", async () => {
    mockGetSubscriberByEmail.mockResolvedValueOnce(null);
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=TEST@EXAMPLE.COM",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    await handler(event, {} as any);

    expect(mockGetSubscriberByEmail).toHaveBeenCalledWith(expect.anything(), "test@example.com");
  });

  it("accepts JSON content type", async () => {
    mockGetSubscriberByEmail.mockResolvedValueOnce(null);
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: JSON.stringify({ email: "json@example.com" }),
      headers: { "content-type": "application/json" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
  });

  it("returns HTML for browser form posts when accept is text/html", async () => {
    mockGetSubscriberByEmail.mockResolvedValueOnce(null);
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=html@example.com",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "text/html",
      },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("You're subscribed");
  });

  it("handles database errors gracefully", async () => {
    mockGetSubscriberByEmail.mockResolvedValueOnce(null);
    mockExecute.mockRejectedValueOnce(new Error("Database connection failed"));

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=error@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: "Failed to subscribe" });
  });
});
