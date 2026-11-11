import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ServerClient } from "postmark";
import { monitorDelivery, publicReport, refreshDelivery, renderReport, reportHasProblems, sendPaced, type DeliveryClient, type DeliveryOptions, type SendReport } from "../scripts/delivery";

function fixture(count = 3) {
  let time = 0;
  let saves = 0;
  const waits: number[] = [];
  const sent: { email: string; at: number }[] = [];
  const report: SendReport = {
    version: 1, issue: "2026-09", subject: "September", stream: "broadcast", serverId: 123,
    startedAt: new Date(time).toISOString(), updatedAt: new Date(time).toISOString(),
    recipients: Array.from({ length: count }, (_, i) => ({ email: `${i}@example.com`, status: "not_sent" })),
  };
  const options: DeliveryOptions = {
    intervalMs: 6000, pollMs: 10_000, waitMs: 20_000,
    now: () => time, sleep: async ms => { waits.push(ms); time += ms; }, save: () => { saves++; },
  };
  const event = (Type: string, Summary = "OK", at = time) => ({ Type, ReceivedAt: new Date(at).toISOString(), Details: { Summary } });
  const client: DeliveryClient = {
    send: async email => { sent.push({ email, at: time }); return { ErrorCode: 0, Message: "OK", MessageID: `id-${email}` }; },
    details: async () => ({ MessageEvents: [event("Delivered")] }),
  };
  return { report, options, client, waits, sent, event, saves: () => saves };
}

test("Postmark SDK preserves HTTP throttling and delivery responses", async () => {
  const f = fixture(1);
  let submissions = 0;
  const sdk = new ServerClient("test-token", {
    timeout: 30,
    fetch: async (url, init) => {
      assert.equal(new Headers(init?.headers).get("X-Postmark-Server-Token"), "test-token");
      if (init?.method === "POST") {
        assert.equal(JSON.parse(String(init.body)).To, "0@example.com");
        if (++submissions === 1) return Response.json({ ErrorCode: 429, Message: "Too many requests" }, { status: 429 });
        return Response.json({ ErrorCode: 0, Message: "OK", MessageID: "sdk-message" });
      }
      assert.match(String(url), /messages\/outbound\/sdk-message\/details$/);
      return Response.json({ MessageEvents: [f.event("Delivered")] });
    },
  });
  await sendPaced(f.report, {
    send: To => sdk.sendEmail({ From: "sender@example.com", To, Subject: "Test", TextBody: "Test" }),
    details: id => sdk.getOutboundMessageDetails(id),
  }, f.options);
  assert.equal(submissions, 2);
  assert.deepEqual(f.waits, [30_000, 6000]);
  assert.equal(f.report.recipients[0].status, "delivered");
  assert.equal(f.report.recipients[0].messageId, "sdk-message");
});

for (const failure of ["rejection", "server error", "network error", "timeout"] as const) {
  test(`Postmark SDK ${failure} stops sending without retrying`, async () => {
    const f = fixture(2);
    let submissions = 0;
    const sdk = new ServerClient("test-token", {
      timeout: 0.01,
      fetch: async (_url, init) => {
        submissions++;
        if (failure === "network error") throw new TypeError("fetch failed");
        if (failure === "timeout") {
          const signal = init?.signal;
          assert.ok(signal);
          return new Promise<Response>((_resolve, reject) => {
            // Keep the event loop alive while the SDK's unref'd timeout fires.
            const guard = setTimeout(() => reject(new Error("SDK did not abort")), 1000);
            const abort = () => { clearTimeout(guard); reject(signal.reason); };
            if (signal.aborted) abort();
            else signal.addEventListener("abort", abort, { once: true });
          });
        }
        return Response.json({ ErrorCode: 300, Message: "API failure" }, {
          status: failure === "rejection" ? 422 : 503,
        });
      },
    });
    await sendPaced(f.report, {
      send: To => sdk.sendEmail({ From: "sender@example.com", To, Subject: "Test", TextBody: "Test" }),
      details: id => sdk.getOutboundMessageDetails(id),
    }, f.options);
    assert.equal(submissions, 1);
    assert.deepEqual(f.waits, []);
    assert.deepEqual(f.report.recipients.map(row => row.status), [
      failure === "rejection" ? "rejected" : "unknown", "not_sent",
    ]);
    if (failure === "timeout") assert.match(f.report.recipients[0].detail!, /timeout|timed out/i);
  });
}

test("paces individual recipients and reports confirmed delivery with message IDs", async () => {
  const f = fixture();
  await sendPaced(f.report, f.client, f.options);
  assert.deepEqual(f.sent.map(row => row.at), [0, 6000, 12000]);
  assert.ok(f.report.recipients.every(row => row.status === "delivered" && row.messageId));
  assert.equal(reportHasProblems(f.report), false);
  assert.ok(f.saves() >= 9);
  assert.match(renderReport(f.report), /servers\/123\/streams\/broadcast\/messages/);
});

test("a Gmail rate-limit bounce stops unsent recipients", async () => {
  const f = fixture();
  f.client.details = async () => ({ MessageEvents: [f.event("Bounced", "smtp; 500 4.7.28 Gmail temporarily rate limited")] });
  await sendPaced(f.report, f.client, f.options);
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.report.recipients.map(row => row.status), ["bounced", "not_sent", "not_sent"]);
  assert.match(f.report.stopReason!, /rate limited/);
  assert.equal(reportHasProblems(f.report), true);
});

test("deferred delivery stops sending and remains pending at the observation deadline", async () => {
  const f = fixture();
  f.client.details = async () => ({ MessageEvents: [f.event("Transient", "Please try again later")] });
  await sendPaced(f.report, f.client, f.options);
  assert.equal(f.sent.length, 1);
  assert.equal(f.report.recipients[0].status, "deferred");
  assert.equal(f.options.now(), 26_000);
});

test("API acceptance without delivery is not reported as success", async () => {
  const f = fixture(1);
  f.client.details = async () => ({ MessageEvents: [] });
  await sendPaced(f.report, f.client, f.options);
  assert.equal(f.report.recipients[0].status, "accepted");
  assert.equal(reportHasProblems(f.report), true);
  assert.equal(f.options.now(), 26_000);
});

test("delivery monitor observes a later bounce even when API submission succeeded", async () => {
  const f = fixture(1);
  let checks = 0;
  f.client.details = async () => ({ MessageEvents: ++checks < 3 ? [] : [f.event("Bounced", "Mailbox unavailable")] });
  await sendPaced(f.report, f.client, f.options);
  assert.equal(f.report.recipients[0].status, "bounced");
  assert.equal(f.sent.length, 1);
});

test("HTTP 429 rejections back off before retrying the same recipient", async () => {
  const f = fixture(1);
  const send = f.client.send;
  let attempts = 0;
  f.client.send = async email => {
    if (++attempts < 3) throw Object.assign(new Error("API throttled"), { statusCode: 429 });
    return send(email);
  };
  await sendPaced(f.report, f.client, f.options);
  assert.deepEqual(f.waits, [30_000, 60_000, 6000]);
  assert.equal(f.sent.length, 1);
  assert.equal(f.report.recipients[0].status, "delivered");
});

test("persistent API throttling stops after bounded retries", async () => {
  const f = fixture();
  let attempts = 0;
  f.client.send = async () => { attempts++; throw Object.assign(new Error("Rate limit"), { statusCode: 429 }); };
  await sendPaced(f.report, f.client, f.options);
  assert.equal(attempts, 3);
  assert.deepEqual(f.report.recipients.map(row => row.status), ["rejected", "not_sent", "not_sent"]);
});

test("uncertain network errors never automatically resend", async () => {
  const f = fixture();
  let attempts = 0;
  f.client.send = async () => { attempts++; throw new Error("socket timeout"); };
  await sendPaced(f.report, f.client, f.options);
  assert.equal(attempts, 1);
  assert.deepEqual(f.report.recipients.map(row => row.status), ["unknown", "not_sent", "not_sent"]);
});

test("API rejection and missing message ID are distinguished", async () => {
  for (const [ErrorCode, MessageID, status] of [[406, "", "rejected"], [0, "", "unknown"]] as const) {
    const f = fixture();
    f.client.send = async () => ({ ErrorCode, MessageID, Message: "Response" });
    await sendPaced(f.report, f.client, f.options);
    assert.equal(f.report.recipients[0].status, status);
    assert.equal(f.report.recipients[1].status, "not_sent");
  }
});

test("status API failure preserves acceptance and stops further sends", async () => {
  const f = fixture();
  f.client.details = async () => { throw new Error("lookup unavailable"); };
  await sendPaced(f.report, f.client, f.options);
  assert.equal(f.sent.length, 1);
  assert.equal(f.report.recipients[0].status, "accepted");
  assert.match(f.report.recipients[0].lookupError!, /unavailable/);
});

test("refresh is read-only, handles out-of-order events, and ignores opens as delivery evidence", async () => {
  const f = fixture(1);
  const row = f.report.recipients[0];
  row.status = "accepted";
  row.messageId = "original-id";
  f.client.details = async () => ({ MessageEvents: [
    f.event("Opened", "Open", 3000), f.event("Delivered", "Delivered", 2000), f.event("Transient", "Delay", 1000),
  ] });
  await refreshDelivery(f.report, f.client, f.options, true);
  await monitorDelivery(f.report, f.client, f.options);
  assert.equal(f.sent.length, 0);
  assert.equal(row.status, "delivered");
  assert.equal(row.detail, "Delivered");
});

test("report escapes failure text and flags empty or interrupted runs", () => {
  const f = fixture(1);
  f.report.recipients[0].detail = "<script>bad</script>|next\nrow";
  assert.match(renderReport(f.report), /&lt;script&gt;bad&lt;\/script&gt;&#124;next row/);
  assert.equal(reportHasProblems(f.report), true);
  assert.equal(reportHasProblems(fixture(0).report), true);
});

test("public Actions reports redact addresses in rows and SMTP errors while retaining message IDs", () => {
  const f = fixture(1);
  f.report.recipients[0].messageId = "original-id";
  f.report.recipients[0].detail = "Delivery to 0@example.com from newsletter@batjaa.com failed";
  f.report.stopReason = "Stopped at 0@example.com";
  const redacted = publicReport(f.report);
  assert.equal(redacted.recipients[0].email, "Recipient 1");
  assert.equal(redacted.recipients[0].messageId, "original-id");
  assert.ok(!JSON.stringify(redacted).includes("@"));
  assert.equal(f.report.recipients[0].email, "0@example.com");
});
