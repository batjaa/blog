import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "react-email";
import { parseFrontmatter } from "../scripts/frontmatter";
import { MonthlyNewsletter } from "../templates/emails/MonthlyNewsletter";
import { formatIssueDate } from "../templates/components/locale";
import { parseIssueFilename, selectSendIssue } from "../scripts/issues";

test("Mongolian rendering localizes template copy and links without English preview content", async () => {
  const html = await render(MonthlyNewsletter({
    language: "mn", issueSlug: "2026-09", title: "2026 оны 9-р сар", date: "2026-09-01",
    movies: [], books: [{ title: "Meditations", author: "Marcus Aurelius", status: "reading" }],
    trading: { pnl: "+$100", sentiment: "positive" },
    spotifyPlaylistUrl: "https://open.spotify.com/playlist/example",
    randomThoughtsContent: "<p>Кофены тухай бодол.</p>",
  }));
  for (const text of ['lang="mn"', "Гэр бүл", "Ажил, төслүүд", "Уншиж байгаа", "Сарын ашиг, алдагдал", "Spotify дээр сонсох", "Кофены тухай бодол.", "Захиалгаа цуцлах", "https://batjargal.mn/newsletter/2026-09/", "{{unsubscribe_url}}"])
    assert.ok(html.includes(text), `Missing ${text}`);
  for (const text of ["This is a preview", "Example Movie", "Currently reading", "Hey everyone!", "Nothing new this month", "batjaa.com/newsletter", "September 2026"])
    assert.ok(!html.includes(text), `Unexpected English fallback: ${text}`);
});

test("web editions omit email subscription claims and unsubscribe placeholders", async () => {
  for (const language of ["en", "mn"] as const) {
    const html = await render(MonthlyNewsletter({ language, web: true, title: "Issue", date: "2026-09-01" }));
    assert.ok(!html.includes("unsubscribe_url"));
    assert.ok(!html.includes("You're receiving this"));
    assert.ok(!html.includes("Та Батжаагийн захидлыг захиалсан тул"));
  }
});

test("Mongolian issue months are calendar dates across time zones", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["America/Los_Angeles", "UTC", "Asia/Ulaanbaatar"]) {
      process.env.TZ = zone;
      assert.equal(formatIssueDate("2026-01-01", "mn"), "2026 оны 1-р сар");
      assert.equal(formatIssueDate("2026-09-01", "mn"), "2026 оны 9-р сар");
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("sending selects the requested language and ignores preview output", () => {
  const files = ["2026-06.html", "2026-09.html", "2026-09.mn.html", "2026-12-preview.html", "2026-12-email-preview.html", "2026-13.html"];
  assert.equal(selectSendIssue(files, "en"), "2026-09");
  assert.equal(selectSendIssue(files, "mn"), "2026-09.mn");
  assert.equal(selectSendIssue(files, "mn", "2026-06.mn"), "2026-06.mn");
  assert.throws(() => selectSendIssue(files, "en", "2026-09.mn"), /language/);
  assert.throws(() => selectSendIssue(files, "mn", "2026-09"), /language/);
  assert.throws(() => selectSendIssue(["2026-09.mn.html"], "en"), /No built en/);
  assert.throws(() => parseIssueFilename("../2026-09.md"), /Invalid/);
});

test("every translated issue preserves source sections, dates, media, and destinations", () => {
  const dir = join(__dirname, "../issues");
  const urls = (text: string) => [...text.matchAll(/https?:\/\/[^\s"<>\)]+/g)]
    .map(([url]) => url.replace(/\.$/, "").replace("https://batjargal.mn/newsletter", "https://batjaa.com/newsletter")).sort();
  for (const translatedFile of readdirSync(dir).filter((name) => /^\d{4}-\d{2}\.mn\.md$/.test(name))) {
    const file = translatedFile.replace(".mn.md", ".md");
    const english = readFileSync(join(dir, file), "utf8");
    const mongolian = readFileSync(join(dir, translatedFile), "utf8");
    const en = parseFrontmatter(english), mn = parseFrontmatter(mongolian);
    assert.deepEqual(mn.data.date, en.data.date, file);
    assert.equal(mn.data.active, en.data.active, file);
    assert.deepEqual(mongolian.match(/^## .+$/gm), english.match(/^## .+$/gm), file);
    assert.deepEqual(urls(mongolian), urls(english), file);
    for (const field of ["movies", "songs", "books", "projects"])
      assert.equal(mn.data[field]?.length, en.data[field]?.length, `${file}: ${field}`);
  }
});
