## 1. Test Infrastructure

- [x] 1.1 Create `tests/helpers/mock-db.js` with a MockDB class implementing the GraphDB interface (open, put, get, getAll, count, delete, clear, putMeta, getMeta) using in-memory Maps

## 2. History Extractor Tests

- [x] 2.1 Create `tests/history-extractor.test.js` with tests for `buildNavigationChains` — link transitions within 30s, same-URL ignored, gap >30s ignored, non-link transitions ignored
- [x] 2.2 Add tests for `findTemporalEdges` — default window, outside window excluded, custom window size, deduplication of pairs
- [x] 2.3 Add tests for `findSameDomainEdges` — two pages same domain, single page no edges, large group capped at 50

## 3. Graph Builder Tests

- [x] 3.1 Create `tests/graph-builder.test.js` with tests for page node creation from history entries
- [x] 3.2 Add tests for MENTIONS edge creation and entity merging (duplicate entities accumulate mentions)
- [x] 3.3 Add tests for ABOUT edges (topic extraction), LINKS_TO edges (navigation chains), TEMPORAL edges, and SAME_DOMAIN edges
- [x] 3.4 Add tests for RELATED_TO co-occurrence edges — threshold met creates edge, below threshold creates none
- [x] 3.5 Add tests for metadata updates (lastUpdated, lastProcessedTimestamp) and progress callback invocation

## 4. Graph Exporter Tests

- [x] 4.1 Create `tests/graph-exporter.test.js` with tests for `exportJsonLD` — valid JSON-LD structure, @context, formatVersion, nodes with @type, edges
- [x] 4.2 Add tests for date range filtering in `exportJsonLD` — pages filtered by startDate/endDate, edges filtered to matching pages
- [x] 4.3 Add tests for `exportRagChunks` — returns domain and topic chunks, totalChunks matches array length
- [x] 4.4 Add tests for `exportContextSummary` — markdown contains all section headings, empty DB produces valid output

## 5. Verification

- [x] 5.1 Run full test suite (`npm test`) and verify all new and existing tests pass
