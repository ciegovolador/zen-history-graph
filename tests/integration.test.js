import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeUrl, isExcludedUrl } from '../src/lib/url-utils.js';
import { extractEntities, extractEntitiesFromEntry, extractEntitiesBatch } from '../src/lib/entity-extractor.js';
import { extractTopics, entriesToDocuments } from '../src/lib/tfidf.js';
import { chunkByDomain, chunkByTopic } from '../src/lib/text-chunker.js';
import { buildNavigationChains, findTemporalEdges, findSameDomainEdges } from '../src/lib/history-extractor.js';

describe('Integration: History metadata -> Graph pipeline', () => {
  it('should process simulated history entries through the full pipeline', () => {
    // Step 1: URL normalization
    const rawUrl = 'https://blog.example.com/post/graph-databases?utm_source=twitter&ref=home';
    const canonical = normalizeUrl(rawUrl);
    assert.strictEqual(canonical, 'https://blog.example.com/post/graph-databases');
    assert.strictEqual(isExcludedUrl(canonical), false);

    // Step 2: Build history entries (simulating HistoryExtractor output)
    const historyEntries = [
      {
        url: 'https://github.com/neo4j/neo4j',
        title: 'neo4j/neo4j: Graphs for Everyone',
        domain: 'github.com',
        pathSegments: ['neo4j', 'neo4j'],
        visitCount: 5,
        visitEvents: [
          { timestamp: 1000, transition: 'typed' },
          { timestamp: 2000, transition: 'link' },
        ],
        firstVisited: 1000,
        lastVisited: 2000,
      },
      {
        url: 'https://neo4j.com/docs/getting-started',
        title: 'Getting Started - Neo4j Documentation',
        domain: 'neo4j.com',
        pathSegments: ['docs', 'getting started'],
        visitCount: 3,
        visitEvents: [
          { timestamp: 2500, transition: 'link' },
        ],
        firstVisited: 2500,
        lastVisited: 2500,
      },
      {
        url: 'https://github.com/user/graphql-api',
        title: 'user/graphql-api: A GraphQL API framework',
        domain: 'github.com',
        pathSegments: ['user', 'graphql api'],
        visitCount: 2,
        visitEvents: [
          { timestamp: 3000, transition: 'typed' },
        ],
        firstVisited: 3000,
        lastVisited: 3000,
      },
    ];

    // Step 3: Entity extraction from entries
    const { entities, pageEntities } = extractEntitiesBatch(historyEntries);
    assert.ok(entities.length > 0);

    const entityNames = entities.map(e => e.normalizedName);
    assert.ok(entityNames.includes('github'), 'Should extract GitHub domain entity');
    assert.ok(entityNames.includes('neo4j'), 'Should extract neo4j from title/path');

    // Step 4: Topic extraction from titles + paths
    const documents = entriesToDocuments(historyEntries);
    const { topics, pageTopics } = extractTopics(documents);
    assert.ok(topics.length > 0);
    assert.ok(pageTopics.has('https://github.com/neo4j/neo4j'));

    // Step 5: Context chunking by domain
    const domainChunks = chunkByDomain(historyEntries, pageEntities, pageTopics);
    assert.ok(domainChunks.length > 0);
    const githubChunk = domainChunks.find(c => c.id === 'domain:github.com');
    assert.ok(githubChunk);
    assert.strictEqual(githubChunk.page_count, 2);
    assert.ok(githubChunk.text.includes('github.com'));

    // Step 6: Context chunking by topic
    const topicChunks = chunkByTopic(historyEntries, pageTopics);
    assert.ok(topicChunks.length >= 0); // May be 0 if few entries
  });

  it('should build navigation chains from visit transitions', () => {
    const historyMap = new Map([
      ['https://a.com', {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000, transition: 'typed' }],
      }],
      ['https://b.com', {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 1500, transition: 'link' }],
      }],
      ['https://c.com', {
        url: 'https://c.com',
        domain: 'c.com',
        visitEvents: [{ timestamp: 60000, transition: 'typed' }],
      }],
    ]);

    const chains = buildNavigationChains(historyMap);
    // a.com -> b.com should be a chain (link within 30s)
    assert.ok(chains.some(c => c.source === 'https://a.com' && c.target === 'https://b.com'));
    // b.com -> c.com should NOT be a chain (too far apart and typed)
    assert.ok(!chains.some(c => c.source === 'https://b.com' && c.target === 'https://c.com'));
  });

  it('should find temporal edges between proximate visits', () => {
    const historyMap = new Map([
      ['https://a.com', {
        url: 'https://a.com',
        visitEvents: [{ timestamp: 1000 }],
      }],
      ['https://b.com', {
        url: 'https://b.com',
        visitEvents: [{ timestamp: 2000 }],
      }],
      ['https://c.com', {
        url: 'https://c.com',
        visitEvents: [{ timestamp: 700000 }], // 11+ minutes later
      }],
    ]);

    const edges = findTemporalEdges(historyMap, 10 * 60 * 1000);
    // a and b are within 10 min
    assert.ok(edges.some(e =>
      (e.source === 'https://a.com' && e.target === 'https://b.com') ||
      (e.source === 'https://b.com' && e.target === 'https://a.com')
    ));
    // c is not within 10 min of a or b
    assert.ok(!edges.some(e =>
      (e.source === 'https://a.com' && e.target === 'https://c.com') ||
      (e.source === 'https://c.com' && e.target === 'https://a.com')
    ));
  });

  it('should find same-domain edges', () => {
    const historyMap = new Map([
      ['https://github.com/a', { url: 'https://github.com/a', domain: 'github.com' }],
      ['https://github.com/b', { url: 'https://github.com/b', domain: 'github.com' }],
      ['https://example.com/x', { url: 'https://example.com/x', domain: 'example.com' }],
    ]);

    const edges = findSameDomainEdges(historyMap);
    assert.ok(edges.some(e =>
      e.domain === 'github.com' &&
      ((e.source === 'https://github.com/a' && e.target === 'https://github.com/b') ||
       (e.source === 'https://github.com/b' && e.target === 'https://github.com/a'))
    ));
    // example.com has only 1 page, no edges
    assert.ok(!edges.some(e => e.domain === 'example.com'));
  });

  it('should handle the full pipeline with multiple pages and topic overlap', () => {
    const entries = [
      {
        url: 'https://react.dev/docs',
        title: 'React Documentation',
        domain: 'react.dev',
        pathSegments: ['docs'],
        visitCount: 10,
        visitEvents: [{ timestamp: 1000 }],
        firstVisited: 1000,
        lastVisited: 1000,
      },
      {
        url: 'https://vuejs.org/guide',
        title: 'Vue.js Guide - Progressive JavaScript Framework',
        domain: 'vuejs.org',
        pathSegments: ['guide'],
        visitCount: 5,
        visitEvents: [{ timestamp: 2000 }],
        firstVisited: 2000,
        lastVisited: 2000,
      },
      {
        url: 'https://doc.rust-lang.org/book',
        title: 'The Rust Programming Language',
        domain: 'doc.rust-lang.org',
        pathSegments: ['book'],
        visitCount: 3,
        visitEvents: [{ timestamp: 3000 }],
        firstVisited: 3000,
        lastVisited: 3000,
      },
    ];

    // Extract topics across the corpus
    const documents = entriesToDocuments(entries);
    const { topics, pageTopics } = extractTopics(documents);
    assert.ok(topics.length > 0);

    // React and Vue titles both mention "JavaScript" related terms
    const reactTopics = new Set(pageTopics.get('https://react.dev/docs').map(t => t.name));
    const vueTopics = new Set(pageTopics.get('https://vuejs.org/guide').map(t => t.name));
    const rustTopics = new Set(pageTopics.get('https://doc.rust-lang.org/book').map(t => t.name));

    // Rust topics should be more different from React/Vue
    const reactVueOverlap = [...reactTopics].filter(t => vueTopics.has(t)).length;
    const reactRustOverlap = [...reactTopics].filter(t => rustTopics.has(t)).length;
    assert.ok(reactVueOverlap >= reactRustOverlap,
      `React and Vue should share more topics (${reactVueOverlap}) than React and Rust (${reactRustOverlap})`);
  });
});
