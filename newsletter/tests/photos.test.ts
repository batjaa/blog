import { strict as assert } from "node:assert";
import { test } from "node:test";
import { groupPhotos } from "../scripts/photos";

const photo = (name: string) => `<img src="https://example.com/${name}.jpg" alt="${name}" width="520" />`;

test("consecutive HTML photos become one table with every image in order", () => {
  const result = groupPhotos([photo("first"), photo("second"), photo("third")].join("\n\n"));
  assert.equal((result.match(/data-photo-gallery/g) || []).length, 1);
  assert.equal((result.match(/<tr>/g) || []).length, 2);
  assert.equal((result.match(/<img /g) || []).length, 3);
  assert.ok(result.indexOf('alt="first"') < result.indexOf('alt="second"'));
  assert.ok(result.indexOf('alt="second"') < result.indexOf('alt="third"'));
  assert.match(result, /href="https:\/\/example.com\/third.jpg"/);
});

test("prose and headings separate galleries, and single photos remain unchanged", () => {
  const markdown = `${photo("first")}\n\nA story between photos.\n\n${photo("second")}\n\n## Travel\n\n${photo("third")}\n`;
  assert.equal(groupPhotos(markdown), markdown);
});

test("Markdown images and HTML images can share a gallery", () => {
  const result = groupPhotos(`![First](https://example.com/first.jpg)\n\n${photo("second")}`);
  assert.match(result, /data-photo-gallery/);
  assert.equal((result.match(/<img /g) || []).length, 2);
});

test("inline photos and images inside code are not grouped", () => {
  const markdown = `Some text ${photo("inline")}\n\n\`\`\`html\n${photo("first")}\n${photo("second")}\n\`\`\`\n`;
  assert.equal(groupPhotos(markdown), markdown);
});

test("quoted angle brackets in alt text survive grouping", () => {
  const result = groupPhotos(`<img src="/one.jpg" alt="One > two" />\n\n${photo("second")}`);
  assert.match(result, /alt="One > two"/);
  assert.match(result, /data-photo-gallery/);
});

test("grouping does not turn non-HTTP image sources into executable links", () => {
  const result = groupPhotos(`<img src="javascript:alert(1)" alt="Invalid source" />\n\n${photo("second")}`);
  assert.doesNotMatch(result, /href="javascript:/);
});
