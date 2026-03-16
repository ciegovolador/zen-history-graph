## ADDED Requirements

### Requirement: GraphBuilder creates page nodes from history entries
The test suite SHALL verify that `GraphBuilder.build()` creates page nodes in the database for each history entry.

#### Scenario: Page nodes stored correctly
- **WHEN** `build()` is called with a historyMap containing 3 entries
- **THEN** the mock DB contains 3 page records with correct url, domain, title, visitCount, firstVisited, and lastVisited fields

### Requirement: GraphBuilder creates MENTIONS edges for entities
The test suite SHALL verify that entity extraction produces MENTIONS edges linking pages to their entities.

#### Scenario: Entities linked to pages
- **WHEN** `build()` is called with entries whose titles contain recognizable entities
- **THEN** MENTIONS edges exist connecting each page URL to the extracted entity IDs

#### Scenario: Duplicate entities are merged
- **WHEN** two pages mention the same entity
- **THEN** the entity record has accumulated mention counts and merged aliases

### Requirement: GraphBuilder creates ABOUT edges for topics
The test suite SHALL verify that TF-IDF topic extraction produces ABOUT edges.

#### Scenario: Topics linked to pages
- **WHEN** `build()` is called with entries that produce topics via TF-IDF
- **THEN** ABOUT edges exist with source=page URL and target=topic:name

### Requirement: GraphBuilder creates LINKS_TO edges from navigation chains
The test suite SHALL verify that navigation chain detection produces LINKS_TO edges.

#### Scenario: Link transition creates edge
- **WHEN** entries have consecutive visit events with transition "link" within 30 seconds
- **THEN** a LINKS_TO edge is created between the source and target pages

### Requirement: GraphBuilder creates TEMPORAL edges
The test suite SHALL verify that temporal proximity detection produces TEMPORAL edges.

#### Scenario: Pages visited within time window are linked
- **WHEN** two pages have visits within the configured temporal window
- **THEN** a TEMPORAL edge exists between them

### Requirement: GraphBuilder creates SAME_DOMAIN edges
The test suite SHALL verify that same-domain grouping produces SAME_DOMAIN edges.

#### Scenario: Pages on same domain are linked
- **WHEN** multiple pages share the same domain
- **THEN** SAME_DOMAIN edges exist between them with the domain field set

### Requirement: GraphBuilder creates RELATED_TO edges from co-occurrence
The test suite SHALL verify that entity co-occurrence above the threshold produces RELATED_TO edges.

#### Scenario: Co-occurrence threshold met
- **WHEN** two entities appear together on at least `coOccurrenceThreshold` pages
- **THEN** a RELATED_TO edge exists between them with the correct weight

#### Scenario: Co-occurrence below threshold
- **WHEN** two entities appear together on fewer pages than the threshold
- **THEN** no RELATED_TO edge is created

### Requirement: GraphBuilder updates metadata after build
The test suite SHALL verify that `lastUpdated` and `lastProcessedTimestamp` metadata are set after a successful build.

#### Scenario: Metadata updated
- **WHEN** `build()` completes
- **THEN** `lastUpdated` is set to approximately the current time and `lastProcessedTimestamp` equals the max lastVisited of all entries

### Requirement: GraphBuilder reports progress
The test suite SHALL verify that the `onProgress` callback is invoked with phase information during build.

#### Scenario: Progress callback called for each phase
- **WHEN** `build()` is called with an `onProgress` function
- **THEN** the callback is invoked with objects containing `phase`, `current`, and `total` for each build phase
