## ADDED Requirements

### Requirement: Export graph as JSON-LD
The extension SHALL export the full knowledge graph in JSON-LD format, including all nodes (Page, Entity, Topic) and edges with their properties.

#### Scenario: Full graph export
- **WHEN** the user clicks "Export Graph"
- **THEN** the system generates a JSON-LD file containing all nodes and edges, downloadable as `history-graph-YYYY-MM-DD.jsonld`

#### Scenario: Filtered export by date range
- **WHEN** the user selects a date range and clicks "Export Graph"
- **THEN** the export includes only pages visited within that range and their connected entities/topics

### Requirement: Export RAG-ready chunks
The extension SHALL export text chunks with graph-enriched metadata in a JSON format optimized for RAG pipeline ingestion.

#### Scenario: RAG chunk export
- **WHEN** the user clicks "Export for RAG"
- **THEN** the system generates a JSON file where each chunk includes: chunk ID, text content, source URL, visit timestamps, connected entity names, connected topic names, and related chunk IDs

#### Scenario: Chunk size configuration
- **WHEN** the user configures max chunk size to 500 tokens before export
- **THEN** all exported chunks SHALL be at most 500 tokens, re-chunked if necessary

### Requirement: Export graph context summary
The extension SHALL generate a human-readable summary of the graph context, listing top entities, top topics, and key relationships — suitable as a system prompt or context preamble for RAG.

#### Scenario: Context summary generation
- **WHEN** the user clicks "Export Context Summary"
- **THEN** the system generates a markdown document listing: top 20 entities by mention count, top 20 topics by relevance score, and top 10 entity-entity relationships by co-occurrence weight

### Requirement: Clipboard export for quick use
The extension SHALL support copying the context summary or selected graph data to the clipboard for quick pasting into AI chat interfaces.

#### Scenario: Copy context to clipboard
- **WHEN** the user clicks "Copy Context" on the extension popup
- **THEN** the context summary is copied to the clipboard and a confirmation toast is shown

### Requirement: Export format versioning
The extension SHALL include a format version identifier in all exports to support future format evolution.

#### Scenario: Version included in export
- **WHEN** any export file is generated
- **THEN** the file SHALL include a `formatVersion` field (e.g., `"1.0.0"`) at the top level
