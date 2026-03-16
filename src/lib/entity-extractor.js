/**
 * Rule-based entity extractor for history metadata.
 * Extracts entities from page titles and URL paths/domains.
 * No page body text needed — works purely from history metadata.
 */

// Known technology terms (extensible)
const TECH_TERMS = new Set([
  'javascript', 'typescript', 'python', 'rust', 'go', 'java', 'c++', 'c#',
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'node.js', 'deno', 'bun',
  'docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'neo4j',
  'graphql', 'rest', 'grpc', 'websocket',
  'git', 'github', 'gitlab', 'linux', 'macos', 'windows',
  'tensorflow', 'pytorch', 'openai', 'anthropic', 'llm', 'gpt', 'claude',
  'webassembly', 'wasm', 'css', 'html', 'sass', 'tailwind',
  'webpack', 'esbuild', 'vite', 'rollup',
  'nginx', 'apache', 'caddy',
]);

// Well-known domains that map to entities
const DOMAIN_ENTITIES = new Map([
  ['github.com', { name: 'GitHub', type: 'platform' }],
  ['gitlab.com', { name: 'GitLab', type: 'platform' }],
  ['stackoverflow.com', { name: 'Stack Overflow', type: 'platform' }],
  ['reddit.com', { name: 'Reddit', type: 'platform' }],
  ['twitter.com', { name: 'Twitter', type: 'platform' }],
  ['x.com', { name: 'Twitter', type: 'platform' }],
  ['youtube.com', { name: 'YouTube', type: 'platform' }],
  ['medium.com', { name: 'Medium', type: 'platform' }],
  ['dev.to', { name: 'DEV Community', type: 'platform' }],
  ['docs.google.com', { name: 'Google Docs', type: 'platform' }],
  ['drive.google.com', { name: 'Google Drive', type: 'platform' }],
  ['mail.google.com', { name: 'Gmail', type: 'platform' }],
  ['calendar.google.com', { name: 'Google Calendar', type: 'platform' }],
  ['notion.so', { name: 'Notion', type: 'platform' }],
  ['figma.com', { name: 'Figma', type: 'platform' }],
  ['amazon.com', { name: 'Amazon', type: 'organization' }],
  ['wikipedia.org', { name: 'Wikipedia', type: 'platform' }],
  ['en.wikipedia.org', { name: 'Wikipedia', type: 'platform' }],
  ['news.ycombinator.com', { name: 'Hacker News', type: 'platform' }],
  ['npmjs.com', { name: 'npm', type: 'platform' }],
  ['crates.io', { name: 'crates.io', type: 'platform' }],
  ['pypi.org', { name: 'PyPI', type: 'platform' }],
]);

// Patterns for capitalized proper nouns (potential people/orgs/places)
const PROPER_NOUN_RE = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;

// Patterns for org-like suffixes
const ORG_SUFFIXES = /\b(Inc|Corp|Ltd|LLC|Co|Foundation|Institute|University|Labs?)\b/i;

// Common first names (to help identify person entities)
const COMMON_TITLES = /^(Mr|Mrs|Ms|Dr|Prof|Sir|CEO|CTO|CFO)\s+/;

/**
 * Extract entities from a history entry's metadata (title + URL parts).
 *
 * @param {object} entry - History entry with { title, domain, pathSegments, url }
 * @returns {object[]} Array of { id, name, normalizedName, type, mentions, aliases }
 */
export function extractEntitiesFromEntry(entry) {
  if (!entry) return [];

  const entityMap = new Map();
  const title = entry.title || '';
  const domain = entry.domain || '';
  const pathSegments = entry.pathSegments || [];

  // Combine title and path segments into searchable text
  const combinedText = [title, ...pathSegments].join(' ');

  // 1. Extract known domain entities
  if (DOMAIN_ENTITIES.has(domain)) {
    const domainEntity = DOMAIN_ENTITIES.get(domain);
    addEntity(entityMap, domainEntity.name, domainEntity.type, 1);
  }

  // 2. Extract technology terms from title and path
  const lowerCombined = combinedText.toLowerCase();
  for (const tech of TECH_TERMS) {
    if (lowerCombined.includes(tech)) {
      addEntity(entityMap, tech, 'technology', countOccurrences(lowerCombined, tech));
    }
  }

  // 3. Extract proper nouns from title (potential people, orgs, places)
  if (title) {
    const properNouns = title.matchAll(PROPER_NOUN_RE);
    for (const match of properNouns) {
      let name = match[1].replace(/^(The|A|An)\s+/i, '');
      if (name.length < 4 || isCommonPhrase(name)) continue;

      let type = 'concept';
      if (ORG_SUFFIXES.test(name)) {
        type = 'organization';
      } else if (COMMON_TITLES.test(name)) {
        type = 'person';
      } else if (name.split(' ').length === 2) {
        type = 'person';
      }

      addEntity(entityMap, name, type, 1);
    }
  }

  // 4. Extract project/repo names from URL paths (e.g., github.com/owner/repo)
  if (domain === 'github.com' || domain === 'gitlab.com') {
    if (pathSegments.length >= 2) {
      const owner = pathSegments[0];
      const repo = pathSegments[1];
      if (owner && repo && !isReservedPathSegment(owner)) {
        addEntity(entityMap, repo, 'project', 1);
      }
    }
  }

  return Array.from(entityMap.values());
}

/**
 * Batch extract entities from multiple history entries.
 * Merges entities across all entries and accumulates mention counts.
 *
 * @param {object[]} entries - Array of history entries
 * @returns {object} { entities: object[], pageEntities: Map<url, object[]> }
 */
export function extractEntitiesBatch(entries) {
  const globalMap = new Map();
  const pageEntities = new Map();

  for (const entry of entries) {
    const entities = extractEntitiesFromEntry(entry);
    pageEntities.set(entry.url, entities);

    for (const entity of entities) {
      const key = entity.normalizedName;
      if (globalMap.has(key)) {
        const existing = globalMap.get(key);
        existing.mentions += entity.mentions;
        for (const alias of entity.aliases) {
          if (!existing.aliases.includes(alias)) {
            existing.aliases.push(alias);
          }
        }
      } else {
        globalMap.set(key, { ...entity });
      }
    }
  }

  return {
    entities: Array.from(globalMap.values()),
    pageEntities,
  };
}

// --- Legacy API for backward compatibility with tests ---

/**
 * Extract entities from text content (titles, path segments, etc.).
 * @param {string} text - The text to extract entities from
 * @returns {object[]} Array of { id, name, normalizedName, type, mentions, aliases }
 */
export function extractEntities(text) {
  if (!text) return [];

  const entityMap = new Map();

  // 1. Extract technology terms
  const lowerText = text.toLowerCase();
  for (const tech of TECH_TERMS) {
    if (lowerText.includes(tech)) {
      addEntity(entityMap, tech, 'technology', countOccurrences(lowerText, tech));
    }
  }

  // 2. Extract proper nouns (potential people, orgs, places)
  const properNouns = text.matchAll(PROPER_NOUN_RE);
  for (const match of properNouns) {
    let name = match[1].replace(/^(The|A|An)\s+/i, '');
    if (name.length < 4 || isCommonPhrase(name)) continue;

    let type = 'concept';
    if (ORG_SUFFIXES.test(name)) {
      type = 'organization';
    } else if (COMMON_TITLES.test(name)) {
      type = 'person';
    } else if (name.split(' ').length === 2) {
      type = 'person';
    }

    addEntity(entityMap, name, type, 1);
  }

  return Array.from(entityMap.values());
}

function addEntity(map, name, type, mentions) {
  const key = name.toLowerCase();
  if (map.has(key)) {
    const existing = map.get(key);
    existing.mentions += mentions;
    if (!existing.aliases.includes(name)) {
      existing.aliases.push(name);
    }
  } else {
    map.set(key, {
      id: `entity:${key}`,
      name,
      normalizedName: key,
      type,
      mentions,
      aliases: [name],
    });
  }
}

function countOccurrences(text, term) {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(term, pos)) !== -1) {
    count++;
    pos += term.length;
  }
  return count;
}

const COMMON_PHRASES = new Set([
  'the', 'this', 'that', 'these', 'those', 'here', 'there',
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'read more', 'click here', 'sign up', 'log in', 'learn more',
  'home page', 'next page', 'last updated',
]);

function isCommonPhrase(name) {
  return COMMON_PHRASES.has(name.toLowerCase());
}

const RESERVED_PATH_SEGMENTS = new Set([
  'issues', 'pulls', 'actions', 'settings', 'wiki', 'projects',
  'releases', 'packages', 'security', 'insights', 'discussions',
  'blob', 'tree', 'commit', 'commits', 'branches', 'tags',
  'search', 'explore', 'topics', 'trending', 'collections',
  'notifications', 'new', 'organizations', 'users', 'login', 'signup',
]);

function isReservedPathSegment(segment) {
  return RESERVED_PATH_SEGMENTS.has(segment.toLowerCase());
}
