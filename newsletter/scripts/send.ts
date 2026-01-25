import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { ServerClient } from "postmark";

// Load .env from project root
config({ path: path.join(__dirname, "../../.env") });

const DIST_DIR = path.join(__dirname, "../dist");

interface SendResult {
  successful: string[];
  failed: { email: string; error: string }[];
}

async function getSubscribers(): Promise<string[]> {
  // Option 1: From environment variable (comma-separated)
  const envSubscribers = process.env.NEWSLETTER_SUBSCRIBERS;
  if (envSubscribers) {
    return envSubscribers.split(",").map((e) => e.trim()).filter(Boolean);
  }

  // Option 2: From local file (not committed to repo)
  const subscribersFile = path.join(__dirname, "../subscribers.json");
  if (fs.existsSync(subscribersFile)) {
    const data = JSON.parse(fs.readFileSync(subscribersFile, "utf-8"));
    return data.subscribers || [];
  }

  return [];
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

    await client.sendEmail({
      From: fromEmail,
      To: testEmail!,
      Subject: `[TEST] ${title}`,
      HtmlBody: html,
      MessageStream: "outbound",
      TrackOpens: true,
      TrackLinks: "HtmlOnly",
    });

    console.log("✅ Test email sent successfully!");
  } else {
    // Broadcast to all subscribers
    const subscribers = await getSubscribers();

    if (subscribers.length === 0) {
      console.error("❌ No subscribers found.");
      console.log("");
      console.log("Set subscribers via one of these methods:");
      console.log("  1. NEWSLETTER_SUBSCRIBERS env var (comma-separated emails)");
      console.log("  2. newsletter/subscribers.json file: { \"subscribers\": [\"a@b.com\"] }");
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

      const messages = batch.map((email) => ({
        From: fromEmail,
        To: email,
        Subject: title,
        HtmlBody: html,
        MessageStream: "broadcast" as const,
        TrackOpens: true,
        TrackLinks: "HtmlOnly" as const,
      }));

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
