import { render } from "@react-email/render";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import matter from "gray-matter";
import { marked } from "marked";
import { MonthlyNewsletter } from "../templates/emails/MonthlyNewsletter";

// Load .env from project root
config({ path: path.join(__dirname, "../../.env") });

const ISSUES_DIR = path.join(__dirname, "../issues");
const DIST_DIR = path.join(__dirname, "../dist");
const HUGO_NEWSLETTER_DIR = path.join(__dirname, "../../content/newsletter");

interface MovieFrontmatter {
  url: string;
  comment: string;
}

interface BookFrontmatter {
  title: string;
  author: string;
  status: "reading" | "finished" | "abandoned";
  comment?: string;
  cover_url?: string;
  link?: string;
}

interface TradingFrontmatter {
  pnl: string;
  sentiment: "positive" | "negative" | "neutral";
  chart?: string;
  summary?: string;
}

interface IssueFrontmatter {
  title: string;
  date: string;
  featured_image?: string;
  greeting?: string;
  trading?: TradingFrontmatter;
  movies?: MovieFrontmatter[];
  spotify_playlist_url?: string;
  spotify_playlist_name?: string;
  books?: BookFrontmatter[];
}

// Extract content between ## headers
function extractSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = markdown.split("\n");

  let currentSection: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^## (.+)$/);
    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        sections[currentSection.toLowerCase()] = currentContent.join("\n").trim();
      }
      currentSection = headerMatch[1];
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection.toLowerCase()] = currentContent.join("\n").trim();
  }

  return sections;
}

// Convert markdown to HTML for email-safe rendering
async function markdownToHtml(md: string): Promise<string> {
  if (!md) return "";

  const html = await marked(md, {
    gfm: true,
    breaks: true,
  });

  // Add inline styles for email compatibility
  return html
    .replace(/<p>/g, '<p style="margin: 0 0 16px 0; line-height: 26px;">')
    .replace(/<ul>/g, '<ul style="margin: 0 0 16px 0; padding-left: 24px;">')
    .replace(/<li>/g, '<li style="margin: 0 0 8px 0;">')
    .replace(/<strong>/g, '<strong style="font-weight: 600; color: #1e293b;">')
    .replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline;" ');
}

// Fetch movie metadata from OMDB API
async function enrichMovies(movies: MovieFrontmatter[]): Promise<any[]> {
  const apiKey = process.env.OMDB_API_KEY;

  return Promise.all(
    movies.map(async (movie) => {
      const imdbIdMatch = movie.url.match(/tt\d+/);
      const imdbId = imdbIdMatch ? imdbIdMatch[0] : null;

      if (imdbId && apiKey) {
        try {
          const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
          const data = await res.json();
          if (data.Response === "True") {
            return {
              title: data.Title,
              year: data.Year?.replace("–", ""),
              posterUrl: data.Poster !== "N/A" ? data.Poster : undefined,
              rating: data.imdbRating !== "N/A" ? data.imdbRating : undefined,
              comment: movie.comment,
              imdbUrl: movie.url,
            };
          }
        } catch (err) {
          console.warn(`  ⚠ OMDB fetch failed for ${imdbId}: ${err}`);
        }
      }

      return {
        title: imdbId ? `Movie ${imdbId}` : "Unknown Movie",
        year: undefined,
        posterUrl: undefined,
        rating: undefined,
        comment: movie.comment,
        imdbUrl: movie.url,
      };
    })
  );
}

async function buildIssue(filename: string): Promise<void> {
  console.log(`\nBuilding: ${filename}`);

  const filepath = path.join(ISSUES_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8");
  const { data, content } = matter(raw);
  const frontmatter = data as IssueFrontmatter;

  // Extract sections from markdown content
  const sections = extractSections(content);

  // Convert markdown sections to HTML
  const [familyHtml, professionalHtml, healthHtml, travelHtml] = await Promise.all([
    markdownToHtml(sections["family"] || ""),
    markdownToHtml(sections["professional"] || ""),
    markdownToHtml(sections["health"] || sections["health & fitness"] || ""),
    markdownToHtml(sections["travel"] || sections["travel & adventures"] || ""),
  ]);

  // Enrich movie data (placeholder for OMDB integration)
  const enrichedMovies = frontmatter.movies
    ? await enrichMovies(frontmatter.movies)
    : [];

  // Prepare trading data
  const trading = frontmatter.trading
    ? {
        pnl: frontmatter.trading.pnl,
        sentiment: frontmatter.trading.sentiment,
        chartUrl: frontmatter.trading.chart,
        summary: frontmatter.trading.summary,
      }
    : undefined;

  // Prepare books data
  const books = (frontmatter.books || []).map((book) => ({
    title: book.title,
    author: book.author,
    status: book.status,
    comment: book.comment,
    coverUrl: book.cover_url,
    link: book.link,
  }));

  // Build props for the email component
  const props = {
    title: frontmatter.title,
    date: frontmatter.date,
    featuredImage: frontmatter.featured_image,
    greeting: frontmatter.greeting,
    familyContent: familyHtml || undefined,
    professionalContent: professionalHtml || undefined,
    healthContent: healthHtml || undefined,
    travelContent: travelHtml || undefined,
    trading,
    movies: enrichedMovies,
    spotifyPlaylistUrl: frontmatter.spotify_playlist_url,
    spotifyPlaylistName: frontmatter.spotify_playlist_name,
    books,
  };

  // Render to HTML
  const html = await render(MonthlyNewsletter(props));

  // Ensure output directories exist
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(HUGO_NEWSLETTER_DIR, { recursive: true });

  // Get slug from filename (e.g., "2026-01.md" -> "2026-01")
  const slug = path.basename(filename, ".md");

  // Write to dist directory (for email sending)
  const distPath = path.join(DIST_DIR, `${slug}.html`);
  fs.writeFileSync(distPath, html);
  console.log(`  ✓ Written to: ${distPath}`);

  // Write to Hugo content directory (for web archive)
  // Create a Hugo-compatible HTML file with frontmatter
  // Format date as YYYY-MM-DD for Hugo
  const dateObj = new Date(frontmatter.date);
  const hugoDate = dateObj.toISOString().split("T")[0];

  // Escape {{ and }} for Hugo — it interprets these as Go template syntax
  const hugoSafeHtml = html
    .replace(/{{/g, '{ {')
    .replace(/}}/g, '} }');

  const hugoContent = `---
title: "${frontmatter.title}"
date: ${hugoDate}
type: newsletter
layout: single
---
${hugoSafeHtml}`;

  const hugoPath = path.join(HUGO_NEWSLETTER_DIR, `${slug}.html`);
  fs.writeFileSync(hugoPath, hugoContent);
  console.log(`  ✓ Written to: ${hugoPath}`);
}

async function main() {
  console.log("🚀 Building newsletter issues...\n");

  const args = process.argv.slice(2);
  const issueArg = args.find((a) => a.startsWith("--issue="));

  if (issueArg) {
    // Build specific issue
    const issueFile = issueArg.split("=")[1];
    const filename = issueFile.endsWith(".md") ? issueFile : `${issueFile}.md`;
    await buildIssue(filename);
  } else {
    // Build all issues
    const files = fs.readdirSync(ISSUES_DIR).filter((f) => f.endsWith(".md"));

    if (files.length === 0) {
      console.log("No issues found in newsletter/issues/");
      return;
    }

    for (const file of files) {
      await buildIssue(file);
    }
  }

  console.log("\n✅ Build complete!");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
