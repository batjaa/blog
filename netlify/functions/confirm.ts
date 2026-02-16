import type { Handler } from "@netlify/functions";
import { getDbClient } from "./db";
import { ensureSubscribersSchema, hashToken } from "./subscribers";

function htmlPage(title: string, heading: string, message: string) {
  return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 50px auto; text-align: center; line-height: 1.5;">
  <h2>${heading}</h2>
  <p>${message}</p>
  <p style="margin-top: 30px;"><a href="https://batjaa.com/newsletter">← Back to newsletter</a></p>
</body>
</html>`;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const params = new URLSearchParams(event.rawQuery || "");
  const token = params.get("token");

  if (!token) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: htmlPage("Confirmation error", "Invalid confirmation link", "The confirmation token is missing."),
    };
  }

  try {
    const db = getDbClient();
    await ensureSubscribersSchema(db);

    const tokenHash = hashToken(token);
    const result = await db.execute({
      sql: `
        SELECT email, confirm_token_expires_at, status
        FROM subscribers
        WHERE confirm_token_hash = ?
        LIMIT 1
      `,
      args: [tokenHash],
    });

    if (result.rows.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: htmlPage("Confirmation error", "Link is invalid", "This confirmation link is invalid or already used."),
      };
    }

    const row = result.rows[0];
    const email = String(row.email);
    const expiresAt = row.confirm_token_expires_at ? new Date(String(row.confirm_token_expires_at)) : null;

    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: htmlPage("Confirmation expired", "Link expired", "This confirmation link has expired. Please subscribe again."),
      };
    }

    await db.execute({
      sql: `
        UPDATE subscribers
        SET
          status = 'active',
          confirmed = 1,
          confirmed_at = COALESCE(confirmed_at, CURRENT_TIMESTAMP),
          unsubscribed_at = NULL,
          confirm_token_hash = NULL,
          confirm_token_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `,
      args: [email],
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: htmlPage("Confirmed", "Subscription confirmed", "You're all set. Future newsletters will arrive in your inbox."),
    };
  } catch (error) {
    console.error("Confirm error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: htmlPage("Error", "Something went wrong", "Please try subscribing again."),
    };
  }
};

export { handler };
