import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockDB } from './helpers/mock-db.js';
import { GraphExporter } from '../src/lib/graph-exporter.js';

// Helper to populate a MockDB with test data
async function populateDB(db) {
  await db.put('pages', {
    url: 'https://a.com',
    domain: 'a.com',
    title: 'Page A',
    visitCount: 10,
    firstVisited: new Date('2025-01-01').getTime(),
    lastVisited: new Date('2025-01-15').getTime(),
  });
  await db.put('pages', {
    url: 'https://b.com',
    domain: 'b.com',
    title: 'Page B',
    visitCount: 5,
    firstVisited: new Date('2025-02-01').getTime(),
    lastVisited: new Date('2025-02-15').getTime(),
  });
  await db.put('pages', {
    url: 'https://a.com/other',
    domain: 'a.com',
    title: 'Page A Other',
    visitCount: 3,
    firstVisited: new Date('2025-03-01').getTime(),
    lastVisited: new Date('2025-03-15').getTime(),
  });

  await db.put('entities', { id: 'entity:javascript', name: 'JavaScript', type: 'technology', mentions: 10, aliases: [] });
  await db.put('entities', { id: 'entity:react', name: 'React', type: 'technology', mentions: 5, aliases: [] });

  await db.put('topics', { id: 'topic:programming', name: 'programming', score: 0.8 });
  await db.put('topics', { id: 'topic:webdev', name: 'webdev', score: 0.6 });

  await db.put('edges', { id: 'mentions:a:js', type: 'MENTIONS', source: 'https://a.com', target: 'entity:javascript', weight: 3 });
  await db.put('edges', { id: 'mentions:b:js', type: 'MENTIONS', source: 'https://b.com', target: 'entity:javascript', weight: 2 });
  await db.put('edges', { id: 'about:a:prog', type: 'ABOUT', source: 'https://a.com', target: 'topic:programming', weight: 0.8 });
  await db.put('edges', { id: 'about:b:prog', type: 'ABOUT', source: 'https://b.com', target: 'topic:programming', weight: 0.5 });
  await db.put('edges', { id: 'related:js:react', type: 'RELATED_TO', source: 'entity:javascript', target: 'entity:react', weight: 7 });
  await db.put('edges', { id: 'domain:a:aother', type: 'SAME_DOMAIN', source: 'https://a.com', target: 'https://a.com/other', domain: 'a.com' });
}

// --- exportJsonLD ---

describe('GraphExporter - exportJsonLD', () => {
  it('returns valid JSON-LD structure', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportJsonLD();

    assert.ok(result['@context']);
    assert.equal(result['@context']['@vocab'], 'https://schema.org/');
    assert.equal(result.formatVersion, '2.0.0');
    assert.ok(result.exportedAt);
    assert.ok(Array.isArray(result.nodes));
    assert.ok(Array.isArray(result.edges));
  });

  it('includes nodes with correct @type', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportJsonLD();

    const pageNodes = result.nodes.filter(n => n['@type'] === 'Page');
    const entityNodes = result.nodes.filter(n => n['@type'] === 'Entity');
    const topicNodes = result.nodes.filter(n => n['@type'] === 'Topic');

    assert.equal(pageNodes.length, 3);
    assert.equal(entityNodes.length, 2);
    assert.equal(topicNodes.length, 2);
  });

  it('includes edges with type and weight', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportJsonLD();

    assert.ok(result.edges.length > 0);
    assert.ok(result.edges.every(e => e['@type']));
    assert.ok(result.edges.every(e => e.source && e.target));
  });

  it('returns all data when no date filter', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportJsonLD();

    const pageNodes = result.nodes.filter(n => n['@type'] === 'Page');
    assert.equal(pageNodes.length, 3);
  });
});

// --- exportJsonLD date filtering ---

describe('GraphExporter - exportJsonLD date filtering', () => {
  it('filters pages by startDate', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportJsonLD({
      startDate: '2025-02-01',
    });

    const pageNodes = result.nodes.filter(n => n['@type'] === 'Page');
    // Only pages with lastVisited >= Feb 1 — pages B and A-Other
    assert.equal(pageNodes.length, 2);
  });

  it('filters pages by endDate', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportJsonLD({
      endDate: '2025-01-31',
    });

    const pageNodes = result.nodes.filter(n => n['@type'] === 'Page');
    // Only pages with firstVisited <= Jan 31 — page A
    assert.equal(pageNodes.length, 1);
    assert.equal(pageNodes[0].url, 'https://a.com');
  });

  it('filters edges to matching pages', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportJsonLD({
      startDate: '2025-02-01',
      endDate: '2025-02-28',
    });

    const pageNodes = result.nodes.filter(n => n['@type'] === 'Page');
    const pageUrls = new Set(pageNodes.map(p => p.url));

    // Edges should only reference included pages
    for (const edge of result.edges) {
      assert.ok(
        pageUrls.has(edge.source) || pageUrls.has(edge.target),
        `Edge ${edge.source} -> ${edge.target} should reference a filtered page`
      );
    }
  });
});

// --- exportRagChunks ---

describe('GraphExporter - exportRagChunks', () => {
  it('returns chunks with correct structure', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportRagChunks();

    assert.equal(result.formatVersion, '2.0.0');
    assert.ok(result.exportedAt);
    assert.ok(Array.isArray(result.chunks));
    assert.equal(result.totalChunks, result.chunks.length);
  });

  it('produces both domain and topic chunks', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportRagChunks();

    // Should have at least some chunks (domain-grouped + topic-grouped)
    assert.ok(result.chunks.length > 0, 'Should produce chunks');
  });
});

// --- exportContextSummary ---

describe('GraphExporter - exportContextSummary', () => {
  it('returns markdown with all section headings', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportContextSummary();

    assert.equal(result.formatVersion, '2.0.0');
    assert.ok(result.markdown.includes('# Browsing Context Summary'));
    assert.ok(result.markdown.includes('## Top Domains'));
    assert.ok(result.markdown.includes('## Top Entities'));
    assert.ok(result.markdown.includes('## Top Topics'));
    assert.ok(result.markdown.includes('## Key Relationships'));
    assert.ok(result.markdown.includes('## Graph Structure'));
  });

  it('includes entity and domain data in markdown', async () => {
    const db = new MockDB();
    await populateDB(db);
    const exporter = new GraphExporter(db);

    const result = await exporter.exportContextSummary();

    assert.ok(result.markdown.includes('JavaScript'));
    assert.ok(result.markdown.includes('a.com'));
    assert.ok(result.markdown.includes('programming'));
  });

  it('handles empty DB without errors', async () => {
    const db = new MockDB();
    const exporter = new GraphExporter(db);

    const result = await exporter.exportContextSummary();

    assert.equal(result.formatVersion, '2.0.0');
    assert.ok(result.markdown.includes('# Browsing Context Summary'));
    assert.ok(result.markdown.includes('0 pages indexed'));
  });
});
