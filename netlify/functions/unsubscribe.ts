import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const handler: Handler = async (event: HandlerEvent) => {
  // Allow GET (for email link clicks) and POST
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Parse email from query params (GET) or body (POST)
  let email: string | undefined;

  if (event.httpMethod === "GET") {
    const params = new URLSearchParams(event.rawQuery || "");
    email = params.get("email") || undefined;
  } else {
    const contentType = event.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      try {
        const body = JSON.parse(event.body || "{}");
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
      email = params.get("email") || undefined;
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
    const result = await db.execute({
      sql: "UPDATE subscribers SET unsubscribed_at = CURRENT_TIMESTAMP WHERE email = ? AND unsubscribed_at IS NULL",
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

    if (event.httpMethod === "GET") {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 400px; margin: 50px auto; text-align: center;">
  <h2>Something went wrong</h2>
  <p>Please try again later or contact us directly.</p>
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
