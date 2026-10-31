import { parseDocument } from "yaml";

// Issues support YAML metadata only; executable frontmatter engines are not needed.
export function parseFrontmatter(source: string): {
  data: Record<string, any>;
  content: string;
} {
  const match = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(source);
  if (!match || match.index !== 0) {
    throw new Error("Issue must start with a closed YAML frontmatter block");
  }

  const document = parseDocument(match[1]);
  const problem = document.errors[0] || document.warnings[0];
  if (problem) throw problem;
  const data = document.toJS({ maxAliasCount: 100 });
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Issue frontmatter must be a YAML mapping");
  }

  return { data, content: source.slice(match[0].length) };
}
