## Why

The project has 50 tests across 5 files, but 4 core library modules (`graph-builder`, `graph-exporter`, `history-extractor`, `graph-db`) have zero dedicated unit tests. Only `url-utils`, `entity-extractor`, `tfidf`, and `text-chunker` are directly tested. The integration test covers the happy path but doesn't exercise edge cases in the untested modules. Adding dedicated tests for these modules will catch regressions and make the codebase safer to refactor.

## What Changes

- Add unit tests for `graph-builder.js` — node/edge creation, all 6 edge types, deduplication
- Add unit tests for `graph-exporter.js` — JSON-LD export, RAG chunk export, context summary, date filtering
- Add unit tests for `history-extractor.js` — history entry parsing, URL structure extraction, filtering
- Add unit tests for `graph-db.js` — IndexedDB store/retrieve/clear operations (using mocks)
- Expand edge case coverage in existing test files where gaps exist

## Capabilities

### New Capabilities
- `graph-builder-tests`: Unit tests for the graph building pipeline — node creation, edge generation for all 6 types, deduplication logic
- `graph-exporter-tests`: Unit tests for all export formats — JSON-LD, RAG chunks, context summary, date range filtering
- `history-extractor-tests`: Unit tests for history entry parsing, URL structure extraction, and entry filtering
- `graph-db-tests`: Unit tests for IndexedDB operations using a mock/fake store

### Modified Capabilities

## Impact

- New test files: `tests/graph-builder.test.js`, `tests/graph-exporter.test.js`, `tests/history-extractor.test.js`, `tests/graph-db.test.js`
- No production code changes
- Test runner command (`npm test`) unchanged — new files auto-discovered by glob pattern
