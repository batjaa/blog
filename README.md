# Batjaa's personal blog

This is where my personal blog and portfolio lives.

## Getting Started

The blog is powered by [Hugo](https://gohugo.io/). Enjoy!

### Prerequisites

What things you need to install the software and how to install them

```bash
brew install hugo
```

Node.js LTS (v20+) is also required for CSS compilation.

### Installing

Clone the repo and install dependencies:

```bash
git clone git@github.com:batjaa/blog.git
cd blog
npm install
```

### And coding style tests

Explain what these tests test and why

```
Give an example
```

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

trading:
  pnl: "+$1,234"
  sentiment: positive  # positive | negative | neutral
  chart: https://your-cdn.com/chart.png

movies:
  - url: https://www.imdb.com/title/tt1234567/
    comment: "Great movie!"

books:
  - title: "Book Title"
    author: "Author Name"
    status: reading  # reading | finished | abandoned
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

## Travel

Adventures...
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

### Images

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
