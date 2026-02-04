import { describe, it, expect, beforeEach } from "vitest";
import { mockExecute, createMockEvent, resetMocks } from "./setup";
import { handler } from "../unsubscribe";

describe("unsubscribe function", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("rejects non-GET/POST requests", async () => {
    const event = createMockEvent({ httpMethod: "DELETE" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
  });

  it("requires email for POST requests", async () => {
    const event = createMockEvent({
      httpMethod: "POST",
      body: "",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("Email is required");
  });

  it("unsubscribes via POST successfully", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=user@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: "Successfully unsubscribed",
    });
  });

  it("handles already unsubscribed via POST", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=notsubscribed@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: "Email was not subscribed",
    });
  });

  it("unsubscribes via GET (email link) successfully", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "GET",
      rawQuery: "email=user@example.com",
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("You've been unsubscribed");
    expect(result.body).toContain("Back to site");
  });

  it("handles already unsubscribed via GET", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

    const event = createMockEvent({
      httpMethod: "GET",
      rawQuery: "email=notsubscribed@example.com",
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("Already unsubscribed");
  });

  it("normalizes email to lowercase", async () => {
    mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=USER@EXAMPLE.COM",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    await handler(event, {} as any);

    expect(mockExecute).toHaveBeenCalledWith({
      sql: "UPDATE subscribers SET unsubscribed_at = CURRENT_TIMESTAMP WHERE email = ? AND unsubscribed_at IS NULL",
      args: ["user@example.com"],
    });
  });

  it("accepts JSON content type", async () => {
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

  it("handles database errors gracefully for POST", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Database error"));

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=error@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: "Failed to unsubscribe" });
  });

  it("handles database errors gracefully for GET", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Database error"));

    const event = createMockEvent({
      httpMethod: "GET",
      rawQuery: "email=error@example.com",
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(500);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("Something went wrong");
  });
});
