import type { Client } from "@libsql/client/web";
import type { Handler } from "@netlify/functions";
import { getDbClient } from "./db";

const THEMES = ["current", "bento", "tui"] as const;
const THEME_SET = new Set<string>(THEMES);
const VOTER_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

type ThemeId = (typeof THEMES)[number];

interface ThemeVoteSummary {
  id: ThemeId;
  upVotes: number;
  downVotes: number;
  score: number;
  userVote: number;
}

function json(statusCode: number, payload: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_SET.has(value);
}

function normalizeVoterId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return VOTER_ID_PATTERN.test(trimmed) ? trimmed : "";
}

function normalizeVote(value: unknown) {
  const vote = Number(value);
  if (vote === 1 || vote === -1 || vote === 0) {
    return vote;
  }
  return null;
}

async function ensureThemeVotesSchema(db: Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS theme_votes (
      theme_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (theme_id, voter_id)
    )
  `);
}

async function getThemeVoteSummaries(db: Client, voterId = "") {
  const countsResult = await db.execute(`
    SELECT
      theme_id,
      SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS up_votes,
      SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS down_votes
    FROM theme_votes
    GROUP BY theme_id
  `);

  const userVotes = new Map<string, number>();
  if (voterId) {
    const userResult = await db.execute({
      sql: "SELECT theme_id, vote FROM theme_votes WHERE voter_id = ?",
      args: [voterId],
    });

    for (const row of userResult.rows) {
      userVotes.set(String(row.theme_id), Number(row.vote));
    }
  }

  const counts = new Map<string, { upVotes: number; downVotes: number }>();
  for (const row of countsResult.rows) {
    const themeId = String(row.theme_id);
    if (!THEME_SET.has(themeId)) {
      continue;
    }
    counts.set(themeId, {
      upVotes: Number(row.up_votes || 0),
      downVotes: Number(row.down_votes || 0),
    });
  }

  return THEMES.map((id): ThemeVoteSummary => {
    const themeCounts = counts.get(id) || { upVotes: 0, downVotes: 0 };
    return {
      id,
      upVotes: themeCounts.upVotes,
      downVotes: themeCounts.downVotes,
      score: themeCounts.upVotes - themeCounts.downVotes,
      userVote: userVotes.get(id) || 0,
    };
  });
}

async function parseJsonBody(body: string | null) {
  try {
    return JSON.parse(body || "{}") as Record<string, unknown>;
  } catch {
    return null;
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const db = getDbClient();
    await ensureThemeVotesSchema(db);

    if (event.httpMethod === "GET") {
      const params = new URLSearchParams(event.rawQuery || "");
      const voterId = normalizeVoterId(params.get("visitorId"));
      return json(200, { themes: await getThemeVoteSummaries(db, voterId) });
    }

    const body = await parseJsonBody(event.body);
    if (!body) {
      return json(400, { error: "Invalid JSON" });
    }

    const themeId = body.themeId;
    const voterId = normalizeVoterId(body.voterId);
    const vote = normalizeVote(body.vote);

    if (!isThemeId(themeId)) {
      return json(400, { error: "Invalid theme" });
    }
    if (!voterId) {
      return json(400, { error: "Invalid voter" });
    }
    if (vote === null) {
      return json(400, { error: "Invalid vote" });
    }

    if (vote === 0) {
      await db.execute({
        sql: "DELETE FROM theme_votes WHERE theme_id = ? AND voter_id = ?",
        args: [themeId, voterId],
      });
    } else {
      await db.execute({
        sql: `
          INSERT INTO theme_votes (theme_id, voter_id, vote)
          VALUES (?, ?, ?)
          ON CONFLICT(theme_id, voter_id) DO UPDATE SET
            vote = excluded.vote,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [themeId, voterId, vote],
      });
    }

    return json(200, { themes: await getThemeVoteSummaries(db, voterId) });
  } catch (error) {
    console.error("Theme vote error:", error);
    return json(500, { error: "Failed to process theme vote" });
  }
};

export { handler };
