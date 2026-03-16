## ADDED Requirements

### Requirement: buildNavigationChains detects link transitions
The test suite SHALL verify that `buildNavigationChains()` identifies navigation edges from consecutive link-transition visits.

#### Scenario: Two consecutive link visits within 30s
- **WHEN** two visit events are within 30 seconds and the second has transition "link"
- **THEN** a chain edge is returned with source and target URLs

#### Scenario: Same URL consecutive visits ignored
- **WHEN** two consecutive visits are to the same URL with transition "link"
- **THEN** no chain edge is created

#### Scenario: Gap exceeds 30 seconds
- **WHEN** two link-transition visits are more than 30 seconds apart
- **THEN** no chain edge is created

#### Scenario: Non-link transition ignored
- **WHEN** the second visit has transition "typed" or "auto_bookmark"
- **THEN** no chain edge is created

### Requirement: findTemporalEdges detects time-proximate visits
The test suite SHALL verify that `findTemporalEdges()` groups visits within the time window.

#### Scenario: Visits within default 10-minute window
- **WHEN** two different URLs are visited within 10 minutes
- **THEN** a temporal edge exists between them

#### Scenario: Visits outside window are excluded
- **WHEN** two visits are more than windowMs apart
- **THEN** no temporal edge is created

#### Scenario: Custom window size
- **WHEN** `findTemporalEdges()` is called with a 1-minute window
- **THEN** only visits within 1 minute are linked

#### Scenario: Duplicate pairs are deduplicated
- **WHEN** the same pair of URLs appear in multiple temporal windows
- **THEN** only one edge exists for that pair

### Requirement: findSameDomainEdges groups by domain
The test suite SHALL verify that `findSameDomainEdges()` creates edges between pages on the same domain.

#### Scenario: Two pages on same domain
- **WHEN** two entries share domain "example.com"
- **THEN** one SAME_DOMAIN edge exists with domain="example.com"

#### Scenario: Single page on domain creates no edges
- **WHEN** only one entry exists for a domain
- **THEN** no edges are created for that domain

#### Scenario: Large domain group is capped at 50 URLs
- **WHEN** a domain has more than 50 URLs
- **THEN** edges are generated only for the first 50 URLs
