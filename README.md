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

## Deployment

```bash
./deploy.sh [commit message]
```
