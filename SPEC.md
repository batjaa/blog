# Batjaa's Monthly Newsletter - Technical Specification

## 1. Product Overview

**Goal:** A high-quality, media-rich monthly newsletter to update family and friends on life in Bothell, career progress, and personal interests.

**Frequency:** Monthly (Target: 1st of every month)

**Branding:** "Batjaa's Newsletter" or "Monthly Update from Batjaa" - personal, not branded

**Target Audience:** 50-200 subscribers (close family, extended network, some colleagues)

### Content Pillars

| Pillar | Description |
|--------|-------------|
| **Family** | Updates on Suvd, Huslen, and Sanchir |
| **Professional** | Software engineering insights (TS/Go/SaaS), work at Samsara |
| **Lifestyle** | Day trading summaries with chart images and P&L, hobby progress |
| **Consumption** | Movies (IMDB links), music (Spotify playlist), apps |
| **Books/Reading** | Reading list and book reviews |
| **Health/Fitness** | Workout summaries, health goals |
| **Travel/Plans** | Upcoming trips, local explorations in Bothell |

### Section Behavior
- **Empty sections:** Display placeholder text ("Nothing new this month!") to maintain consistent structure
- **Code content:** Dual audience approach - email gets prose summary, web archive includes full code snippets for tech readers

---

## 2. Technical Architecture

### 2.1 Repository Structure

```
blog/
├── content/                    # Hugo blog content
│   └── newsletter/             # Web archive
│       ├── _index.md           # Newsletter listing page
│       └── 2026-01.html        # Rendered email HTML (generated)
├── newsletter/                 # Newsletter source
│   ├── issues/
│   │   ├── 2026-01.md          # Source markdown
│   │   ├── 2026-02.md
│   │   └── ...
│   ├── templates/              # React Email components
│   ├── cache/                  # Movie metadata cache
│   └── package.json            # Newsletter-specific dependencies
├── functions/                  # Netlify serverless functions
│   └── subscribe.ts            # Public subscribe form handler
└── layouts/newsletter/         # Hugo layout (wraps email HTML)
    └── single.html             # Minimal wrapper with nav + subscribe form
```

### 2.2 Content Management

**Source of Truth:** Single markdown file per month in `newsletter/issues/` directory

**Schema:** Each month has a dedicated file (e.g., `2026-02.md`) with YAML frontmatter and freeform markdown body

**Validation:** Loose schema with sensible defaults
- Required: `title`, `date`
- Optional with defaults: `featured_image` (falls back to default family photo), sections

**Example Issue File:**
```markdown
---
title: "February 2026"
date: 2026-02-01
featured_image: https://cdn.example.com/feb-2026-hero.jpg
trading:
  sentiment: positive
  pnl: "+$1,234"
  chart: https://cdn.example.com/feb-2026-chart.png
movies:
  - url: https://www.imdb.com/title/tt1160419/
    comment: "Finally watched Dune - the visuals were incredible"
  - url: https://www.imdb.com/title/tt15239678/
    comment: "Dune Part Two - even better than the first"
---

## Family

This month Huslen started preschool! He was nervous the first day but by
the end of the week he didn't want to leave...

## Professional

Been deep in a migration project at Samsara. We're moving from...

## Health

Started a new workout routine focusing on...
```

**Section Parsing:** The build script parses H2 headers (`## Section`) to identify content pillars. Unrecognized sections are rendered as generic content blocks.

### 2.3 Media Pipeline

**Storage:** S3 CDN for high-res images

**Upload Workflow:** CLI tool with full optimization
```bash
newsletter upload jan-photo.jpg
# → Resizes to email-safe dimensions (600px width max)
# → Compresses to <200KB
# → Uploads to S3
# → Returns CDN URL and markdown snippet
```

**Video:** YouTube thumbnail with link (same in email and web)
- Upload to YouTube
- Include link in markdown
- Renders as clickable thumbnail image

**Hero Image Fallback:** If no featured image provided, falls back to a default family photo

### 2.4 Template Engine

**Framework:** React Email with Tailwind CSS

**Design Style:** Minimal + Magazine hybrid
- Clean typography, generous white space
- Editorial grid layout for consumption section
- Feature image prominence
- Color palette: TBD (will not match blog)

**Components:**
| Component | Purpose |
|-----------|---------|
| `HeroSection` | Featured family photo with month/year |
| `FamilyUpdate` | Prose section with inline images |
| `ProfessionalSection` | Work updates, optional code (prose in email, full code on web) |
| `TradingCard` | Chart image + P&L + sentiment indicator |
| `ConsumptionGrid` | Variable-length grid for movies, music, apps |
| `BooksSection` | Reading list with covers and short reviews |
| `HealthSection` | Fitness summaries, goals |
| `TravelSection` | Trip recaps, local explorations |
| `PlaceholderSection` | "Nothing new this month!" for empty pillars |

### 2.5 Movie Integration

**Source:** IMDB links provided manually in frontmatter

**Build-time enrichment:**
- Fetch movie metadata (title, year, poster, rating) from OMDB API or similar
- Fetch trailer embed URL from YouTube/IMDB
- Cache fetched data in `newsletter/cache/movies.json`

**Authoring workflow:**
1. Add IMDB URL + your commentary to frontmatter
2. Build fetches metadata automatically
3. Template renders poster, title, year, your commentary, and trailer link

**First-run behavior:** If cache is empty, build fetches fresh. If API unavailable and no cache, movie renders with just title/link (graceful degradation).

**Spotify:** Curated playlist link
- No API integration needed
- Manually include link to a monthly playlist you create/update

---

## 3. Delivery & Distribution

### 3.1 Email Provider

**Provider:** Postmark (via API)

**Contact Management:** Postmark-managed
- Subscriber list stored and managed entirely in Postmark
- No subscriber data in repository
- Unsubscribes: Postmark native suppression list

**Personalization:** Generic greeting ("Hey everyone" or similar)

**Analytics:** Full tracking enabled
- Open rates
- Click rates
- Useful to understand what resonates

### 3.2 Subscriber Management

**Initial Seeding:** Cold outreach to friends/family with link to subscribe form

**Subscribe Flow:** Public form on web archive
- Netlify serverless function at `/api/subscribe`
- Form submits email to function
- Function adds email to Postmark broadcast stream
- Postmark sends confirmation (native flow)

**Privacy:** Subscribers explicitly opt in via public form. No double opt-in required for this personal newsletter context.

**Unsubscribe Flow:** Postmark native
- Standard unsubscribe link in email footer
- Postmark manages suppression list automatically

### 3.3 Web Archive

**Integration:** Hugo wraps identical email HTML

**URL Structure:** `/newsletter/2026-02` (date-based slugs)

**Rendering Pipeline:**
1. React Email renders issue to HTML (single render)
2. Same HTML used for both email sending AND web archive
3. Hugo layout wraps the HTML with site nav, subscribe form, and footer
4. Newsletter HTML stored in `content/newsletter/YYYY-MM.html` (raw HTML, not markdown)

**Web vs Email:** Identical content. Hugo wrapper adds:
- Site navigation header
- Subscribe form (sidebar or footer)
- Site footer

**Public Access:** Yes, with subscribe form prominently displayed

---

## 4. Build & Deployment Pipeline

### 4.1 Toolchain

**Runtime:** Node.js + npm (TypeScript)

**CLI Tool:** TypeScript-based (shares types with React Email templates)

**Key Dependencies:**
- `react-email` - Template rendering
- `@react-email/components` - Pre-built components
- `tailwindcss` - Styling
- `postmark` - Email delivery
- `sharp` - Image optimization (for CLI tool)
- `@aws-sdk/client-s3` - S3 uploads

### 4.2 GitHub Actions Workflow

**Trigger:** Cron + Manual dispatch
```yaml
on:
  schedule:
    - cron: '0 9 1 * *'  # 9 AM UTC on 1st of month
  workflow_dispatch:      # Manual trigger
```

**Environment Variables:**
- `POSTMARK_API_KEY` - Email sending
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 uploads
- `TEST_EMAIL_ADDRESS` - Recipient for test sends
- `OMDB_API_KEY` - Movie metadata fetching

**Workflow Steps:**

1. **Cron triggers on 1st** → Creates draft PR with rendered preview
2. **Missing file handling:** If `newsletter/issues/YYYY-MM.md` doesn't exist, creates minimal template:
   ```markdown
   ---
   title: "Month YYYY"
   date: YYYY-MM-01
   ---

   ## Family

   Nothing new this month!
   ```
3. **You review PR** → Check preview, make edits if needed
4. **Approve/merge PR** → Triggers send workflow
5. **Send workflow:**
   - Validates markdown (date format, links - warnings only)
   - Fetches movie metadata (caches results)
   - Renders React Email to HTML
   - Sends test email to `TEST_EMAIL_ADDRESS`
   - On manual approval: broadcasts to Postmark list

### 4.3 Validation Checks

Pre-build script validates (warnings only, does not block build):
- [ ] Date formatting correct
- [ ] All links are valid (HTTP 200)
- [ ] Featured image exists (or fallback available)
- [ ] Required frontmatter fields present

**Behavior:** Validation issues logged as warnings. Build continues. Review warnings in PR before approving.

### 4.4 Preview Workflow

1. **Local preview:** `npm run preview` opens browser with rendered email
2. **Test email:** `npm run send:test` sends to `TEST_EMAIL_ADDRESS` env var
3. **Real device testing:** Check on iPhone, Android, Outlook
4. **Approve and broadcast**

---

## 5. Operational Guidelines

### 5.1 Monthly Workflow

**File Creation:** Manual. Create `newsletter/issues/YYYY-MM.md` at start of month.

**Throughout the month:**
- Add notes directly to markdown file (`newsletter/issues/2026-XX.md`)
- Upload media via CLI tool as events happen

**On the 1st:**
1. GitHub Action creates preview PR (or uses existing file)
2. Review rendered output
3. Make final edits
4. Approve PR to trigger send

**Target time:** < 30 minutes if notes kept during month

### 5.2 Missed Months

**Policy:** Send a short "life update" to maintain rhythm
- Brief message explaining busy/vacation
- One or two photos
- Promise full update next month

If file is missing, GitHub Action creates minimal template automatically.

### 5.3 Corrections

**Policy:** Silent fix in web archive
- Update markdown, push change
- Web archive reflects correction
- No errata notice needed
- Email recipients have original version

### 5.4 Failure Handling

**Postmark failures:** Trust Postmark's batch API
- Postmark handles retries internally
- No custom idempotency logic needed
- Monitor Postmark dashboard for issues

**Build failures:** GitHub Action notifies via standard PR checks. Review logs and fix.

---

## 6. CLI Tools

### 6.1 Media Upload

```bash
# Upload and optimize image
newsletter upload photo.jpg
# Output:
# ✓ Resized to 1200x800
# ✓ Compressed (2.1MB → 340KB)
# ✓ Uploaded to s3://newsletter-cdn/2026/02/photo.jpg
#
# Markdown:
# ![](https://cdn.example.com/2026/02/photo.jpg)
```

### 6.2 Local Preview

```bash
npm run preview
# → Builds current month's issue
# → Opens browser with rendered email
# → Hot reloads on markdown changes
```

### 6.3 Test Send

```bash
npm run send:test
# → Sends to TEST_EMAIL_ADDRESS env var
```

---

## 7. Success Criteria

| Metric | Target |
|--------|--------|
| Writing time | < 30 minutes (if notes kept) |
| Mobile rendering | Perfect on iOS Mail, Gmail, Android |
| Monthly cost | < $5 (S3 storage + egress, free tiers elsewhere) |
| Delivery rate | > 95% inbox placement |
| Rhythm | 12 issues per year (allowing for combined issues) |

---

## 8. Future Enhancements (Out of Scope for V1)

- [ ] `newsletter add` CLI command for quick notes
- [ ] Samsara API integration for "Public Career Log"
- [ ] Brokerage API for automated trading stats
- [ ] RSS feed for web archive
- [ ] Dark mode email template
- [ ] Multiple language support (English/Mongolian)
- [ ] Letterboxd integration (if API becomes available)

---

## 9. Security & Privacy

- **No secrets in repo:** All API keys in GitHub Secrets / Netlify env vars
- **S3 credentials:** In GitHub Secrets, not committed
- **Subscriber emails:** Managed entirely by Postmark, never in repository
- **Professional content:** Public on web archive (confirmed comfort level)
- **Analytics:** Full tracking enabled (open rates, clicks)

---

## 10. Open Questions

- [ ] **Cache strategy:** Currently `newsletter/cache/` would be committed for reproducible builds. This may cause merge conflicts if CI and local both update. Consider `.gitignore`-ing cache and only committing manually when pinning is needed.
- [ ] **Color palette:** To be determined during design phase.
