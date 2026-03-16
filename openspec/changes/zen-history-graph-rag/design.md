## Context

This is a greenfield ZEN Browser extension (Firefox/WebExtension-based). ZEN Browser uses the same extension APIs as Firefox, so we target the `browser.*` WebExtension API surface. There is no existing codebase — we're building from scratch.

The goal is to transform flat browser history into a structured knowledge graph that downstream RAG systems can ingest. All processing must happen locally for privacy.

**Constraints:**
- ZEN Browser supports Firefox WebExtension manifest v2 (with v3 compatibility path)
- Extension background scripts have access to `browser.history` and `browser.tabs`
- Content scripts can extract page DOM but run in a sandboxed context
- IndexedDB is available for persistent local storage in extensions
- No server-side components — everything runs on the user's machine

## Goals / Non-Goals

**Goals:**
- Extract browsing history with full metadata (URL, title, visit count, timestamps)
- Fetch and parse page content for visited URLs into clean text
- Extract entities and topics from page content to build graph nodes
- Construct a knowledge graph with meaningful relationships between pages, entities, and topics
- Export the graph in a chunked, embeddable format for RAG pipelines
- Keep all data local and under user control

**Non-Goals:**
- Real-time indexing of pages as they're visited (future enhancement)
- Running embedding models inside the extension (export is for external embedding)
- Supporting browsers other than ZEN (Chrome, Safari, etc.)
- Building a full RAG pipeline or chat interface inside the extension
- Syncing graph data across devices

## Decisions

### 1. Extension Architecture: Background Script + Content Script

**Decision:** Use a background service worker for orchestration (history access, graph construction, storage) and inject content scripts on-demand for page content extraction.

**Rationale:** Background scripts have access to `browser.history` API. Content scripts can access page DOM for extraction. This separation keeps concerns clean and avoids permissions bloat.

**Alternative considered:** Fetch pages from background script using `fetch()`. Rejected because many sites block non-browser requests and we lose access to rendered DOM content.

### 2. Content Extraction: Readability.js

**Decision:** Use Mozilla's Readability.js library for content extraction from page DOM.

**Rationale:** It's battle-tested (used in Firefox Reader View), handles diverse page layouts, extracts clean article text, and is already designed for the Firefox/ZEN ecosystem. Lightweight and no external dependencies.

**Alternative considered:** Custom DOM parsing. Rejected — too fragile across the diversity of web pages.

### 3. Entity/Topic Extraction: Rule-Based + TF-IDF

**Decision:** Use a rule-based NER approach (regex patterns for common entity types) combined with TF-IDF keyword extraction for topic identification. No ML models in v1.

**Rationale:** Running ML models in a browser extension is resource-intensive and complex. Rule-based extraction is fast, predictable, and sufficient for building an initial graph. TF-IDF over the user's corpus naturally surfaces personally-relevant topics.

**Alternative considered:** Local ONNX/WASM ML models (e.g., transformers.js). Deferred to v2 — adds significant complexity and bundle size for marginal v1 improvement.

### 4. Graph Model: Property Graph in JSON-LD

**Decision:** Model the knowledge graph as a property graph serialized in JSON-LD format.

**Node types:**
- `Page` — URL, title, extracted text, visit timestamps
- `Entity` — name, type (person, org, place, concept)
- `Topic` — keyword/phrase, TF-IDF score

**Edge types:**
- `page -[MENTIONS]-> entity`
- `page -[ABOUT]-> topic`
- `page -[LINKS_TO]-> page`
- `entity -[RELATED_TO]-> entity` (co-occurrence)
- `topic -[RELATED_TO]-> topic` (co-occurrence)

**Rationale:** JSON-LD is a W3C standard, human-readable, and trivially parseable. Property graphs are more expressive than simple triples for our use case. Easy to convert to other formats (RDF, Neo4j import, etc.).

**Alternative considered:** Raw RDF/Turtle — more standard for linked data but harder to work with in JavaScript and less readable for debugging.

### 5. Storage: IndexedDB with Object Stores

**Decision:** Use IndexedDB with separate object stores for nodes, edges, and metadata. Implement a simple graph query layer on top.

**Rationale:** IndexedDB is the only persistent storage option in extensions with sufficient capacity. Object stores allow indexed lookups by node type, entity name, or topic. No external database dependency.

**Alternative considered:** SQLite via WASM. Adds complexity and bundle size. IndexedDB is sufficient for the expected data volumes (thousands to tens of thousands of nodes).

### 6. RAG Export Format: Chunked Documents with Graph Metadata

**Decision:** Export as a collection of text chunks (one per page or per section), each annotated with graph metadata (connected entities, topics, relationships) in a JSON envelope.

```json
{
  "chunks": [
    {
      "id": "chunk-001",
      "text": "extracted page content...",
      "source_url": "https://...",
      "visited_at": "2026-03-14T...",
      "entities": ["GraphDB", "Neo4j"],
      "topics": ["graph-databases", "knowledge-graphs"],
      "related_chunks": ["chunk-003", "chunk-007"]
    }
  ],
  "graph": { "@context": "...", "nodes": [...], "edges": [...] }
}
```

**Rationale:** This format gives RAG pipelines both the raw text for embedding and the graph context for enriched retrieval. The consumer can use either or both.

## Risks / Trade-offs

- **Content extraction may fail on SPAs/dynamic pages** → Mitigation: Fall back to title + URL + meta description. Flag pages where extraction failed for potential re-processing.
- **Rule-based NER misses domain-specific entities** → Mitigation: Allow users to add custom entity patterns. Plan for ML-based extraction in v2.
- **IndexedDB storage limits** → Mitigation: Implement configurable retention policies (e.g., keep last 90 days). Provide manual cleanup UI.
- **Processing large history backlogs is slow** → Mitigation: Process in batches with progress UI. Prioritize recent history. Allow background processing.
- **Privacy risk if export file is shared unintentionally** → Mitigation: Clear warnings on export. No auto-upload. Export requires explicit user action.
