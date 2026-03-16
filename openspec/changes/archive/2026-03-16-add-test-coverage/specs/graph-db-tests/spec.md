## ADDED Requirements

### Requirement: MockDB implements GraphDB interface
The test suite SHALL include a MockDB class that implements the same interface as GraphDB for use in graph-builder and graph-exporter tests.

#### Scenario: MockDB supports all store operations
- **WHEN** MockDB is used in place of GraphDB
- **THEN** it supports `open()`, `put()`, `get()`, `getAll()`, `count()`, `delete()`, `clear()`, `putMeta()`, and `getMeta()` with equivalent behavior using in-memory Maps

#### Scenario: MockDB is reusable across test files
- **WHEN** multiple test files need a mock database
- **THEN** the MockDB is defined in a shared test helper (`tests/helpers/mock-db.js`) that can be imported
