import * as fs from "fs";
import * as path from "path";
import { createHmac } from "crypto";
import { config } from "dotenv";
import { ServerClient } from "postmark";
import { createClient } from "@libsql/client/web";
import { parseIssueFilename, selectSendIssue } from "./issues";
import { formatIssueDate } from "../templates/components/locale";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { errorMessage, monitorDelivery, publicReport, refreshDelivery, renderReport, reportHasProblems, sendPaced, type SendReport } from "./delivery";

// Load .env from project root
config({ path: path.join(__dirname, "../../.env"), quiet: true });

const DIST_DIR = path.join(__dirname, "../dist");

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

function buildSubject(issueSlug: string): string {
  const issue = parseIssueFilename(`${issueSlug}.html`);
  const formatted = formatIssueDate(`${issue.slug}-01`, issue.language);
  return `${issue.language === "mn" ? "Батжаагийн захидал" : "A letter from Batjaa"} — ${formatted}`;
}

function seconds(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max} seconds`);
  return value * 1000;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("version") || args.includes("--version")) {
    console.log(process.env.NEWSLETTER_VERSION || "dev");
    return;
  }
  const isTest = args.includes("--test");
  const isBroadcast = args.includes("--broadcast");
  const refreshPath = args.find(a => a.startsWith("--report="))?.slice("--report=".length);
  if (Number(isTest) + Number(isBroadcast) + Number(refreshPath !== undefined) !== 1) {
    throw new Error("Usage: send.ts --test | --broadcast [--issue=2026-09] [--language=en] | --report=path/to/report.json | version");
  }
  const reportDir = path.resolve(__dirname, "../reports");
  const outputPath = path.join(reportDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`);
  let report: SendReport = {
    version: 1, issue: "unresolved", subject: "", stream: isTest ? "outbound" : "broadcast",
    startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), recipients: [],
  };
  const visibleReport = () => process.env.GITHUB_ACTIONS === "true" ? publicReport(report) : report;
  const save = () => {
    report.updatedAt = new Date().toISOString();
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(`${outputPath}.tmp`, JSON.stringify(visibleReport(), null, 2) + "\n");
    fs.renameSync(`${outputPath}.tmp`, outputPath);
    fs.writeFileSync(outputPath.replace(/\.json$/, ".md"), renderReport(visibleReport()));
  };
  try {
    if (refreshPath !== undefined) {
      const original = JSON.parse(fs.readFileSync(path.resolve(refreshPath), "utf8")) as SendReport;
      if (original.version !== 1 || !Array.isArray(original.recipients) || !original.issue || !original.stream) throw new Error("Invalid delivery report");
      report = original;
      for (const row of report.recipients) {
        if (row.status === "submitting") {
          row.status = "unknown";
          row.detail = "Previous process stopped during submission. Check Postmark activity before retrying.";
        }
      }
    }
    save();
    const options = {
      intervalMs: seconds("NEWSLETTER_SEND_INTERVAL_SECONDS", 6, 1, 300),
      pollMs: 10_000,
      waitMs: seconds("NEWSLETTER_DELIVERY_WAIT_SECONDS", 120, 0, 1800),
      sleep, now: Date.now, save,
    };
    const apiKey = process.env.POSTMARK_API_KEY;
    if (!apiKey) throw new Error("POSTMARK_API_KEY environment variable is required");
    const client = new ServerClient(apiKey, { timeout: 30 });
    const details = (id: string) => client.getOutboundMessageDetails(id);
    if (refreshPath !== undefined) {
      await refreshDelivery(report, { details }, options, true);
      await monitorDelivery(report, { details }, options);
    } else {
      const issueArg = args.find(a => a.startsWith("--issue="))?.slice("--issue=".length);
      const language = args.find(a => a.startsWith("--language="))?.slice("--language=".length) ?? "en";
      if (language !== "en" && language !== "mn") throw new Error("Language must be en or mn");
      report.issue = selectSendIssue(fs.readdirSync(DIST_DIR), language, issueArg);
      report.subject = `${isTest ? "[TEST] " : ""}${buildSubject(report.issue)}`;
      const html = fs.readFileSync(path.join(DIST_DIR, `${report.issue}.html`), "utf8");
      if (!process.env.NEWSLETTER_TOKEN_SECRET) throw new Error("NEWSLETTER_TOKEN_SECRET environment variable is required");
      if (isTest && !process.env.TEST_EMAIL_ADDRESS) throw new Error("TEST_EMAIL_ADDRESS environment variable is required");
      const subscribers = isTest ? [process.env.TEST_EMAIL_ADDRESS!] : await getSubscribers();
      report.recipients = subscribers.map(email => ({ email, status: "not_sent" }));
      save();
      if (!subscribers.length) throw new Error("No active subscribers found");
      report.serverId = (await client.getServer()).ID;
      save();
      console.log(`Sending ${report.issue} to ${subscribers.length} recipient(s), one every ${options.intervalMs / 1000}s. Report: ${outputPath}`);
      await sendPaced(report, {
        details,
        send: email => client.sendEmail({
          From: process.env.NEWSLETTER_FROM_EMAIL || "newsletter@batjaa.com",
          To: email, Subject: report.subject,
          HtmlBody: injectUnsubscribeUrl(html, buildUnsubscribeUrl(email)),
          MessageStream: report.stream, TrackOpens: true,
        }),
      }, options);
    }
  } catch (error) {
    report.stopReason = errorMessage(error);
  } finally {
    report.completedAt = new Date().toISOString();
    save();
    const markdown = renderReport(visibleReport());
    console.log(markdown);
    console.log(`Report saved: ${outputPath}`);
    if (reportHasProblems(report)) process.exitCode = 1;
  }
}

main().catch(error => {
  console.error("Send failed:", errorMessage(error));
  process.exitCode = 1;
});
