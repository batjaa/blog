#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get target month from args or use current month
const args = process.argv.slice(2);
let year, month;

if (args[0]) {
  // Accept YYYY-MM format
  const match = args[0].match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    console.error('Usage: npm run newsletter:new [YYYY-MM]');
    console.error('Example: npm run newsletter:new 2026-02');
    process.exit(1);
  }
  year = parseInt(match[1], 10);
  month = match[2]; // Keep as string with leading zero
} else {
  const now = new Date();
  year = now.getFullYear();
  month = String(now.getMonth() + 1).padStart(2, '0');
}

const slug = `${year}-${month}`;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const monthName = monthNames[parseInt(month, 10) - 1];

const issuesDir = path.join(__dirname, '..', 'newsletter', 'issues');
const filePath = path.join(issuesDir, `${slug}.md`);

// Check if file already exists
if (fs.existsSync(filePath)) {
  console.log(`Newsletter already exists: ${filePath}`);
  console.log('Edit the existing file to add content.');
  process.exit(0);
}

// Create template
const template = `---
title: "${monthName} ${year}"
date: ${year}-${month}-01
active: false
# featured_image: https://your-cdn.com/path/to/hero.jpg
# greeting: "Hey everyone!"

# movies:
#   - url: https://www.imdb.com/title/tt1234567/
#     comment: "Your thoughts on the movie..."

# spotify_playlist_url: https://open.spotify.com/playlist/...
# spotify_playlist_name: "${monthName} ${year} Vibes"

# books:
#   - title: "Book Title"
#     author: "Author Name"
#     status: reading  # reading | finished | abandoned
#     comment: "Your thoughts..."
---

## Family

Nothing new this month!

## Professional

Nothing new this month!

## Health

<!-- Remove this section if nothing to share -->

## Travel

<!-- Remove this section if nothing to share -->
`;

// Ensure directory exists
fs.mkdirSync(issuesDir, { recursive: true });

// Write file
fs.writeFileSync(filePath, template);

console.log(`✅ Created: newsletter/issues/${slug}.md`);
console.log('');
console.log('Next steps:');
console.log(`  1. Edit newsletter/issues/${slug}.md to add your content`);
console.log('  2. Run: npm run newsletter:build');
console.log('  3. Run: npm run newsletter:preview  (opens browser)');
console.log('  4. Run: npm run newsletter:send:test');
