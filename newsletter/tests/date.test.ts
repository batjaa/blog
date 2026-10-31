import { strict as assert } from "node:assert";
import { test } from "node:test";
import { render } from "react-email";
import { MonthlyNewsletter } from "../templates/emails/MonthlyNewsletter";

test("issue month stays correct across build time zones, including the year boundary", async () => {
  const originalTimeZone = process.env.TZ;
  try {
    for (const timeZone of ["America/Los_Angeles", "UTC", "Asia/Tokyo"]) {
      process.env.TZ = timeZone;
      for (const [date, expected, previous] of [
        ["2026-09-01", "September 2026", "August 2026"],
        ["2026-01-01", "January 2026", "December 2025"],
      ]) {
        const html = await render(MonthlyNewsletter({ title: "Family updates", date }));
        assert.ok(html.includes(`>${expected}</p>`), `${timeZone}: expected ${expected}`);
        assert.ok(!html.includes(previous), `${timeZone}: unexpected ${previous}`);
      }
    }
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});
