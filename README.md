# Batjaa's personal blog

This is where my personal blog and portfolio lives.

## Getting Started

The blog is powered by [Hugo](https://gohugo.io/). Enjoy!

### Prerequisites

What things you need to install the software and how to install them

```bash
brew install hugo
```

Node.js 24 LTS is required for CSS compilation and newsletter tooling. Use `nvm use`
to select the version in `.nvmrc`; Netlify and GitHub Actions also use Node 24.
The newsletter photo carousel uses locally compiled Tailwind utilities; the rest of the theme uses Less.

### Installing

Clone the repo and install dependencies:

```bash
git clone git@github.com:batjaa/blog.git
cd blog
npm ci
```

### Dependency and regression checks

```bash
npm ci
npm --prefix newsletter ci
npm audit
npm --prefix newsletter audit
npm test
npm --prefix newsletter test
npm --prefix newsletter run typecheck
```

These checks cover subscription functions, newsletter rendering and delivery logic,
and YAML frontmatter validation. GitHub Actions runs them for pull requests and
pushes to the main branches. Dependabot checks both npm projects and pinned GitHub
Actions weekly.

The Tailwind CLI currently pins an older file watcher. The scoped `@parcel/watcher`
override selects 2.6+ to remove its vulnerable `micromatch`/`braces` dependency chain;
remove the override once Tailwind updates its own dependency.

## Development

### Running the development server

To compile CSS and start the Hugo development server:

```bash
npm run dev
```

This will:
1. Compile the Less files to CSS
2. Start Hugo server with cache clearing and static file syncing
3. Watch for changes (Hugo hot-reload)

### CSS Development

To compile CSS separately:

```bash
npm run css:build
```

To watch for CSS changes during development:

```bash
npm run css:watch
```

After changing newsletter carousel classes, run `npm run css:newsletter` to regenerate its stylesheet. `npm run dev` and `npm run build` also compile it.

### Building for production

To compile CSS and build the site for production:

```bash
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory (use `.env.example` as a template):

```bash
cp .env.example .env
```

Configure the following optional features:

- **Instagram Feed**: Now uses manually curated posts (no API token needed)
  - To update the displayed posts, edit `themes/mongkok/layouts/partials/instagramfeed.html`
  - Simply update the post IDs in the `$posts` array
- **GOOGLE_MAPS_API_TOKEN**: For displaying Google Maps
  - Get your API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
  - For production use, create a Map ID in Google Cloud Console and update the `mapId` in `themes/mongkok/assets/js/post.js`

## Newsletter

Monthly newsletter system that generates both email-ready HTML and a web archive.
Templates and rendering use the unified React Email 6 package, with `@react-email/ui`
for previews. The preview reads `newsletter/templates/emails/` directly; the old
generated `newsletter/emails/` folder is no longer used. Issue metadata is parsed
as YAML only, with bounded alias expansion and rejection of executable tags.

### Setup (first time only)

```bash
npm run newsletter:install
```

### Creating a New Issue

```bash
# Create newsletter for current month
npm run newsletter:new

# Or specify a month
npm run newsletter:new 2026-02
```

This creates `newsletter/issues/YYYY-MM.md` with a template.

### Writing Content

Edit the markdown file in `newsletter/issues/`. The file has two parts:

**1. YAML Frontmatter** - Structured data for special sections:

```yaml
---
title: "February 2026"
date: 2026-02-01
featured_image: https://your-cdn.com/hero.jpg
intro: "Here's what's been happening over the past few months." # Optional; defaults to this month

trading:
  pnl: "+$1,234"
  sentiment: positive  # positive | negative | neutral
  chart: https://your-cdn.com/chart.png

movies:
  - url: https://www.imdb.com/title/tt1234567/
    title: "Movie or series title" # Optional fallback if metadata is unavailable
    comment: "Great movie!" # Optional individual reaction

watching_note: "An overall reaction to what I've been watching." # Optional

books:
  - title: "Book Title"
    author: "Author Name"
    status: reading  # Optional: reading | finished | abandoned
---
```

**2. Markdown Body** - Prose sections using H2 headers:

```markdown
## Family

Updates about the family...

## Professional

Work updates...

## Health

Fitness progress...

## Trading

Market thoughts or lessons (no P&L numbers required)...

## Travel

Adventures...

## Closing

An optional personal reflection, rendered before the sign-off without a section heading...
```

### Build & Preview

```bash
# Build the newsletter (generates HTML for email + web archive)
npm run newsletter:build

# Preview in browser (hot-reload)
npm run newsletter:preview

# Send test email to yourself
npm run newsletter:send:test
```

### Full Build (Blog + Newsletter)

```bash
# Build everything for production
npm run newsletter:build && npm run build
```

The newsletter will be available at `/newsletter/YYYY-MM/` on the site.

### Mongolian editions

Each issue can have a Mongolian companion: `newsletter/issues/YYYY-MM.mn.md`.
Keep YAML field names and the `## Family`, `## Professional`, `## Health`, `## Trading`,
`## Travel`, `## Random Thoughts`, and `## Closing` section keys in English; translate
values, prose, and image alt text. Keep dates, links, and media URLs aligned with the
English source. Movie, book, song, and product names may retain their original titles.

`npm run newsletter:build` builds both languages. The `.mn` filename selects Mongolian
headings, dates, and footer text, writes `newsletter/dist/YYYY-MM.mn.html`, and generates
`content/newsletter/YYYY-MM.mn.html` for Hugo. The archive appears at
`https://batjargal.mn/newsletter/`, with links between matching English and Mongolian
issues. English issues remain at `https://batjaa.com/newsletter/`.

To build one translation:

```bash
npm --prefix newsletter run build -- --issue=2026-09.mn
```

Email sending defaults to **English** and ignores translated and preview files when
selecting the latest issue. To explicitly test a Mongolian email:

```bash
npm --prefix newsletter run send:test -- --language=mn --issue=2026-09.mn
```

Subscriber language preferences are not implemented: the subscription form still joins
the existing English mailing list, as explained on the Mongolian archive. An explicit
`--language=mn` broadcast would send to the entire existing list, not a Mongolian segment.
The GitHub sending workflow continues to use English.

Run `npm --prefix newsletter test` for rendering, date, language selection, photo grouping,
and translation media/link parity checks. Shared email translations live in
`newsletter/templates/components/locale.ts`; archive labels live in `i18n/`.

### Images

Consecutive image-only blocks (HTML `<img>` tags or Markdown images, separated by blank lines) form a photo group. Put a paragraph between images to keep them separate.

- On the web, each group becomes a manual carousel with swipe, previous/next buttons, keyboard navigation, a photo count, and a link to the full photo. Images retain their full proportions.
- In email, the same group is a two-column table of linked photos. The table also remains usable on the web when JavaScript is unavailable.
- Single images stay in the story. Local site images can live in `static/images/newsletter/YYYY-MM/`; use their absolute `https://batjaa.com/images/newsletter/YYYY-MM/...` URLs in the issue. Those URLs become available after the site is deployed.

Run `npm --prefix newsletter test` to check photo grouping. Drafting prompts belong in `newsletter/notes/`, outside the buildable `newsletter/issues/` folder.

Upload images to S3 (served via CloudFront):

```bash
aws s3 cp photo.jpg s3://batjaa-blog-email-media/2026/02/photo.jpg
```

Then reference in your newsletter as:

```
https://d2f2jpla7ooipu.cloudfront.net/2026/02/photo.jpg
```

### Environment Variables

For sending emails, set these in your `.env` (local) or GitHub Secrets (CI):

```bash
# Required
POSTMARK_API_KEY=your-api-key
TEST_EMAIL_ADDRESS=your@email.com
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
NEWSLETTER_TOKEN_SECRET=generate-a-long-random-secret

# Optional
NEWSLETTER_FROM_EMAIL=newsletter@batjaa.com
```

For Postmark webhooks, configure:

- URL: `https://batjaa.com/api/postmark/webhook`
- Header `X-Postmark-Server-Token`: value from `POSTMARK_WEBHOOK_TOKEN` (if set)

### GitHub Actions

The newsletter workflow (`.github/workflows/newsletter.yml`) handles both automatic builds and manual email sending.

#### Automatic Builds (on push)

When you push changes to `newsletter/issues/**` or `newsletter/templates/**` on the `master` or `main` branch:

1. **Build** - Renders markdown issues into HTML
2. **Netlify auto-deploys** - Triggered by the push to master

#### Manual Triggers

Go to **Actions** → **Newsletter** → **Run workflow** to manually trigger:

| Action | Description |
|--------|-------------|
| `build-only` | Build newsletter HTML without sending |
| `send-test` | Build and send to your test email address |
| `send-broadcast` | Build and send to all subscribers |

#### Delivery reports and sending pace

After either send action, open the **send** job summary for recipient counts,
delivery status, SMTP error details, and links to each Postmark message. Download
the **newsletter-delivery-report** artifact for Markdown and JSON copies (kept for
14 days). Reports are checkpointed during sending and uploaded even when a step
fails. Local sends save them to `newsletter/reports/`, which is ignored by Git.
Because this repository is public, Actions reports use numbered recipient labels
and redact email addresses from error text. Open the authenticated Postmark links
to identify recipients. Local reports include their addresses.

The sender checks Postmark delivery events after each submission and polls unresolved
messages for up to two minutes after sending ends. `delivered` means the recipient's
mail server accepted the message; inbox placement is not known. `accepted` and
`deferred` remain pending. Bounces, rejections, unknown submissions, unsent recipients,
and pending delivery make the action fail instead of claiming success.

Refresh a downloaded JSON report without sending any email:

```bash
cd newsletter
npx tsx scripts/send.ts --report=/path/to/report.json
npx tsx scripts/send.ts version
```

Refresh writes a new report in `newsletter/reports/` and preserves the original.
Do not rerun a broadcast just to refresh delivery: a new broadcast sends again to
all active subscribers. For `unknown` or interrupted `submitting` entries, check
Postmark activity before attempting a resend.

Broadcasts send one recipient at a time, with a six-second pause between submissions
(at most 10 recipients/minute). Change `send_interval_seconds` in **Run workflow**
to slow sending further. GitHub serializes send jobs to prevent overlapping sends;
avoid running a local broadcast at the same time. Local configuration:

| Variable | Default | Range |
|----------|---------|-------|
| `NEWSLETTER_SEND_INTERVAL_SECONDS` | `6` | 1–300 seconds |
| `NEWSLETTER_DELIVERY_WAIT_SECONDS` | `120` | 0–1800 seconds |
| `NEWSLETTER_VERSION` | `dev` | Injected with the commit SHA in Actions |

If a delivery event reports throttling or deferral, or delivery checks become
unavailable, the sender stops submitting the remaining recipients. It retries
definite Postmark HTTP 429 rejections twice, waiting 30 and 60 seconds. Network
timeouts and server errors are uncertain submissions and are never automatically
resent, since Postmark might already have accepted them.

Pacing reduces bursts; Gmail has no universal safe sending rate. Follow
[Google's sender guidance](https://support.google.com/mail/answer/15256272): after
deferrals, pause for at least 15 minutes, try a single recipient, and resume at a
lower rate once delivery succeeds. Maintain SPF, DKIM, DMARC, and working unsubscribe
links. [Postmark's Bulk API](https://postmarkapp.com/bulk-api) offers provider-managed
pacing but requires account activation; this sender currently uses the regular API.

The subscription webhook suppresses hard bounces, addresses Postmark marks inactive,
spam complaints, and subscription events with `SuppressSending: true`. Temporary
bounces with `Inactive: false` do not suppress subscribers. Existing database
suppressions are not automatically cleared; review their original cause before
reactivating anyone.

#### Required Secrets

| Secret | Description |
|--------|-------------|
| `POSTMARK_API_KEY` | Postmark API key for sending emails |
| `TEST_EMAIL_ADDRESS` | Email address for test sends |
| `TURSO_DATABASE_URL` | Turso database URL for subscriber list |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `NEWSLETTER_TOKEN_SECRET` | HMAC secret used for unsubscribe links |
| `NEWSLETTER_FROM_EMAIL` | (Optional) Sender email address |
| `POSTMARK_WEBHOOK_TOKEN` | (Optional) Verifies Postmark webhook requests |
| `OMDB_API_KEY` | (Optional) OMDB API key for movie metadata enrichment |

## Deployment

```bash
./deploy.sh [commit message]
```
