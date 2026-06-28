import { beforeEach, describe, expect, it } from "vitest";
import { createMockEvent, mockExecute, resetMocks } from "./setup";
import { handler } from "../theme-votes";

describe("theme-votes function", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("rejects unsupported methods", async () => {
    const event = createMockEvent({ httpMethod: "DELETE" });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
  });

  it("returns vote counts with the current visitor vote", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { theme_id: "current", up_votes: 3, down_votes: 1 },
          { theme_id: "bento", up_votes: 4, down_votes: 0 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ theme_id: "bento", vote: 1 }],
      });

    const event = createMockEvent({
      httpMethod: "GET",
      rawQuery: "visitorId=visitor-12345678",
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      themes: [
        { id: "current", upVotes: 3, downVotes: 1, score: 2, userVote: 0 },
        { id: "bento", upVotes: 4, downVotes: 0, score: 4, userVote: 1 },
        { id: "tui", upVotes: 0, downVotes: 0, score: 0, userVote: 0 },
      ],
    });
  });

  it("upserts a visitor vote", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowsAffected: 1 })
      .mockResolvedValueOnce({
        rows: [{ theme_id: "tui", up_votes: 1, down_votes: 0 }],
      })
      .mockResolvedValueOnce({
        rows: [{ theme_id: "tui", vote: 1 }],
      });

    const event = createMockEvent({
      httpMethod: "POST",
      body: JSON.stringify({
        themeId: "tui",
        voterId: "visitor-12345678",
        vote: 1,
      }),
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ["tui", "visitor-12345678", 1],
      })
    );
    expect(JSON.parse(result.body).themes[2]).toEqual({
      id: "tui",
      upVotes: 1,
      downVotes: 0,
      score: 1,
      userVote: 1,
    });
  });

  it("clears a visitor vote when vote is zero", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const event = createMockEvent({
      httpMethod: "POST",
      body: JSON.stringify({
        themeId: "current",
        voterId: "visitor-12345678",
        vote: 0,
      }),
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ["current", "visitor-12345678"],
      })
    );
  });

  it("rejects invalid themes", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const event = createMockEvent({
      httpMethod: "POST",
      body: JSON.stringify({
        themeId: "unknown",
        voterId: "visitor-12345678",
        vote: 1,
      }),
    });
    const result = await handler(event, {} as any);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: "Invalid theme" });
  });
});
