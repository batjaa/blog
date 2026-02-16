import type { Handler, HandlerEvent } from "@netlify/functions";
import { getDbClient } from "./db";

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
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Parse form data or JSON
  let email: string | undefined;
  const contentType = getHeader(event.headers || {}, "content-type");

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

  if (!email) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Email is required" }),
    };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid email format" }),
    };
  }

  // Normalize email
  email = email.toLowerCase().trim();

  try {
    const db = getDbClient();

    // Check if already subscribed
    const existing = await db.execute({
      sql: "SELECT id, unsubscribed_at FROM subscribers WHERE email = ?",
      args: [email],
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.unsubscribed_at) {
        // Re-subscribe
        await db.execute({
          sql: "UPDATE subscribers SET unsubscribed_at = NULL, subscribed_at = CURRENT_TIMESTAMP WHERE email = ?",
          args: [email],
        });
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: true,
            message: "Welcome back! You've been re-subscribed.",
          }),
        };
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          message: "You're already subscribed!",
        }),
      };
    }

    // Insert new subscriber
    await db.execute({
      sql: "INSERT INTO subscribers (email) VALUES (?)",
      args: [email],
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "Successfully subscribed!",
      }),
    };
  } catch (error) {
    console.error("Subscribe error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to subscribe" }),
    };
  }
};

export { handler };
