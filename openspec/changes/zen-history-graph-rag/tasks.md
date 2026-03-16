<!-- REDESIGN NOTE (v2.0.0): The extension has been redesigned to work purely from
     browser.history metadata. Content scripts, Readability.js, page fetching, and
     text chunking of page bodies have all been removed. The graph is now built
     entirely from URLs, titles, visit counts, timestamps, and transition types.
     This makes the extension instant, privacy-friendly, reliable, and simpler. -->

## 1. Project Setup

- [x] 1.1 Scaffold ZEN/Firefox WebExtension project structure (manifest.json, background script, popup HTML/JS)
- [x] 1.2 Configure manifest.json with required permissions: `history`, `storage` only
- [x] ~~1.3 Add Readability.js as a bundled dependency~~ — REMOVED (no content extraction)
- [x] 1.4 Set up IndexedDB schema with object stores: `pages`, `entities`, `topics`, `edges`, `metadata` (removed `chunks`)
- [x] 1.5 Set up build tooling (esbuild) for bundling the extension

## 2. History Extraction

- [x] 2.1 Implement `browser.history.search` wrapper to fetch history entries within a configurable date range (default 90 days)
- [x] 2.2 Implement `browser.history.getVisits` integration to retrieve per-URL visit details (timestamps, transition types, referringVisitId)
- [x] 2.3 Build URL normalization: strip tracking params (`utm_*`, `ref`, `fbclid`), merge duplicate entries
- [x] 2.4 Implement history filter to exclude internal pages (`about:*`, `moz-extension:*`, data URIs, localhost) and user-configured exclusion patterns
- [x] 2.5 Implement batch processing with configurable batch size (default 500) and progress callback reporting
- [x] 2.6 Parse URL structure (domain, path segments) for use in entity/topic extraction
- [x] 2.7 Build navigation chain detection from visit transition types
- [x] 2.8 Build temporal proximity detection (pages visited within 10 min)
- [x] 2.9 Build same-domain grouping

## 3. ~~Content Parsing~~ — REMOVED

All content parsing tasks removed. The extension no longer fetches or parses page content.

## 4. Graph Construction

- [x] 4.1 Implement `Page` node creation in IndexedDB from history entries (URL, domain, title, path segments, visit data)
- [x] 4.2 Build rule-based entity extractor for titles + URL paths/domains: technologies, proper nouns, known domain entities, project names
- [x] 4.3 Implement TF-IDF keyword extractor over titles + URL path segments for topic identification
- [x] 4.4 Create `Entity` and `Topic` node management in IndexedDB with deduplication and merge logic
- [x] 4.5 Build edge creation for all relationship types: `MENTIONS`, `ABOUT`, `LINKS_TO` (navigation chains), `RELATED_TO` (co-occurrence), `TEMPORAL` (time proximity), `SAME_DOMAIN`
- [x] 4.6 Implement graph statistics: node/edge counts by type, date range, last update timestamp

## 5. RAG Export

- [x] 5.1 Implement JSON-LD full graph export with all nodes and edges, supporting optional date range filter
- [x] 5.2 Build RAG-ready context chunk export: domain-grouped and topic-grouped summaries with entities, topics, visit ranges
- [x] 5.3 Implement context summary generator: top domains, top entities, top topics, key relationships, graph structure as markdown
- [x] 5.4 Implement clipboard copy for context summary with toast confirmation
- [x] 5.5 Add format version (`2.0.0`) to all export outputs

## 6. Extension UI

- [x] 6.1 Build popup UI with dashboard: graph stats display, extraction trigger button, progress indicator
- [x] 6.2 Add settings panel: date range config, batch size, exclusion patterns (removed concurrent fetches, fetch delay, chunk size)
- [x] 6.3 Add export panel: buttons for JSON-LD export, RAG chunk export, context summary export, and clipboard copy
- [x] 6.4 Implement progress reporting in popup UI during extraction and graph building

## 7. Testing & Polish

- [x] 7.1 Write unit tests for URL normalization, entity extraction (text + entry-based + batch), TF-IDF (with entriesToDocuments), context chunking (domain, topic, time window)
- [x] 7.2 Write integration tests for history metadata -> entity extraction -> topic extraction -> context chunking -> graph edge detection pipeline
- [ ] 7.3 Test with ZEN Browser: verify all `browser.*` APIs work correctly
- [ ] 7.4 Test with large history sets (10k+ entries) for performance and memory usage
- [ ] 7.5 Validate exported JSON-LD against JSON-LD spec and test RAG chunk format with a sample embedding pipeline
