import type { Handler, HandlerEvent } from "@netlify/functions";
import { getDbClient } from "./db";
import { ensureSubscribersSchema } from "./subscribers";
import { verifySignedToken } from "./signed-token";

function getHeader(headers: Record<string, string | undefined>, name: string) {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value || "";
    }
  }
  return "";
}

const handler: Handler = async (event: HandlerEvent) => {
  // Allow GET (for email link clicks) and POST
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Parse token/email from query params (GET) or body (POST)
  let token: string | undefined;
  let email: string | undefined;

  if (event.httpMethod === "GET") {
    const params = new URLSearchParams(event.rawQuery || "");
    token = params.get("token") || undefined;
    email = params.get("email") || undefined;
  } else {
    const contentType = getHeader(event.headers || {}, "content-type");
    if (contentType.includes("application/json")) {
      try {
        const body = JSON.parse(event.body || "{}");
        token = body.token;
        email = body.email;
      } catch {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Invalid JSON" }),
        };
      }
    } else {
      const params = new URLSearchParams(event.body || "");
      token = params.get("token") || undefined;
      email = params.get("email") || undefined;
    }
  }

  if (token) {
    const secret = process.env.NEWSLETTER_TOKEN_SECRET;
    if (!secret) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing NEWSLETTER_TOKEN_SECRET" }),
      };
    }

    const payload = verifySignedToken<{ email?: string; exp?: number; type?: string }>(token, secret);
    if (payload && payload.type === "unsubscribe" && payload.email) {
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "text/html" },
          body: `<!DOCTYPE html>
<html>
<head><title>Unsubscribe</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 400px; margin: 50px auto; text-align: center;">
  <h2>Link expired</h2>
  <p>This unsubscribe link has expired.</p>
</body>
</html>`,
        };
      }
      email = payload.email;
    } else {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: `<!DOCTYPE html>
<html>
<head><title>Unsubscribe</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 400px; margin: 50px auto; text-align: center;">
  <h2>Invalid link</h2>
  <p>This unsubscribe link is invalid.</p>
</body>
</html>`,
      };
    }
  }

  if (!email) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `<!DOCTYPE html>
<html>
<head><title>Unsubscribe</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 400px; margin: 50px auto; text-align: center;">
  <h2>Unsubscribe</h2>
  <p>Email is required to unsubscribe.</p>
</body>
</html>`,
    };
  }

  // Normalize email
  email = email.toLowerCase().trim();

  try {
    const db = getDbClient();
    await ensureSubscribersSchema(db);

    const result = await db.execute({
      sql: `
        UPDATE subscribers
        SET
          status = 'unsubscribed',
          unsubscribed_at = CURRENT_TIMESTAMP,
          confirm_token_hash = NULL,
          confirm_token_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = ? AND unsubscribed_at IS NULL
      `,
      args: [email],
    });

    const wasSubscribed = result.rowsAffected > 0;

    // Return HTML page for GET requests (email link clicks)
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html" },
        body: `<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 400px; margin: 50px auto; text-align: center;">
  <h2>${wasSubscribed ? "You've been unsubscribed" : "Already unsubscribed"}</h2>
  <p>${wasSubscribed
    ? "You won't receive any more emails from us. We're sorry to see you go!"
    : "This email is not currently subscribed to our newsletter."}</p>
  <p style="margin-top: 30px;"><a href="https://batjaa.com">← Back to site</a></p>
</body>
</html>`,
      };
    }

    // Return JSON for POST requests
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: wasSubscribed
          ? "Successfully unsubscribed"
          : "Email was not subscribed",
      }),
    };
  } catch (error) {
    console.error("Unsubscribe error:", error);
    const missingConfig =
      error instanceof Error && error.message.includes("TURSO_DATABASE_URL");

    if (event.httpMethod === "GET") {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 400px; margin: 50px auto; text-align: center;">
  <h2>Something went wrong</h2>
  <p>${missingConfig
    ? "Newsletter subscription service is temporarily unavailable."
    : "Please try again later or contact us directly."}</p>
</body>
</html>`,
      };
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to unsubscribe" }),
    };
  }
};

export { handler };
