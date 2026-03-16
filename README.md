# ZEN History Graph

A ZEN/Firefox browser extension that transforms your browsing history into a knowledge graph ready for RAG (Retrieval-Augmented Generation).

No page fetching, no content scripts, no network requests. Works entirely from your local `browser.history` metadata — instant, private, and reliable.

## What It Does

- Reads your browser history (URLs, titles, timestamps, navigation transitions)
- Extracts **entities** (technologies, people, organizations, platforms) from titles and URLs
- Identifies **topics** using TF-IDF across your browsing corpus
- Builds a **knowledge graph** with 6 relationship types
- Exports in **JSON-LD**, **RAG-ready chunks**, or **markdown context summaries**
- Visualizes the graph with an interactive **force-directed graph viewer**

## Quick Start

```bash
git clone git@github.com:ciegovolador/zen-history-graph.git
cd zen-history-graph
npm install
npm run build
```

Then load `dist/` as a temporary extension in ZEN Browser:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `dist/manifest.json`

Click the extension icon and hit **Extract & Build Graph**.

## Features

| Feature | Description |
|---------|-------------|
| History Extraction | Reads browser history with URL normalization, deduplication, and filtering |
| Entity Extraction | Rule-based NER from titles and URL paths (50+ known tech terms, domain entity mapping) |
| Topic Extraction | TF-IDF keyword analysis across your entire browsing corpus |
| Graph Construction | 6 edge types: MENTIONS, ABOUT, LINKS_TO, TEMPORAL, SAME_DOMAIN, RELATED_TO |
| JSON-LD Export | Full graph export with W3C JSON-LD context, filterable by date range |
| RAG Export | Domain-grouped and topic-grouped context chunks ready for embedding pipelines |
| Context Summary | Markdown summary of top entities, topics, domains, and relationships |
| Graph Visualizer | Full-page interactive force-directed graph with search, filters, zoom, and detail panels |

## Export Formats

**JSON-LD** — Load into Neo4j, graph tools, or custom pipelines:
```json
{
  "@context": { ... },
  "formatVersion": "2.0.0",
  "nodes": [
    { "@type": "Page", "url": "...", "title": "...", "visitCount": 5 },
    { "@type": "Entity", "name": "React", "type": "technology", "mentions": 12 },
    { "@type": "Topic", "name": "frontend", "score": 2.34 }
  ],
  "edges": [
    { "@type": "MENTIONS", "source": "https://...", "target": "entity:react" }
  ]
}
```

**RAG Chunks** — Feed directly into embedding pipelines:
```json
{
  "chunks": [
    {
      "id": "domain:github.com",
      "text": "Visited github.com 147 times across 43 pages. Key pages: ...",
      "entities": ["GitHub", "react"],
      "topics": ["development", "frontend"]
    }
  ]
}
```

**Context Summary** — Copy-paste as a system prompt for AI chat:
```
# Browsing Context Summary
1,234 pages indexed | 567 entities | 89 topics | 3,456 relationships

## Top Domains
- github.com — 234 visits
- stackoverflow.com — 89 visits
...
```

## Development

```bash
npm run build    # Build to dist/
npm run dev      # Watch mode
npm test         # Run 50 unit + integration tests
```

## Permissions

Only two browser permissions required:
- `history` — Read browsing history
- `storage` — Persist the graph in IndexedDB
- `tabs` — Open the graph visualizer page

All data stays on your machine. Nothing is sent anywhere.

## Documentation

See the [docs/](docs/) folder for detailed guides:
- [Installation Guide](docs/installation.md)
- [Usage Guide](docs/usage.md)
- [Graph Visualizer](docs/visualizer.md)
- [Export Formats](docs/export-formats.md)
- [Architecture](docs/architecture.md)

## License

[MIT](LICENSE)
