## ADDED Requirements

### Requirement: exportJsonLD returns valid JSON-LD structure
The test suite SHALL verify that `exportJsonLD()` returns a well-formed JSON-LD object.

#### Scenario: Full export without filters
- **WHEN** `exportJsonLD()` is called with no options on a populated DB
- **THEN** the result contains `@context` with the zen ontology vocabulary, `formatVersion` of '2.0.0', `exportedAt` as an ISO timestamp, `nodes` array with @type Page/Entity/Topic, and `edges` array

### Requirement: exportJsonLD supports date range filtering
The test suite SHALL verify that startDate and endDate options filter pages and edges.

#### Scenario: Date range filters pages
- **WHEN** `exportJsonLD({ startDate, endDate })` is called
- **THEN** only pages with `lastVisited >= start` and `firstVisited <= end` are included, and edges are filtered to only reference included pages

#### Scenario: No date filter returns all
- **WHEN** `exportJsonLD()` is called without date options
- **THEN** all pages and edges are returned

### Requirement: exportRagChunks returns domain and topic chunks
The test suite SHALL verify that `exportRagChunks()` produces both domain-grouped and topic-grouped chunks.

#### Scenario: Chunks produced from populated DB
- **WHEN** `exportRagChunks()` is called on a DB with pages, MENTIONS, and ABOUT edges
- **THEN** the result contains `chunks` array with both domain and topic chunks, `totalChunks` matching the array length, and `formatVersion` '2.0.0'

### Requirement: exportContextSummary returns markdown summary
The test suite SHALL verify that `exportContextSummary()` produces a markdown string with all expected sections.

#### Scenario: Summary contains all sections
- **WHEN** `exportContextSummary()` is called on a populated DB
- **THEN** the markdown includes headings for Top Domains, Top Entities, Top Topics, Key Relationships, and Graph Structure

#### Scenario: Empty DB produces minimal summary
- **WHEN** `exportContextSummary()` is called on an empty DB
- **THEN** the result still has valid formatVersion and markdown structure without errors
