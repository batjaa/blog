export type DeliveryStatus = "not_sent" | "submitting" | "accepted" | "delivered" | "deferred" | "bounced" | "rejected" | "unknown";

export interface RecipientResult {
  email: string;
  status: DeliveryStatus;
  messageId?: string;
  detail?: string;
  lookupError?: string;
  checkedAt?: string;
}

export interface SendReport {
  version: 1;
  issue: string;
  subject: string;
  stream: string;
  serverId?: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  stopReason?: string;
  recipients: RecipientResult[];
}

interface MessageEvent {
  Type: string;
  ReceivedAt: string;
  Details: { Summary?: string; DeliveryMessage?: string };
}

export interface DeliveryClient {
  send(email: string): Promise<{ ErrorCode: number; Message: string; MessageID: string }>;
  details(id: string): Promise<{ MessageEvents?: MessageEvent[] }>;
}

export interface DeliveryOptions {
  intervalMs: number;
  pollMs: number;
  waitMs: number;
  sleep(ms: number): Promise<void>;
  now(): number;
  save(): void;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isThrottled(detail = ""): boolean {
  return /rate.?limit|throttl|unusual rate|4\.7\.28/i.test(detail);
}

export async function refreshDelivery(report: SendReport, client: Pick<DeliveryClient, "details">, options: DeliveryOptions, all = false): Promise<void> {
  for (const row of report.recipients) {
    if (!row.messageId || (!all && !["accepted", "deferred"].includes(row.status))) continue;
    try {
      const message = await client.details(row.messageId);
      const events = [...(message.MessageEvents || [])].sort((a, b) => Date.parse(a.ReceivedAt) - Date.parse(b.ReceivedAt));
      for (const event of events) {
        if (!["Bounced", "Delivered", "Transient"].includes(event.Type)) continue;
        row.status = event.Type === "Bounced" ? "bounced" : event.Type === "Delivered" ? "delivered" : "deferred";
        row.detail = event.Details.Summary || event.Details.DeliveryMessage || event.Type;
      }
      row.checkedAt = new Date(options.now()).toISOString();
      delete row.lookupError;
    } catch (error) {
      row.lookupError = errorMessage(error);
    }
    options.save();
  }
}

export async function monitorDelivery(report: SendReport, client: Pick<DeliveryClient, "details">, options: DeliveryOptions): Promise<void> {
  const deadline = options.now() + options.waitMs;
  do {
    await refreshDelivery(report, client, options);
    if (!report.recipients.some(row => ["accepted", "deferred"].includes(row.status))) break;
    const remaining = deadline - options.now();
    if (remaining <= 0) break;
    await options.sleep(Math.min(options.pollMs, remaining));
  } while (options.now() <= deadline);
}

export async function sendPaced(report: SendReport, client: DeliveryClient, options: DeliveryOptions): Promise<void> {
  for (const row of report.recipients) {
    if (row.status !== "not_sent") continue;
    row.status = "submitting";
    options.save(); // Preserve uncertain submissions if the process is interrupted.
    try {
      let response;
      for (let attempt = 0; ; attempt++) {
        try {
          response = await client.send(row.email);
          break;
        } catch (error) {
          // Only a definite HTTP 429 rejection is safe to retry automatically.
          if ((error as { statusCode?: number })?.statusCode !== 429 || attempt === 2) throw error;
          await options.sleep(30_000 * 2 ** attempt);
        }
      }
      if (response.ErrorCode !== 0) {
        row.status = "rejected";
        row.detail = response.Message;
        report.stopReason = `Postmark rejected ${row.email}: ${response.Message}`;
      } else if (!response.MessageID) {
        row.status = "unknown";
        row.detail = "Postmark returned no message ID. Check activity before retrying.";
        report.stopReason = row.detail;
      } else {
        row.status = "accepted";
        row.messageId = response.MessageID;
      }
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      row.status = status && status >= 400 && status < 500 ? "rejected" : "unknown";
      row.detail = errorMessage(error);
      report.stopReason = `Sending stopped: ${row.detail}. Check Postmark before retrying uncertain submissions.`;
    }
    options.save();
    if (report.stopReason) break;
    await options.sleep(options.intervalMs);
    await refreshDelivery(report, client, options);
    const warning = report.recipients.find(result => result.status === "deferred" || isThrottled(result.detail) || result.lookupError);
    if (warning) {
      report.stopReason = `Sending stopped for ${warning.email}: ${warning.lookupError || warning.detail || "delivery deferred"}. Remaining recipients were not sent.`;
      options.save();
      break;
    }
  }
  await monitorDelivery(report, client, options);
}

export function reportHasProblems(report: SendReport): boolean {
  return !!report.stopReason || !report.recipients.length || report.recipients.some(row => row.status !== "delivered" || row.lookupError);
}

// This repository's Actions logs and artifacts are public. Message links require
// Postmark authentication; recipient addresses must stay out of public reports.
export function publicReport(report: SendReport): SendReport {
  const redact = (value: string) => {
    for (const row of report.recipients) value = value.split(row.email).join("[recipient]");
    return value.replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  };
  const copy: SendReport = JSON.parse(JSON.stringify(report, (_, value) => typeof value === "string" ? redact(value) : value));
  copy.recipients.forEach((row, index) => { row.email = `Recipient ${index + 1}`; });
  return copy;
}

const cell = (value = "") => value.replace(/[&<>|\r\n]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "|": "&#124;", "\r": " ", "\n": " " })[char]!);

export function renderReport(report: SendReport): string {
  const counts = new Map<string, number>();
  for (const row of report.recipients) counts.set(row.status, (counts.get(row.status) || 0) + 1);
  const lines = [
    `## Newsletter delivery report: ${cell(report.issue)}`,
    "",
    `**Subject:** ${cell(report.subject)}  `,
    `**Stream:** ${cell(report.stream)}  `,
    `**Updated:** ${report.updatedAt}  `,
    `**Recipients:** ${report.recipients.length}`,
    "",
    ...[...counts].map(([status, count]) => `- ${status}: **${count}**`),
    "",
    "Delivered means the receiving mail server accepted the message; it does not confirm inbox placement. Accepted/deferred messages may resolve later. Refresh the JSON report to check again without sending.",
    "",
  ];
  if (report.stopReason) lines.push(`**Stopped:** ${cell(report.stopReason)}`, "");
  lines.push("| Recipient | Status | Message | Details |", "| --- | --- | --- | --- |");
  for (const row of report.recipients) {
    const link = row.messageId && report.serverId
      ? `[Postmark](https://account.postmarkapp.com/servers/${report.serverId}/streams/${encodeURIComponent(report.stream)}/messages/${encodeURIComponent(row.messageId)})`
      : cell(row.messageId || "—");
    lines.push(`| ${cell(row.email)} | ${row.status} | ${link} | ${cell([row.detail, row.lookupError && `Status check failed: ${row.lookupError}`].filter(Boolean).join("; "))} |`);
  }
  return lines.join("\n") + "\n";
}
