import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeUrl, isExcludedUrl, matchesPattern } from '../src/lib/url-utils.js';

describe('normalizeUrl', () => {
  it('should strip utm_ tracking parameters', () => {
    const result = normalizeUrl('https://example.com/article?utm_source=twitter&utm_medium=social');
    assert.strictEqual(result, 'https://example.com/article');
  });

  it('should strip fbclid parameter', () => {
    const result = normalizeUrl('https://example.com/page?fbclid=abc123&valid=1');
    assert.strictEqual(result, 'https://example.com/page?valid=1');
  });

  it('should strip ref parameter', () => {
    const result = normalizeUrl('https://example.com/article?ref=homepage');
    assert.strictEqual(result, 'https://example.com/article');
  });

  it('should preserve non-tracking parameters', () => {
    const result = normalizeUrl('https://example.com/search?q=test&page=2');
    assert.strictEqual(result, 'https://example.com/search?page=2&q=test');
  });

  it('should sort remaining params for consistency', () => {
    const result1 = normalizeUrl('https://example.com/?b=2&a=1');
    const result2 = normalizeUrl('https://example.com/?a=1&b=2');
    assert.strictEqual(result1, result2);
  });

  it('should return null for invalid URLs', () => {
    assert.strictEqual(normalizeUrl('not a url'), null);
  });

  it('should handle URLs with no parameters', () => {
    const result = normalizeUrl('https://example.com/page');
    assert.strictEqual(result, 'https://example.com/page');
  });
});

describe('isExcludedUrl', () => {
  it('should exclude about: URLs', () => {
    assert.strictEqual(isExcludedUrl('about:preferences'), true);
  });

  it('should exclude moz-extension: URLs', () => {
    assert.strictEqual(isExcludedUrl('moz-extension://abc-123/page.html'), true);
  });

  it('should exclude data: URIs', () => {
    assert.strictEqual(isExcludedUrl('data:text/html,hello'), true);
  });

  it('should exclude localhost', () => {
    assert.strictEqual(isExcludedUrl('http://localhost:3000/page'), true);
    assert.strictEqual(isExcludedUrl('http://127.0.0.1:8080/'), true);
  });

  it('should include normal https URLs', () => {
    assert.strictEqual(isExcludedUrl('https://example.com'), false);
  });

  it('should include normal http URLs', () => {
    assert.strictEqual(isExcludedUrl('http://example.com'), false);
  });

  it('should exclude null/empty URLs', () => {
    assert.strictEqual(isExcludedUrl(null), true);
    assert.strictEqual(isExcludedUrl(''), true);
  });
});

describe('matchesPattern', () => {
  it('should match wildcard domain patterns', () => {
    assert.strictEqual(matchesPattern('https://sub.example.com/page', '*example.com*'), true);
  });

  it('should not match non-matching patterns', () => {
    assert.strictEqual(matchesPattern('https://other.com/page', '*example.com*'), false);
  });

  it('should handle empty pattern', () => {
    assert.strictEqual(matchesPattern('https://example.com', ''), false);
  });
});
