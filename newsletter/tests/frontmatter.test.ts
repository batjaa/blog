import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseFrontmatter } from "../scripts/frontmatter";

test("parses issue metadata without changing dates, Unicode, or the Markdown body", () => {
  const body = "\n## Family\n\nA story.\n\n---\n\nMore prose.\n";
  const { data, content } = parseFrontmatter(`---\ntitle: Монгол\ndate: 2026-09-01\nactive: false\nbooks:\n  - title: Meditations\nintro: |\n  First line\n  Second line\n---\n${body}`);
  assert.equal(data.title, "Монгол");
  assert.equal(data.date, "2026-09-01");
  assert.equal(data.active, false);
  assert.deepEqual(data.books, [{ title: "Meditations" }]);
  assert.equal(data.intro, "First line\nSecond line\n");
  assert.equal(content, body);
});

test("accepts Windows line endings and a byte order mark", () => {
  const parsed = parseFrontmatter("\uFEFF---\r\ntitle: Issue\r\n---\r\nBody");
  assert.equal(parsed.data.title, "Issue");
  assert.equal(parsed.content, "Body");
});

test("rejects malformed metadata and executable frontmatter", () => {
  for (const input of [
    "Missing metadata",
    "Body\n---\ntitle: Issue\n---\n",
    "---\ntitle: Issue\n",
    "---\n- a list\n---\n",
    "---\ntitle: [invalid\n---\n",
    "---\ntitle: One\ntitle: Two\n---\n",
    "---javascript\n({title: 'Issue'})\n---\n",
    "---\ntitle: !!js/function 'function () { return 1; }'\n---\n",
  ]) assert.throws(() => parseFrontmatter(input));
});

test("rejects excessive YAML alias expansion", () => {
  const yaml = ["a: &a [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"];
  for (const [key, previous] of [["b", "a"], ["c", "b"], ["d", "c"]]) {
    yaml.push(`${key}: &${key} [${Array(10).fill(`*${previous}`).join(", ")}]`);
  }
  assert.throws(() => parseFrontmatter(`---\n${yaml.join("\n")}\n---\n`), /alias/i);
});
