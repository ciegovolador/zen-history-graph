import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNavigationChains,
  findTemporalEdges,
  findSameDomainEdges,
} from '../src/lib/history-extractor.js';

// Helper to build a historyMap from a simple array of entries
function makeHistoryMap(entries) {
  const map = new Map();
  for (const e of entries) {
    map.set(e.url, e);
  }
  return map;
}

// --- buildNavigationChains ---

describe('buildNavigationChains', () => {
  it('detects link transition within 30 seconds', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000, transition: 'typed' }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 2000, transition: 'link' }],
      },
    ]);

    const chains = buildNavigationChains(map);
    assert.equal(chains.length, 1);
    assert.equal(chains[0].source, 'https://a.com');
    assert.equal(chains[0].target, 'https://b.com');
  });

  it('ignores same-URL consecutive visits', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [
          { timestamp: 1000, transition: 'typed' },
          { timestamp: 2000, transition: 'link' },
        ],
      },
    ]);

    const chains = buildNavigationChains(map);
    assert.equal(chains.length, 0);
  });

  it('ignores gap exceeding 30 seconds', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000, transition: 'typed' }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 50000, transition: 'link' }],
      },
    ]);

    const chains = buildNavigationChains(map);
    assert.equal(chains.length, 0);
  });

  it('ignores non-link transitions', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000, transition: 'typed' }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 2000, transition: 'typed' }],
      },
    ]);

    const chains = buildNavigationChains(map);
    assert.equal(chains.length, 0);
  });

  it('detects multiple chains in sequence', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000, transition: 'typed' }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 2000, transition: 'link' }],
      },
      {
        url: 'https://c.com',
        domain: 'c.com',
        visitEvents: [{ timestamp: 3000, transition: 'link' }],
      },
    ]);

    const chains = buildNavigationChains(map);
    assert.equal(chains.length, 2);
    assert.equal(chains[0].target, 'https://b.com');
    assert.equal(chains[1].target, 'https://c.com');
  });
});

// --- findTemporalEdges ---

describe('findTemporalEdges', () => {
  it('links visits within default 10-minute window', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000 }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 300000 }], // 5 minutes later
      },
    ]);

    const edges = findTemporalEdges(map);
    assert.equal(edges.length, 1);
  });

  it('excludes visits outside the window', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000 }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 700000 }], // ~11.6 minutes later
      },
    ]);

    const edges = findTemporalEdges(map);
    assert.equal(edges.length, 0);
  });

  it('supports custom window size', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000 }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 50000 }], // 49 seconds later
      },
    ]);

    // 1-minute window — should include
    const edges1 = findTemporalEdges(map, 60000);
    assert.equal(edges1.length, 1);

    // 10-second window — should exclude
    const edges2 = findTemporalEdges(map, 10000);
    assert.equal(edges2.length, 0);
  });

  it('deduplicates pairs', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000 }, { timestamp: 5000 }],
      },
      {
        url: 'https://b.com',
        domain: 'b.com',
        visitEvents: [{ timestamp: 2000 }, { timestamp: 6000 }],
      },
    ]);

    const edges = findTemporalEdges(map);
    // Multiple overlapping visits but should produce only 1 edge
    assert.equal(edges.length, 1);
  });

  it('skips same-URL pairs', () => {
    const map = makeHistoryMap([
      {
        url: 'https://a.com',
        domain: 'a.com',
        visitEvents: [{ timestamp: 1000 }, { timestamp: 2000 }],
      },
    ]);

    const edges = findTemporalEdges(map);
    assert.equal(edges.length, 0);
  });
});

// --- findSameDomainEdges ---

describe('findSameDomainEdges', () => {
  it('creates edge between two pages on same domain', () => {
    const map = makeHistoryMap([
      { url: 'https://example.com/a', domain: 'example.com', visitEvents: [] },
      { url: 'https://example.com/b', domain: 'example.com', visitEvents: [] },
    ]);

    const edges = findSameDomainEdges(map);
    assert.equal(edges.length, 1);
    assert.equal(edges[0].domain, 'example.com');
  });

  it('creates no edges for single page on domain', () => {
    const map = makeHistoryMap([
      { url: 'https://a.com/page', domain: 'a.com', visitEvents: [] },
      { url: 'https://b.com/page', domain: 'b.com', visitEvents: [] },
    ]);

    const edges = findSameDomainEdges(map);
    assert.equal(edges.length, 0);
  });

  it('caps pairs at 50 URLs per domain', () => {
    const entries = [];
    for (let i = 0; i < 60; i++) {
      entries.push({
        url: `https://big.com/page${i}`,
        domain: 'big.com',
        visitEvents: [],
      });
    }
    const map = makeHistoryMap(entries);

    const edges = findSameDomainEdges(map);
    // 50 choose 2 = 1225
    assert.equal(edges.length, (50 * 49) / 2);
  });

  it('handles multiple domains independently', () => {
    const map = makeHistoryMap([
      { url: 'https://a.com/1', domain: 'a.com', visitEvents: [] },
      { url: 'https://a.com/2', domain: 'a.com', visitEvents: [] },
      { url: 'https://b.com/1', domain: 'b.com', visitEvents: [] },
      { url: 'https://b.com/2', domain: 'b.com', visitEvents: [] },
    ]);

    const edges = findSameDomainEdges(map);
    assert.equal(edges.length, 2);
    const domains = edges.map(e => e.domain).sort();
    assert.deepEqual(domains, ['a.com', 'b.com']);
  });
});
