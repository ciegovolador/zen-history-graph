## Context

The project has 50 tests across 5 files covering `url-utils`, `entity-extractor`, `tfidf`, `text-chunker`, and an integration test. Four core modules have no dedicated tests: `graph-builder`, `graph-exporter`, `history-extractor`, and `graph-db`. The integration test exercises the happy path through `buildNavigationChains`, `findTemporalEdges`, and `findSameDomainEdges` but doesn't cover edge cases or the class-based modules.

The test runner is Node.js built-in (`node --test`) with no external test frameworks. Tests are ESM modules auto-discovered via `tests/**/*.test.js`.

## Goals / Non-Goals

**Goals:**
- Add dedicated unit tests for `graph-builder.js`, `graph-exporter.js`, `history-extractor.js`, and `graph-db.js`
- Test edge cases in exported helper functions (`buildNavigationChains`, `findTemporalEdges`, `findSameDomainEdges`)
- Use a simple in-memory mock for `GraphDB` to test `GraphBuilder` and `GraphExporter` without IndexedDB
- Keep tests self-contained with no new dependencies

**Non-Goals:**
- Testing browser-specific APIs (`browser.history`) — `HistoryExtractor.extract()` requires a real browser environment
- Testing UI code (popup, visualizer)
- Achieving 100% line coverage — focus on logic and edge cases that matter
- Adding a test framework or coverage tool

## Decisions

**Mock DB approach**: Create a lightweight `MockDB` class that implements the same interface as `GraphDB` (put, get, getAll, count, clear, putMeta, getMeta, open) using plain Maps. This avoids needing IndexedDB polyfills or `fake-indexeddb`. The mock is simple enough to inline in each test file or share via a test helper.

*Alternative considered*: Using `fake-indexeddb` npm package. Rejected because it adds a dependency and the GraphDB wrapper is thin enough that testing through the mock is equivalent.

**History extractor testing**: Only test the three exported helper functions (`buildNavigationChains`, `findTemporalEdges`, `findSameDomainEdges`) which are pure functions. The `HistoryExtractor.extract()` method depends on `browser.history` APIs and is better tested manually in the browser.

*Alternative considered*: Mocking `browser.history`. Rejected because it would require substantial setup and the method is mostly glue code around the pure helpers.

**Graph DB testing**: Skip unit tests for `GraphDB` itself since it's a thin IndexedDB wrapper. The mock DB used in other tests validates the interface contract. If `graph-db.js` is changed, the mock must be updated to match, which serves as an implicit test.

## Risks / Trade-offs

**[Mock drift]** → The MockDB could diverge from real GraphDB behavior. Mitigation: keep mock minimal and match the interface exactly. The existing integration test exercises the real pipeline.

**[Browser-only code untested]** → `HistoryExtractor.extract()` and `GraphDB` remain untested in CI. Mitigation: these are thin wrappers; logic lives in the pure helper functions that are tested.
