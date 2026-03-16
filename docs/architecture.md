# Architecture

## Design Principles

1. **History metadata only** — No page fetching, no content scripts, no network requests. Works entirely from `browser.history` API data.
2. **Local-first** — All data stays on the user's machine in IndexedDB. Nothing is sent externally.
3. **Zero dependencies** — The bundled extension has no runtime dependencies. Only esbuild is used for building.
4. **Simple message passing** — Popup and visualizer communicate with the background script via `browser.runtime.sendMessage`.

## Extension Structure

```
src/
  manifest.json              # WebExtension manifest v2
  background/
    background.js            # Message router, extraction orchestrator
  popup/
    popup.html/js/css        # 380px popup UI (dashboard, settings, export)
  visualizer/
    visualizer.html/js/css   # Full-page graph visualization
  lib/
    graph-db.js              # IndexedDB wrapper (5 object stores)
    history-extractor.js     # browser.history API + URL parsing
    entity-extractor.js      # Rule-based NER from titles/URLs
    tfidf.js                 # TF-IDF topic extraction
    graph-builder.js         # 6-phase graph construction
    graph-exporter.js        # JSON-LD, RAG chunks, context summary
    text-chunker.js          # Domain/topic/time-window grouping
    url-utils.js             # URL normalization and filtering
```

## Data Flow

```
browser.history API
        |
        v
  HistoryExtractor
  - Fetch entries (date range, batch processing)
  - Get visit details (timestamps, transitions)
  - Normalize URLs (strip tracking params)
  - Filter (internal pages, exclusion patterns)
  - Parse URL structure (domain, path segments)
        |
        v
  GraphBuilder
  - Phase 1: Page nodes + entity extraction (EntityExtractor)
  - Phase 2: Topic extraction (TF-IDF over titles + paths)
  - Phase 3: LINKS_TO edges (navigation chains)
  - Phase 4: TEMPORAL edges (time proximity)
  - Phase 5: SAME_DOMAIN edges
  - Phase 6: RELATED_TO edges (co-occurrence)
        |
        v
  IndexedDB (GraphDB)
  - pages, entities, topics, edges, metadata
        |
        v
  GraphExporter / Visualizer
  - JSON-LD export
  - RAG chunk export
  - Context summary
  - Force-directed graph rendering
```

## IndexedDB Schema

Five object stores in database `zen-history-graph` (version 2):

### pages (key: `url`)

| Field | Type | Description |
|-------|------|-------------|
| url | string | Canonical URL (primary key) |
| domain | string | Hostname |
| title | string | Page title from history |
| pathSegments | string[] | URL path split by `/`, decoded |
| visitCount | number | Total visits |
| firstVisited | number | Earliest visit timestamp |
| lastVisited | number | Most recent visit timestamp |
| visitEvents | object[] | Individual visits with timestamp + transition |

Indexes: `domain`, `lastVisited`

### entities (key: `id`)

| Field | Type | Description |
|-------|------|-------------|
| id | string | `entity:<normalizedName>` |
| name | string | Display name |
| normalizedName | string | Lowercase key |
| type | string | `technology`, `person`, `organization`, `platform`, `concept` |
| mentions | number | Total occurrences across all pages |
| aliases | string[] | Name variations |

Indexes: `name`, `type`

### topics (key: `id`)

| Field | Type | Description |
|-------|------|-------------|
| id | string | `topic:<name>` |
| name | string | Topic keyword |
| score | number | Corpus-level TF-IDF score |

Indexes: `name`, `score`

### edges (key: `id`)

| Field | Type | Description |
|-------|------|-------------|
| id | string | `<type>:<source>::<target>` pattern |
| type | string | Edge type (MENTIONS, ABOUT, etc.) |
| source | string | Source node ID (URL or entity/topic ID) |
| target | string | Target node ID |
| weight | number | Edge weight (meaning varies by type) |

Indexes: `type`, `source`, `target`

### metadata (key: `key`)

Key-value store for extension state:
- `lastUpdated` — Timestamp of last graph build
- `lastProcessedTimestamp` — Most recent history entry processed

## Message Protocol

The background script handles these message types:

| Message | Direction | Description |
|---------|-----------|-------------|
| `START_EXTRACTION` | popup -> bg | Start history extraction + graph building |
| `GET_STATS` | popup -> bg | Get node/edge counts and date range |
| `GET_SETTINGS` | popup -> bg | Read saved settings |
| `SAVE_SETTINGS` | popup -> bg | Persist settings |
| `EXPORT_JSONLD` | popup -> bg | Generate JSON-LD export |
| `EXPORT_RAG_CHUNKS` | popup -> bg | Generate RAG chunk export |
| `EXPORT_CONTEXT_SUMMARY` | popup -> bg | Generate markdown summary |
| `GET_GRAPH_DATA` | visualizer -> bg | Get raw pages, entities, topics, edges |
| `OPEN_VISUALIZER` | popup -> bg | Open visualizer in a new tab |
| `PROGRESS_UPDATE` | bg -> popup | Real-time progress during extraction |

## Entity Extraction Strategy

Three extraction methods applied to each history entry:

1. **Domain entity lookup** — Map of 20+ well-known domains to named entities (github.com -> GitHub, stackoverflow.com -> Stack Overflow)
2. **Technology term matching** — Set of 50+ known technology terms matched against lowercase title + path segments
3. **Proper noun detection** — Regex for consecutive capitalized words, classified by:
   - Organization suffixes (Inc, Corp, Foundation, Labs)
   - Person patterns (two capitalized words, title prefixes)
   - Project names (GitHub/GitLab `owner/repo` URL patterns)

## Topic Extraction

TF-IDF (Term Frequency - Inverse Document Frequency) computed over:
- Page titles
- URL path segments (decoded, hyphen/underscore split)

Each page is treated as a "document". Stop words and URL noise words are filtered. Top 10 topics per page are stored as ABOUT edges.

## Graph Visualizer

Canvas-based force-directed layout with no external libraries:
- **Repulsion**: Nodes repel each other (inverse square law)
- **Attraction**: Connected nodes are pulled together (spring force)
- **Gravity**: All nodes drift toward center
- **Damping**: Velocities decay over time until the layout settles
- **Filtering**: Nodes ranked by connection count; max-nodes slider controls how many appear
- **Rendering**: 2D Canvas with camera transform (pan + zoom)

## Build Pipeline

esbuild bundles three entry points:
- `background.js` — ESM format (extension background)
- `popup.js` — IIFE format (popup page)
- `visualizer.js` — IIFE format (visualizer page)

Static files (HTML, CSS, manifest) are copied to `dist/`.
