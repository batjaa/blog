import { describe, it, expect, beforeEach } from "vitest";
import { mockExecute, createMockEvent, resetMocks } from "./setup";
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

  it("subscribes new email successfully", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] }) // No existing subscriber
      .mockResolvedValueOnce({ rowsAffected: 1 }); // Insert success

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=new@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: "Successfully subscribed!",
    });
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("handles already subscribed email", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ id: 1, unsubscribed_at: null }],
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
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("re-subscribes previously unsubscribed email", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ id: 1, unsubscribed_at: "2024-01-01" }],
      })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=returning@example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: "Welcome back! You've been re-subscribed.",
    });
  });

  it("normalizes email to lowercase", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: "email=TEST@EXAMPLE.COM",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    await handler(event, {} as any);

    expect(mockExecute).toHaveBeenCalledWith({
      sql: "SELECT id, unsubscribed_at FROM subscribers WHERE email = ?",
      args: ["test@example.com"],
    });
  });

  it("accepts JSON content type", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({
      httpMethod: "POST",
      body: JSON.stringify({ email: "json@example.com" }),
      headers: { "content-type": "application/json" },
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
  });

  it("handles database errors gracefully", async () => {
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
