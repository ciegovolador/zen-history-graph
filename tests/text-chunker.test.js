import { describe, it } from 'node:test';
import assert from 'node:assert';
import { chunkByDomain, chunkByTopic, chunkByTimeWindow } from '../src/lib/text-chunker.js';

describe('chunkByDomain', () => {
  it('should group entries by domain', () => {
    const entries = [
      { url: 'https://github.com/a', domain: 'github.com', title: 'Repo A', visitCount: 5, visitEvents: [{ timestamp: 1000 }] },
      { url: 'https://github.com/b', domain: 'github.com', title: 'Repo B', visitCount: 3, visitEvents: [{ timestamp: 2000 }] },
      { url: 'https://example.com/page', domain: 'example.com', title: 'Example', visitCount: 1, visitEvents: [{ timestamp: 3000 }] },
    ];

    const chunks = chunkByDomain(entries);
    assert.strictEqual(chunks.length, 2);

    const githubChunk = chunks.find(c => c.id === 'domain:github.com');
    assert.ok(githubChunk);
    assert.strictEqual(githubChunk.page_count, 2);
    assert.strictEqual(githubChunk.visit_count, 8);
    assert.ok(githubChunk.text.includes('github.com'));
    assert.ok(githubChunk.text.includes('Repo A'));
  });

  it('should include entities and topics when provided', () => {
    const entries = [
      { url: 'https://a.com/page', domain: 'a.com', title: 'Test', visitCount: 1, visitEvents: [] },
    ];
    const pageEntities = new Map([
      ['https://a.com/page', [{ name: 'React' }]],
    ]);
    const pageTopics = new Map([
      ['https://a.com/page', [{ name: 'frontend' }]],
    ]);

    const chunks = chunkByDomain(entries, pageEntities, pageTopics);
    assert.ok(chunks[0].entities.includes('React'));
    assert.ok(chunks[0].topics.includes('frontend'));
  });

  it('should handle empty entries', () => {
    const chunks = chunkByDomain([]);
    assert.deepStrictEqual(chunks, []);
  });

  it('should sort by visit count descending', () => {
    const entries = [
      { url: 'https://a.com/1', domain: 'a.com', title: 'A', visitCount: 2, visitEvents: [] },
      { url: 'https://b.com/1', domain: 'b.com', title: 'B', visitCount: 10, visitEvents: [] },
    ];
    const chunks = chunkByDomain(entries);
    assert.strictEqual(chunks[0].id, 'domain:b.com');
  });
});

describe('chunkByTopic', () => {
  it('should group entries by topic', () => {
    const entries = [
      { url: 'https://a.com', domain: 'a.com', title: 'React Guide', visitCount: 1 },
      { url: 'https://b.com', domain: 'b.com', title: 'Vue Guide', visitCount: 1 },
    ];
    const pageTopics = new Map([
      ['https://a.com', [{ name: 'frontend', score: 0.8 }, { name: 'react', score: 0.5 }]],
      ['https://b.com', [{ name: 'frontend', score: 0.7 }, { name: 'vue', score: 0.6 }]],
    ]);

    const chunks = chunkByTopic(entries, pageTopics);
    const frontendChunk = chunks.find(c => c.id === 'topic:frontend');
    assert.ok(frontendChunk);
    assert.strictEqual(frontendChunk.source_urls.length, 2);
    assert.ok(frontendChunk.text.includes('frontend'));
  });

  it('should handle empty topics', () => {
    const chunks = chunkByTopic([], new Map());
    assert.deepStrictEqual(chunks, []);
  });
});

describe('chunkByTimeWindow', () => {
  it('should group visits into time windows', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const entries = [
      { url: 'https://a.com', domain: 'a.com', title: 'Page A', visitEvents: [{ timestamp: now }], lastVisited: now },
      { url: 'https://b.com', domain: 'b.com', title: 'Page B', visitEvents: [{ timestamp: now + 1000 }], lastVisited: now + 1000 },
      { url: 'https://c.com', domain: 'c.com', title: 'Page C', visitEvents: [{ timestamp: now + DAY + 1000 }], lastVisited: now + DAY + 1000 },
    ];

    const chunks = chunkByTimeWindow(entries, DAY);
    assert.ok(chunks.length >= 2, `Expected at least 2 windows, got ${chunks.length}`);
  });

  it('should handle empty entries', () => {
    const chunks = chunkByTimeWindow([]);
    assert.deepStrictEqual(chunks, []);
  });

  it('should count visits correctly', () => {
    const now = Date.now();
    const entries = [
      { url: 'https://a.com', domain: 'a.com', title: 'A', visitEvents: [{ timestamp: now }, { timestamp: now + 100 }], lastVisited: now },
    ];
    const chunks = chunkByTimeWindow(entries, 24 * 60 * 60 * 1000);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].visit_count, 2);
  });
});
