## ADDED Requirements

### Requirement: Read browser history entries
The extension SHALL read browsing history from ZEN Browser using the `browser.history.search` API, retrieving URL, title, visit count, last visit time, and typed count for each entry.

#### Scenario: Fetch all history within a date range
- **WHEN** the user triggers a history extraction with a start date and end date
- **THEN** the system retrieves all history entries within that date range, ordered by last visit time descending

#### Scenario: Fetch recent history with default range
- **WHEN** the user triggers history extraction without specifying a date range
- **THEN** the system retrieves history from the last 90 days

### Requirement: Retrieve detailed visit information
The extension SHALL retrieve individual visit timestamps for each history entry using `browser.history.getVisits`, capturing each visit's transition type (link, typed, reload, etc.) and timestamp.

#### Scenario: Multiple visits to same URL
- **WHEN** a URL has been visited 5 times over 3 days
- **THEN** the system records all 5 visit events with their individual timestamps and transition types

### Requirement: Normalize history entries
The extension SHALL normalize history entries into a consistent internal format containing: canonical URL (stripped of tracking parameters), domain, title, visit events array, first visit timestamp, and last visit timestamp.

#### Scenario: URL with tracking parameters
- **WHEN** a history entry has URL `https://example.com/article?utm_source=twitter&ref=123`
- **THEN** the normalized URL SHALL be `https://example.com/article` with tracking parameters (`utm_*`, `ref`, `fbclid`, etc.) removed

#### Scenario: Duplicate URLs after normalization
- **WHEN** two history entries normalize to the same canonical URL
- **THEN** the system SHALL merge them into a single entry, combining all visit events

### Requirement: Filter irrelevant history entries
The extension SHALL filter out non-content URLs including browser internal pages (`about:*`, `moz-extension:*`), data URIs, and localhost URLs by default.

#### Scenario: Browser internal pages excluded
- **WHEN** history contains entries for `about:preferences` and `moz-extension://...`
- **THEN** these entries SHALL NOT appear in the extracted history output

#### Scenario: User configurable filter
- **WHEN** the user adds `*.example.com` to the exclusion list
- **THEN** all history entries matching that domain SHALL be excluded from extraction

### Requirement: Batch processing with progress reporting
The extension SHALL process history extraction in configurable batches and report progress to the UI.

#### Scenario: Large history extraction
- **WHEN** the user has 10,000 history entries to process
- **THEN** the system processes them in batches of 500 and reports progress (e.g., "Processing 1,500 / 10,000") after each batch
