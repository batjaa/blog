import type { Handler, HandlerEvent } from "@netlify/functions";
import { randomBytes } from "crypto";
import { getDbClient } from "./db";
import { ensureSubscribersSchema, getSubscriberByEmail, hashToken } from "./subscribers";

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

async function sendConfirmationEmail(email: string, token: string) {
  const postmarkToken = process.env.POSTMARK_API_KEY;
  if (!postmarkToken) {
    throw new Error("Missing POSTMARK_API_KEY");
  }

  const baseUrl = (process.env.SITE_URL || process.env.URL || "https://batjaa.com").replace(/\/$/, "");
  const confirmUrl = `${baseUrl}/api/confirm?token=${encodeURIComponent(token)}`;
  const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || "newsletter@batjaa.com";

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": postmarkToken,
    },
    body: JSON.stringify({
      From: fromEmail,
      To: email,
      Subject: "Confirm your newsletter subscription",
      MessageStream: "outbound",
      HtmlBody: `
        <h2>Confirm your subscription</h2>
        <p>Click the button below to confirm your subscription to Batjaa's newsletter.</p>
        <p><a href="${confirmUrl}" style="display:inline-block;padding:10px 16px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;">Confirm subscription</a></p>
        <p>If the button doesn't work, open this link:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      `,
      TextBody: `Confirm your newsletter subscription:\n\n${confirmUrl}`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Postmark send failed: ${response.status} ${errorBody}`);
  }
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
    await ensureSubscribersSchema(db);

    const existing = await getSubscriberByEmail(db, email);

    if (existing?.status === "active" && !existing.unsubscribed_at && !existing.suppressed_at) {
      return buildResponse(event, 200, {
        success: true,
        message: "You're already subscribed!",
      });
    }

    if (existing?.status === "suppressed") {
      return buildResponse(event, 400, {
        error: "This address cannot be subscribed right now. Please contact support.",
      });
    }

    const confirmationToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(confirmationToken);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.execute({
      sql: `
        INSERT INTO subscribers (
          email,
          status,
          confirm_token_hash,
          confirm_token_expires_at,
          confirmed,
          confirmed_at,
          unsubscribed_at,
          updated_at,
          subscribed_at
        ) VALUES (?, 'pending', ?, ?, 0, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET
          status = 'pending',
          confirm_token_hash = excluded.confirm_token_hash,
          confirm_token_expires_at = excluded.confirm_token_expires_at,
          confirmed = 0,
          confirmed_at = NULL,
          unsubscribed_at = NULL,
          updated_at = CURRENT_TIMESTAMP,
          subscribed_at = CURRENT_TIMESTAMP
      `,
      args: [email, tokenHash, expiry],
    });

    await sendConfirmationEmail(email, confirmationToken);

    return buildResponse(event, 200, {
      success: true,
      message: "Check your inbox to confirm your subscription.",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return buildResponse(event, 500, { error: "Failed to subscribe" });
  }
};

export { handler };
