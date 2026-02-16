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

function wantsHtml(event: HandlerEvent) {
  const accept = getHeader(event.headers || {}, "accept");
  return accept.includes("text/html") && !accept.includes("application/json");
}

function htmlPage(title: string, heading: string, message: string) {
  return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 50px auto; text-align: center; line-height: 1.5;">
  <h2>${heading}</h2>
  <p>${message}</p>
  <p style="margin-top: 30px;">
    <a href="https://batjaa.com/newsletter">← Back to newsletter</a>
  </p>
</body>
</html>`;
}

function buildResponse(
  event: HandlerEvent,
  statusCode: number,
  payload: { success?: boolean; message?: string; error?: string }
) {
  if (wantsHtml(event)) {
    const ok = statusCode >= 200 && statusCode < 300 && payload.success;
    const title = ok ? "Subscribed" : "Subscription Error";
    const heading = ok ? "You're subscribed" : "Subscription failed";
    const message = ok
      ? payload.message || "Thanks for subscribing to the newsletter."
      : payload.error || "Please try again.";

    return {
      statusCode,
      headers: { "Content-Type": "text/html" },
      body: htmlPage(title, heading, message),
    };
  }

  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return buildResponse(event, 405, { error: "Method not allowed" });
  }

  // Parse form data or JSON
  let email: string | undefined;
  const contentType = getHeader(event.headers || {}, "content-type");

  if (contentType.includes("application/json")) {
    try {
      const body = JSON.parse(event.body || "{}");
      email = body.email;
    } catch {
      return buildResponse(event, 400, { error: "Invalid JSON" });
    }
  } else {
    const params = new URLSearchParams(event.body || "");
    email = params.get("email") || undefined;
  }

  if (!email) {
    return buildResponse(event, 400, { error: "Email is required" });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return buildResponse(event, 400, { error: "Invalid email format" });
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
        return buildResponse(event, 200, {
          success: true,
          message: "Welcome back! You've been re-subscribed.",
        });
      }
      return buildResponse(event, 200, {
        success: true,
        message: "You're already subscribed!",
      });
    }

    // Insert new subscriber
    await db.execute({
      sql: "INSERT INTO subscribers (email) VALUES (?)",
      args: [email],
    });

    return buildResponse(event, 200, {
      success: true,
      message: "Successfully subscribed!",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return buildResponse(event, 500, { error: "Failed to subscribe" });
  }
};

export { handler };
