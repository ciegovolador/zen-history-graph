# Installation Guide

## Prerequisites

- [ZEN Browser](https://zen-browser.app/) (or any Firefox-based browser)
- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

## Build from Source

```bash
git clone git@github.com:ciegovolador/zen-history-graph.git
cd zen-history-graph
npm install
npm run build
```

This creates a `dist/` folder with the bundled extension:

```
dist/
  manifest.json
  background/
    background.js
  popup/
    popup.html
    popup.js
    popup.css
  visualizer/
    visualizer.html
    visualizer.js
    visualizer.css
```

## Load in ZEN Browser

1. Open ZEN Browser
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on..."**
4. Navigate to the `dist/` folder inside the project
5. Select `manifest.json` and click **Open**
6. The **ZEN History Graph** icon appears in your toolbar

## Verify Installation

- Click the extension icon in the toolbar
- You should see the popup with three tabs: **Dashboard**, **Settings**, **Export**
- The dashboard shows "No data yet" until you run your first extraction

## Troubleshooting

### Extension doesn't appear

- Make sure you selected `dist/manifest.json`, not `src/manifest.json`
- Check `about:debugging` for error messages under the extension entry

### Build fails

- Ensure Node.js v18+ is installed: `node --version`
- Delete `node_modules/` and run `npm install` again

### "Error processing background"

- Re-run `npm run build` and check for JavaScript errors in the output
- Open the Browser Console (`Ctrl+Shift+J`) for detailed error messages

## Development Mode

For active development with auto-rebuild:

```bash
npm run dev
```

This watches for file changes and rebuilds automatically. After each rebuild, go to `about:debugging` and click **Reload** on the extension to pick up changes.

## Running Tests

```bash
npm test
```

Runs 50 unit and integration tests covering URL normalization, entity extraction, TF-IDF, context chunking, navigation chains, temporal edges, and the full pipeline.
