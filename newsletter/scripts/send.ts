import * as fs from "fs";
import * as path from "path";
import { createHmac } from "crypto";
import { config } from "dotenv";
import { ServerClient } from "postmark";
import { createClient } from "@libsql/client/web";

// Load .env from project root
config({ path: path.join(__dirname, "../../.env") });

const DIST_DIR = path.join(__dirname, "../dist");

interface SendResult {
  successful: string[];
  failed: { email: string; error: string }[];
}

function createSignedToken(payload: Record<string, unknown>, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function buildUnsubscribeUrl(email: string): string {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret) {
    throw new Error("NEWSLETTER_TOKEN_SECRET environment variable is required");
  }

  const baseUrl = (process.env.SITE_URL || process.env.URL || "https://batjaa.com").replace(/\/$/, "");
  const exp = Math.floor(Date.now() / 1000) + 3650 * 24 * 60 * 60; // 10 years
  const token = createSignedToken({ type: "unsubscribe", email, exp }, secret);
  return `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function injectUnsubscribeUrl(html: string, unsubscribeUrl: string): string {
  return html
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, unsubscribeUrl)
    .replace(/\{\s*\{\s*unsubscribe_url\s*\}\s*\}/g, unsubscribeUrl);
}

async function getSubscribers(): Promise<string[]> {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
  }

  const client = createClient({ url: dbUrl, authToken });

  const result = await client.execute(`
    SELECT email
    FROM subscribers
    WHERE status = 'active'
      AND unsubscribed_at IS NULL
      AND suppressed_at IS NULL
    ORDER BY COALESCE(confirmed_at, subscribed_at, created_at)
  `);

  return result.rows.map((row) => row.email as string);
}

function extractTitle(html: string): string {
  // Extract title from the newsletter HTML
  const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return match ? match[1].trim() : "Monthly Update";
}

async function sendNewsletter(issueSlug: string, isTest: boolean): Promise<void> {
  const apiKey = process.env.POSTMARK_API_KEY;
  const testEmail = process.env.TEST_EMAIL_ADDRESS;
  const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || "newsletter@batjaa.com";

  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY environment variable is required");
  }

  if (isTest && !testEmail) {
    throw new Error("TEST_EMAIL_ADDRESS environment variable is required for test sends");
  }

  const htmlPath = path.join(DIST_DIR, `${issueSlug}.html`);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Newsletter not built: ${htmlPath}\nRun 'npm run build' first.`);
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  const title = extractTitle(html);
  const client = new ServerClient(apiKey);

  if (isTest) {
    console.log(`📧 Sending test email to: ${testEmail}`);
    const testHtml = injectUnsubscribeUrl(html, buildUnsubscribeUrl(testEmail!));

    await client.sendEmail({
      From: fromEmail,
      To: testEmail!,
      Subject: `[TEST] ${title}`,
      HtmlBody: testHtml,
      MessageStream: "outbound",
      TrackOpens: true,
    });

    console.log("✅ Test email sent successfully!");
  } else {
    // Broadcast to all subscribers
    const subscribers = await getSubscribers();

    if (subscribers.length === 0) {
      console.error("❌ No active subscribers found in Turso DB.");
      process.exit(1);
    }

    console.log(`📧 Broadcasting to ${subscribers.length} subscribers...`);
    console.log(`   Subject: ${title}`);
    console.log("");

    const results: SendResult = { successful: [], failed: [] };

    // Send in batches of 50 (Postmark recommends batching)
    const batchSize = 50;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const messages = batch.map((email) => {
        const htmlBody = injectUnsubscribeUrl(html, buildUnsubscribeUrl(email));
        return {
          From: fromEmail,
          To: email,
          Subject: title,
          HtmlBody: htmlBody,
          MessageStream: "broadcast" as const,
          TrackOpens: true,
        };
      });

      try {
        const response = await client.sendEmailBatch(messages);

        response.forEach((result, index) => {
          const email = batch[index];
          if (result.ErrorCode === 0) {
            results.successful.push(email);
          } else {
            results.failed.push({ email, error: result.Message });
          }
        });
      } catch (err: any) {
        // If batch fails entirely, mark all as failed
        batch.forEach((email) => {
          results.failed.push({ email, error: err.message });
        });
      }

      // Progress indicator
      const sent = Math.min(i + batchSize, subscribers.length);
      process.stdout.write(`\r   Sent: ${sent}/${subscribers.length}`);
    }

    console.log("\n");

    // Summary
    console.log("✅ Broadcast complete!");
    console.log(`   Successful: ${results.successful.length}`);

    if (results.failed.length > 0) {
      console.log(`   Failed: ${results.failed.length}`);
      console.log("");
      console.log("Failed recipients:");
      results.failed.forEach(({ email, error }) => {
        console.log(`   - ${email}: ${error}`);
      });
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  const isTest = args.includes("--test");
  const isBroadcast = args.includes("--broadcast");
  const issueArg = args.find((a) => a.startsWith("--issue="));

  if (!isTest && !isBroadcast) {
    console.log("Usage:");
    console.log("  npm run send:test                    Send to TEST_EMAIL_ADDRESS");
    console.log("  npm run send:broadcast               Send to all subscribers");
    console.log("");
    console.log("Options:");
    console.log("  --issue=2026-01                      Send specific issue (default: latest)");
    process.exit(1);
  }

  let issueSlug: string;

  if (issueArg) {
    issueSlug = issueArg.split("=")[1];
  } else {
    // Find the most recent issue
    const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith(".html"));
    if (files.length === 0) {
      console.error("No built newsletters found. Run 'npm run build' first.");
      process.exit(1);
    }
    // Sort by filename (YYYY-MM.html format) and get the latest
    issueSlug = files.sort().reverse()[0].replace(".html", "");
  }

  console.log(`\n📨 Newsletter: ${issueSlug}\n`);

  await sendNewsletter(issueSlug, isTest);
}

main().catch((err) => {
  console.error("Send failed:", err.message);
  process.exit(1);
});
