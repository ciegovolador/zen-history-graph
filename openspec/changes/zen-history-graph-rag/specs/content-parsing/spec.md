## ADDED Requirements

### Requirement: Extract page content from visited URLs
The extension SHALL fetch and extract the main textual content from visited URLs using a content script injected into the page, powered by Readability.js.

#### Scenario: Standard article page
- **WHEN** a visited URL points to a standard article page with body text
- **THEN** the system extracts the article title, author (if available), published date (if available), and clean body text with HTML stripped

#### Scenario: Page no longer accessible
- **WHEN** a visited URL returns a 404 or network error during content fetch
- **THEN** the system records the failure, retains the URL and title from history, and marks the entry as `extraction_failed`

### Requirement: Extract metadata from pages
The extension SHALL extract structured metadata from page HTML including Open Graph tags, meta description, canonical URL, and JSON-LD structured data if present.

#### Scenario: Page with Open Graph metadata
- **WHEN** a page contains `og:title`, `og:description`, and `og:image` meta tags
- **THEN** the system captures these as structured metadata fields on the page node

#### Scenario: Page with JSON-LD structured data
- **WHEN** a page contains `<script type="application/ld+json">` with Article schema
- **THEN** the system extracts author, datePublished, and keywords from the structured data

### Requirement: Handle content extraction rate limiting
The extension SHALL limit concurrent content fetches and respect a configurable delay between requests to avoid overloading servers or triggering rate limits.

#### Scenario: Concurrent fetch limit
- **WHEN** the system has 100 URLs queued for content extraction
- **THEN** the system SHALL process no more than 3 URLs concurrently with at least 500ms delay between starting new fetches

### Requirement: Text chunking for long content
The extension SHALL split extracted text content into chunks of configurable maximum size (default 1000 tokens), preserving paragraph boundaries where possible.

#### Scenario: Long article split into chunks
- **WHEN** an article's extracted text is 3,500 tokens long
- **THEN** the system produces 4 chunks, each under 1,000 tokens, split at paragraph boundaries

#### Scenario: Short page stays as single chunk
- **WHEN** a page's extracted text is 200 tokens
- **THEN** the system produces a single chunk containing all the text

### Requirement: Cache extracted content
The extension SHALL cache extracted page content in IndexedDB to avoid re-fetching URLs that have already been processed.

#### Scenario: Previously extracted URL
- **WHEN** a URL was already extracted and cached, and the user runs extraction again
- **THEN** the system SHALL use the cached content instead of re-fetching

#### Scenario: Force re-extraction
- **WHEN** the user explicitly requests re-extraction for a URL
- **THEN** the system SHALL fetch the content again and update the cache
