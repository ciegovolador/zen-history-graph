## Why

Browser history is a rich but underutilized source of personal knowledge. In its raw form (flat list of URLs + timestamps), it's unsearchable by meaning and disconnected from context. By converting browsing history into a knowledge graph — with entities, topics, and relationships extracted from visited pages — we can enable semantic retrieval (RAG) over a user's entire browsing context. This makes it possible to ask natural language questions like "What was that article I read about graph databases last week?" and get precise, contextual answers.

ZEN Browser (Firefox-based) exposes extension APIs for history access, making it the ideal target for a plugin that bridges personal browsing data and AI-powered retrieval.

## What Changes

- **New browser extension** for ZEN Browser that reads browsing history via the `browser.history` API
- **Content extraction pipeline** that fetches and parses page content (title, body text, metadata) from visited URLs
- **Entity and topic extraction** using NLP to identify key concepts, people, organizations, and topics from page content
- **Graph construction** that builds a knowledge graph with nodes (pages, entities, topics) and edges (relationships like "mentions", "related-to", "visited-before")
- **Graph storage** in a local-first format (JSON-LD or similar) suitable for downstream RAG ingestion
- **Export API** that serves the graph context in a format ready for embedding and vector store ingestion
- **Privacy-first design** — all processing happens locally in the browser or on the user's machine; no data leaves the device

## Capabilities

### New Capabilities
- `history-extraction`: Reading and normalizing ZEN browser history via WebExtension APIs
- `content-parsing`: Fetching and extracting structured content (text, metadata) from visited pages
- `graph-construction`: Building a knowledge graph from extracted entities, topics, and page relationships
- `rag-export`: Exporting the graph in chunked, embeddable formats ready for RAG pipelines

### Modified Capabilities
<!-- No existing capabilities to modify — this is a greenfield project -->

## Impact

- **New codebase**: ZEN/Firefox WebExtension (manifest v2/v3 compatible)
- **Dependencies**: Content extraction library (e.g., Readability.js), NLP processing (local model or rule-based), graph serialization (JSON-LD / RDF)
- **APIs used**: `browser.history`, `browser.tabs`, `fetch` for content retrieval
- **Storage**: IndexedDB for local graph persistence
- **Output format**: JSON-LD graph + chunked text documents with metadata for RAG embedding
