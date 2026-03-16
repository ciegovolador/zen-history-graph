# Export Formats

All exports include a `formatVersion` field for forward compatibility. Current version: `2.0.0`.

## JSON-LD Graph Export

Full knowledge graph in W3C JSON-LD format. File extension: `.jsonld`.

### Structure

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "zen": "https://zen-history-graph.local/ontology/",
    "Page": "zen:Page",
    "Entity": "zen:Entity",
    "Topic": "zen:Topic",
    "MENTIONS": "zen:mentions",
    "ABOUT": "zen:about",
    "LINKS_TO": "zen:linksTo",
    "RELATED_TO": "zen:relatedTo",
    "TEMPORAL": "zen:temporal",
    "SAME_DOMAIN": "zen:sameDomain"
  },
  "formatVersion": "2.0.0",
  "exportedAt": "2026-03-15T10:30:00.000Z",
  "nodes": [...],
  "edges": [...]
}
```

### Node Types

**Page**
```json
{
  "@type": "Page",
  "url": "https://github.com/user/repo",
  "domain": "github.com",
  "title": "user/repo: Project description",
  "visitCount": 12,
  "firstVisited": 1710000000000,
  "lastVisited": 1710500000000
}
```

**Entity**
```json
{
  "@type": "Entity",
  "id": "entity:react",
  "name": "react",
  "normalizedName": "react",
  "type": "technology",
  "mentions": 24,
  "aliases": ["react", "React", "React.js"]
}
```

**Topic**
```json
{
  "@type": "Topic",
  "id": "topic:frontend",
  "name": "frontend",
  "score": 3.456
}
```

### Edge Types

```json
{
  "@type": "MENTIONS",
  "source": "https://react.dev/docs",
  "target": "entity:react",
  "weight": 3
}
```

| Edge Type | Source | Target | Weight meaning |
|-----------|--------|--------|---------------|
| MENTIONS | Page URL | Entity ID | Occurrence count in title/URL |
| ABOUT | Page URL | Topic ID | TF-IDF score |
| LINKS_TO | Page URL | Page URL | 1 (binary) |
| TEMPORAL | Page URL | Page URL | 1 (binary) |
| SAME_DOMAIN | Page URL | Page URL | n/a |
| RELATED_TO | Entity/Topic ID | Entity/Topic ID | Co-occurrence count |

### Date Range Filtering

The popup exports the full graph. To filter programmatically, the `exportJsonLD` message supports options:

```javascript
browser.runtime.sendMessage({
  type: 'EXPORT_JSONLD',
  options: {
    startDate: '2026-03-01',
    endDate: '2026-03-15'
  }
});
```

---

## RAG Chunk Export

Context chunks optimized for embedding and retrieval. File extension: `.json`.

### Structure

```json
{
  "formatVersion": "2.0.0",
  "exportedAt": "2026-03-15T10:30:00.000Z",
  "totalChunks": 45,
  "chunks": [...]
}
```

### Chunk Types

**Domain Chunk** — summarizes all activity on a domain:

```json
{
  "id": "domain:github.com",
  "type": "domain",
  "text": "Visited github.com 147 times across 43 pages. Key pages: 'Pull Request #123 - Fix auth', 'Issues - myproject', 'Actions workflow runs'. Related entities: GitHub, react, typescript. Topics: development, frontend, ci-cd.",
  "source_urls": ["https://github.com/...", "..."],
  "visit_range": {
    "start": "2026-01-15",
    "end": "2026-03-15"
  },
  "entities": ["GitHub", "react", "typescript"],
  "topics": ["development", "frontend", "ci-cd"],
  "visit_count": 147,
  "page_count": 43
}
```

**Topic Chunk** — summarizes pages sharing a topic:

```json
{
  "id": "topic:kubernetes",
  "type": "topic",
  "text": "Topic \"kubernetes\" appears across 12 pages on 4 domains. Key pages: 'Kubernetes Docs', 'Deploy with Helm'. Domains: kubernetes.io, github.com, stackoverflow.com.",
  "source_urls": ["https://kubernetes.io/...", "..."],
  "entities": [],
  "topics": ["kubernetes"],
  "visit_count": 34,
  "page_count": 12
}
```

### Using with Embedding Pipelines

Each chunk's `text` field is designed to be passed directly to an embedding model. The `entities` and `topics` arrays can be used as metadata filters in your vector store.

Example with a typical RAG setup:

1. Export RAG chunks from the extension
2. For each chunk, compute an embedding of the `text` field
3. Store in your vector database with `id`, `entities`, `topics`, and `source_urls` as metadata
4. At query time, retrieve relevant chunks and pass them as context to your LLM

---

## Context Summary Export

Human-readable markdown summary. File extension: `.md`.

### Structure

```markdown
# Browsing Context Summary

*1,234 pages indexed | 567 entities | 89 topics | 3,456 relationships*

## Top Domains

- **github.com** — 234 visits
- **stackoverflow.com** — 89 visits
...

## Top Entities

- **React** (technology) — 45 mentions
- **GitHub** (platform) — 38 mentions
...

## Top Topics

- **frontend** — relevance: 4.567
- **kubernetes** — relevance: 3.234
...

## Key Relationships

- React <-> JavaScript (co-occurred 23 times)
- Docker <-> Kubernetes (co-occurred 18 times)
...

## Graph Structure

- MENTIONS: 1,234 edges
- ABOUT: 2,345 edges
- LINKS_TO: 567 edges
- TEMPORAL: 890 edges
- SAME_DOMAIN: 345 edges
- RELATED_TO: 75 edges
```

### Use as System Prompt

The context summary is designed to be pasted directly into AI chat interfaces as a system prompt or context preamble. It gives the model an understanding of your browsing patterns, interests, and research focus areas.
