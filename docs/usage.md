# Usage Guide

## First Run

1. Click the **ZEN History Graph** icon in the toolbar
2. Click **"Extract & Build Graph"**
3. Watch the progress bar as it processes your history

The extraction pipeline runs through these phases:

| Phase | What it does |
|-------|-------------|
| History extraction | Reads URLs, titles, timestamps, and transitions from `browser.history` |
| Pages & entities | Creates page nodes, extracts entities from titles and URLs |
| Topic extraction | Runs TF-IDF over all titles and URL paths |
| Navigation chains | Detects page-to-page link transitions |
| Temporal edges | Connects pages visited within 10 minutes of each other |
| Domain edges | Connects pages sharing the same domain |
| Co-occurrence | Finds entities and topics that frequently appear together |

When complete, the dashboard shows your graph stats:

```
1,234 Pages    567 Entities
89 Topics       3,456 Relationships
Covering 2025-12-15 — 2026-03-15
```

## Settings

Switch to the **Settings** tab to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Date Range (days) | 90 | How far back to read history |
| Batch Size | 500 | History entries processed per batch (higher = faster, more memory) |
| Exclusion Patterns | empty | Glob patterns to skip, one per line |

### Exclusion Patterns

Add URL patterns to exclude from the graph. Uses glob-style matching with `*` as wildcard:

```
*internal.company.com*
*mail.google.com*
*accounts.google.com*
*login*
```

After changing settings, click **Save Settings** then re-run extraction from the Dashboard.

## Exporting Data

Switch to the **Export** tab. Four export options are available:

### Export Graph (JSON-LD)

Downloads a `.jsonld` file containing the full knowledge graph — all pages, entities, topics, and relationships. Use this for:

- Loading into graph databases (Neo4j, ArangoDB)
- Custom analysis scripts
- Integration with other tools

### Export for RAG

Downloads a `.json` file with context chunks optimized for RAG pipelines:

- **Domain chunks**: Groups all pages by domain with entities and topics
- **Topic chunks**: Groups pages by shared topic

Feed these chunks into your embedding pipeline (OpenAI, Cohere, local models) to build a searchable index over your browsing history.

### Export Context Summary

Downloads a `.md` markdown file summarizing your graph:

- Top 15 domains by visit count
- Top 20 entities by mention count
- Top 20 topics by relevance score
- Top 10 entity-entity relationships
- Graph structure breakdown (edge counts by type)

### Copy Context to Clipboard

Same as the context summary, but copies directly to your clipboard. Paste it into ChatGPT, Claude, or any AI chat as a system prompt to give the model context about your browsing patterns.

## Re-running Extraction

You can re-run extraction at any time. The graph is rebuilt from scratch each time using the current settings. This is fast because there are no network requests — it only reads the local history API.

## Tips

- **Start with 30 days** if you have a very large history, then increase
- **Exclude noisy domains** (email, login pages, internal tools) for a cleaner graph
- **Use the RAG export** with an embedding model to build a personal knowledge base
- **Copy the context summary** into AI chats when you need the model to understand your recent research context
