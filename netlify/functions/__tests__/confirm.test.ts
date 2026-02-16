import { beforeEach, describe, expect, it } from "vitest";
import { createMockEvent, mockExecute, resetMocks } from "./setup";
import { handler } from "../confirm";

describe("confirm function", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("rejects non-GET requests", async () => {
    const event = createMockEvent({ httpMethod: "POST" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
  });

  it("requires token query param", async () => {
    const event = createMockEvent({ httpMethod: "GET", rawQuery: "" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("confirmation token is missing");
  });

  it("handles invalid token", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const event = createMockEvent({ httpMethod: "GET", rawQuery: "token=bad-token" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("invalid or already used");
  });

  it("handles expired token", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ email: "user@example.com", confirm_token_expires_at: "2000-01-01T00:00:00.000Z" }],
    });

    const event = createMockEvent({ httpMethod: "GET", rawQuery: "token=expired-token" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("has expired");
  });

  it("activates subscriber on valid token", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ email: "user@example.com", confirm_token_expires_at: "2099-01-01T00:00:00.000Z" }],
      })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const event = createMockEvent({ httpMethod: "GET", rawQuery: "token=valid-token" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["Content-Type"]).toBe("text/html");
    expect(result.body).toContain("Subscription confirmed");
    expect(mockExecute).toHaveBeenLastCalledWith(
      expect.objectContaining({
        args: ["user@example.com"],
      })
    );
  });
});
