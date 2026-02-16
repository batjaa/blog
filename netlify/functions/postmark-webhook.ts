import type { Handler } from "@netlify/functions";
import { getDbClient } from "./db";
import { ensureSubscribersSchema } from "./subscribers";

interface PostmarkEvent {
  RecordType?: string;
  Email?: string;
}

function extractEvents(body: unknown): PostmarkEvent[] {
  if (Array.isArray(body)) {
    return body as PostmarkEvent[];
  }
  if (body && typeof body === "object") {
    return [body as PostmarkEvent];
  }
  return [];
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const expectedToken = process.env.POSTMARK_WEBHOOK_TOKEN;
  if (expectedToken) {
    const supplied = event.headers["x-postmark-server-token"] || event.headers["X-Postmark-Server-Token"];
    if (!supplied || supplied !== expectedToken) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const events = extractEvents(payload);

  try {
    const db = getDbClient();
    await ensureSubscribersSchema(db);

    for (const item of events) {
      const email = item.Email?.toLowerCase().trim();
      const recordType = (item.RecordType || "").toLowerCase();
      if (!email) {
        continue;
      }

      if (recordType === "bounce" || recordType === "spamcomplaint" || recordType === "subscriptionchange") {
        await db.execute({
          sql: `
            UPDATE subscribers
            SET
              status = 'suppressed',
              suppressed_at = CURRENT_TIMESTAMP,
              suppression_reason = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
          `,
          args: [recordType, email],
        });
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Postmark webhook error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to process webhook" }),
    };
  }
};

export { handler };
