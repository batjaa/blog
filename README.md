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

### Environment Variables

For sending emails, set these in your `.env` (local) or GitHub Secrets (CI):

```bash
# Required
POSTMARK_API_KEY=your-api-key
TEST_EMAIL_ADDRESS=your@email.com

# For broadcasting (one of these methods)
NEWSLETTER_SUBSCRIBERS=email1@example.com,email2@example.com
# Or create newsletter/subscribers.json: { "subscribers": ["email@example.com"] }

# Optional
NEWSLETTER_FROM_EMAIL=newsletter@batjaa.com
```

### GitHub Actions

The newsletter workflow (`.github/workflows/newsletter.yml`) handles both automatic builds and manual email sending.

#### Automatic Builds (on push)

When you push changes to `newsletter/issues/**` or `newsletter/templates/**` on the `master` or `main` branch:

1. **Build** - Validates by rendering markdown issues into HTML
2. **Trigger Netlify** - Fires the Netlify build hook to deploy

Netlify then runs the full build (`npm run newsletter:build && hugo`) to generate and deploy the site.

> **Note:** Generated HTML (`content/newsletter/`, `newsletter/dist/`) is gitignored. Netlify builds from source on each deploy.

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
| `NEWSLETTER_SUBSCRIBERS` | Comma-separated list of subscriber emails |
| `NEWSLETTER_FROM_EMAIL` | (Optional) Sender email address |
| `NETLIFY_BUILD_HOOK` | Netlify build hook URL for triggering deploys |
| `OMDB_API_KEY` | (Optional) OMDB API key for movie metadata enrichment |

#### Netlify Configuration

Set your Netlify build command to:

```
npm run newsletter:build && npm run build
```

This ensures newsletter HTML is generated before Hugo builds the site.

## Deployment

```bash
./deploy.sh [commit message]
```
