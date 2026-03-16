import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractTopics, entriesToDocuments } from '../src/lib/tfidf.js';

describe('extractTopics', () => {
  it('should extract topics from a corpus of titles and paths', () => {
    const documents = [
      { url: 'https://a.com', text: 'Machine learning models training datasets prediction' },
      { url: 'https://b.com', text: 'Graph databases relationships entities nodes edges' },
      { url: 'https://c.com', text: 'Machine learning graph databases knowledge graph construction' },
    ];

    const { topics, pageTopics } = extractTopics(documents);

    assert.ok(topics.length > 0);
    assert.ok(pageTopics.has('https://a.com'));
    assert.ok(pageTopics.has('https://b.com'));
  });

  it('should return higher scores for distinctive terms', () => {
    const documents = [
      { url: 'https://a.com', text: 'kubernetes container orchestration deployment cluster pod service' },
      { url: 'https://b.com', text: 'painting canvas art gallery exhibition museum curator contemporary' },
    ];

    const { pageTopics } = extractTopics(documents);
    const aTopics = pageTopics.get('https://a.com');
    const topicNames = aTopics.map(t => t.name);

    assert.ok(topicNames.includes('kubernetes') || topicNames.includes('container') || topicNames.includes('orchestration'));
  });

  it('should handle empty documents', () => {
    const { topics } = extractTopics([]);
    assert.deepStrictEqual(topics, []);
  });

  it('should assign topics per page', () => {
    const documents = [
      { url: 'https://a.com', text: 'react component rendering virtual dom hooks state management frontend' },
    ];

    const { pageTopics } = extractTopics(documents, 5);
    const aTopics = pageTopics.get('https://a.com');
    assert.ok(aTopics.length <= 5);
  });
});

describe('entriesToDocuments', () => {
  it('should convert history entries to TF-IDF documents', () => {
    const entries = [
      {
        url: 'https://github.com/user/project',
        title: 'Pull Request #123 - Fix authentication bug',
        pathSegments: ['user', 'project', 'pull', '123'],
      },
      {
        url: 'https://docs.python.org/3/tutorial',
        title: 'The Python Tutorial',
        pathSegments: ['3', 'tutorial'],
      },
    ];

    const docs = entriesToDocuments(entries);
    assert.strictEqual(docs.length, 2);
    assert.strictEqual(docs[0].url, 'https://github.com/user/project');
    assert.ok(docs[0].text.includes('Pull Request'));
    assert.ok(docs[0].text.includes('user'));
    assert.ok(docs[1].text.includes('Python Tutorial'));
  });

  it('should handle entries with missing title or pathSegments', () => {
    const entries = [
      { url: 'https://example.com', title: '', pathSegments: [] },
      { url: 'https://example.com/page', title: 'Some Page' },
    ];

    const docs = entriesToDocuments(entries);
    assert.strictEqual(docs.length, 2);
    assert.strictEqual(docs[0].text.trim(), '');
    assert.ok(docs[1].text.includes('Some Page'));
  });
});
