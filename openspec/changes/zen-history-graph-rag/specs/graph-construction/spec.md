## ADDED Requirements

### Requirement: Create page nodes in the knowledge graph
The extension SHALL create a `Page` node for each unique normalized URL, containing: canonical URL, domain, title, extracted text summary (first 200 chars), visit count, first visit timestamp, last visit timestamp, and chunk IDs.

#### Scenario: New page node creation
- **WHEN** a history entry is processed for a URL not yet in the graph
- **THEN** a `Page` node is created with all available metadata and linked to its text chunks

#### Scenario: Existing page node update
- **WHEN** a history entry is processed for a URL already in the graph
- **THEN** the existing `Page` node is updated with new visit data (visit count incremented, timestamps updated)

### Requirement: Extract and create entity nodes
The extension SHALL extract named entities (people, organizations, places, technologies, concepts) from page content using pattern-based recognition and create `Entity` nodes in the graph.

#### Scenario: Entities extracted from article
- **WHEN** an article mentions "Google", "Sundar Pichai", and "Mountain View"
- **THEN** the system creates `Entity` nodes with types `organization`, `person`, and `place` respectively

#### Scenario: Entity deduplication
- **WHEN** "Google" and "Google Inc." are both extracted from different pages
- **THEN** the system SHALL merge them into a single `Entity` node with aliases

### Requirement: Extract and create topic nodes
The extension SHALL identify topics from page content using TF-IDF keyword extraction across the user's corpus and create `Topic` nodes with relevance scores.

#### Scenario: Topics extracted from page corpus
- **WHEN** the system has processed 50 pages about various subjects
- **THEN** the system identifies the top topics across the corpus (e.g., "machine-learning", "graph-databases") and creates `Topic` nodes with corpus-level TF-IDF scores

#### Scenario: Topic assigned to page
- **WHEN** a page's content yields high TF-IDF scores for "knowledge-graphs" and "semantic-web"
- **THEN** the system creates `ABOUT` edges from the `Page` node to those `Topic` nodes with relevance scores

### Requirement: Create relationship edges
The extension SHALL create edges between nodes to represent relationships: `MENTIONS` (page→entity), `ABOUT` (page→topic), `LINKS_TO` (page→page), `RELATED_TO` (entity↔entity and topic↔topic based on co-occurrence).

#### Scenario: Page mentions entities
- **WHEN** a page's content references entities "React" and "JavaScript"
- **THEN** `MENTIONS` edges are created from the `Page` node to both `Entity` nodes

#### Scenario: Co-occurring entities become related
- **WHEN** "React" and "JavaScript" co-occur on 5 or more pages
- **THEN** a `RELATED_TO` edge is created between the two `Entity` nodes with a co-occurrence weight

#### Scenario: Hyperlink between two visited pages
- **WHEN** page A contains a hyperlink to page B, and both are in the history
- **THEN** a `LINKS_TO` edge is created from page A's node to page B's node

### Requirement: Incremental graph updates
The extension SHALL support incremental updates — processing only new or changed history entries without rebuilding the entire graph.

#### Scenario: Incremental processing after initial build
- **WHEN** the graph was built from history up to March 10, and the user runs an update on March 15
- **THEN** the system only processes history entries from March 10 onward and merges new nodes/edges into the existing graph

### Requirement: Graph statistics
The extension SHALL maintain and expose graph statistics: total node count by type, total edge count by type, date range covered, and last update timestamp.

#### Scenario: Viewing graph stats
- **WHEN** the user views the extension dashboard
- **THEN** the system displays: "1,234 pages, 567 entities, 89 topics, 3,456 relationships. Covering Mar 1 - Mar 15, 2026. Last updated: 5 min ago"
