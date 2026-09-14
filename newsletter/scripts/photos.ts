import { marked, type Token } from "marked";

const IMAGE_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

function photosInBlock(token: Token): string[] | undefined {
  if (token.type !== "html" && token.type !== "paragraph") return;
  const html = marked.parser([token]).trim().replace(/^<p>([\s\S]*)<\/p>$/, "$1");
  const images = html.match(IMAGE_TAG);
  if (images && !html.replace(IMAGE_TAG, "").trim()) return images;
}

function photoGrid(images: string[]): string {
  const cells = images.map((image) => {
    const source = image.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
    const responsive = image
      .replace(/\s(?:width|height|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\s*\/?>$/, ' width="240" style="display:block;width:100%;max-width:240px;height:auto;border:0;" />');
    const content = source && /^(https?:\/\/|\/(?!\/))/i.test(source)
      ? `<a href="${source.replace(/"/g, "&quot;")}" rel="noopener noreferrer">${responsive}</a>`
      : responsive;
    return `<td width="50%" valign="top" align="center" style="padding:6px;">${content}</td>`;
  });
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr>${cells[i]}${cells[i + 1] ?? '<td width="50%"></td>'}</tr>`);
  }
  return `<table data-photo-gallery="true" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;margin:16px 0;"><tbody>${rows.join("")}</tbody></table>\n\n`;
}

// Only adjacent image-only blocks form a gallery. Prose, headings, and code
// keep their original positions and break a group. HTML and Markdown both work.
export function groupPhotos(markdown: string): string {
  const tokens = marked.lexer(markdown);
  const output: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const first = photosInBlock(tokens[i]);
    if (!first) {
      output.push(tokens[i].raw);
      continue;
    }
    const images = [...first];
    let end = i;
    let next = i + 1;
    while (next < tokens.length) {
      if (tokens[next].type === "space") {
        next++;
        continue;
      }
      const more = photosInBlock(tokens[next]);
      if (!more) break;
      images.push(...more);
      end = next++;
    }
    if (images.length > 1) {
      output.push(photoGrid(images));
      i = end;
    } else {
      output.push(tokens[i].raw);
    }
  }
  return output.join("");
}
