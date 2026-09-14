import type { NewsletterLanguage } from "../templates/components/locale";

// Unsuffixed files are English; Mongolian sources and output use .mn.
export function parseIssueFilename(filename: string) {
  const match = /^(\d{4}-(?:0[1-9]|1[0-2]))(\.mn)?\.(?:md|html)$/.exec(filename);
  if (!match) throw new Error(`Invalid issue filename: ${filename}`);
  return {
    slug: match[1],
    language: (match[2] ? "mn" : "en") as NewsletterLanguage,
    stem: `${match[1]}${match[2] ?? ""}`,
  };
}

export function selectSendIssue(files: string[], language: NewsletterLanguage, requested?: string): string {
  if (requested) {
    const issue = parseIssueFilename(`${requested}.html`);
    if (issue.language !== language) throw new Error(`Issue language does not match --language=${language}`);
    return issue.stem;
  }
  const issues = files.flatMap((filename) => {
    if (!filename.endsWith(".html")) return [];
    try {
      const issue = parseIssueFilename(filename);
      return issue.language === language ? [issue.stem] : [];
    } catch {
      return []; // Preview HTML and other output are not sendable issues.
    }
  });
  const latest = issues.sort().at(-1);
  if (!latest) throw new Error(`No built ${language} newsletters found. Run 'npm run build' first.`);
  return latest;
}
