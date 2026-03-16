import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractEntities, extractEntitiesFromEntry, extractEntitiesBatch } from '../src/lib/entity-extractor.js';

describe('extractEntities (text-based, legacy API)', () => {
  it('should extract technology terms', () => {
    const entities = extractEntities('We built this with React and TypeScript using Node.js');
    const names = entities.map(e => e.normalizedName);
    assert.ok(names.includes('react'));
    assert.ok(names.includes('typescript'));
    assert.ok(names.includes('node.js'));
  });

  it('should count mentions correctly', () => {
    const entities = extractEntities('Python is great. Python is versatile. Python is popular.');
    const python = entities.find(e => e.normalizedName === 'python');
    assert.ok(python);
    assert.strictEqual(python.mentions, 3);
  });

  it('should extract proper nouns as potential entities', () => {
    const entities = extractEntities('Sundar Pichai announced new features at the Google event.');
    const names = entities.map(e => e.name);
    assert.ok(names.includes('Sundar Pichai'));
  });

  it('should identify organization suffixes', () => {
    const entities = extractEntities('The Mozilla Foundation released a new report.');
    const mozilla = entities.find(e => e.name === 'Mozilla Foundation');
    assert.ok(mozilla);
    assert.strictEqual(mozilla.type, 'organization');
  });

  it('should return empty array for empty text', () => {
    assert.deepStrictEqual(extractEntities(''), []);
    assert.deepStrictEqual(extractEntities(null), []);
  });

  it('should deduplicate entities with different cases', () => {
    const entities = extractEntities('javascript JavaScript JAVASCRIPT');
    const js = entities.filter(e => e.normalizedName === 'javascript');
    assert.strictEqual(js.length, 1);
    assert.strictEqual(js[0].mentions, 3);
  });
});

describe('extractEntitiesFromEntry (history entry-based)', () => {
  it('should extract entities from title', () => {
    const entry = {
      url: 'https://blog.example.com/post/react-hooks',
      title: 'Understanding React Hooks in TypeScript',
      domain: 'blog.example.com',
      pathSegments: ['post', 'react hooks'],
    };
    const entities = extractEntitiesFromEntry(entry);
    const names = entities.map(e => e.normalizedName);
    assert.ok(names.includes('react'));
    assert.ok(names.includes('typescript'));
  });

  it('should extract known domain entities', () => {
    const entry = {
      url: 'https://github.com/user/repo',
      title: 'user/repo - GitHub',
      domain: 'github.com',
      pathSegments: ['user', 'repo'],
    };
    const entities = extractEntitiesFromEntry(entry);
    const names = entities.map(e => e.name);
    assert.ok(names.includes('GitHub'));
  });

  it('should extract project names from GitHub URLs', () => {
    const entry = {
      url: 'https://github.com/facebook/react',
      title: 'facebook/react: A JavaScript library for building user interfaces',
      domain: 'github.com',
      pathSegments: ['facebook', 'react'],
    };
    const entities = extractEntitiesFromEntry(entry);
    const names = entities.map(e => e.normalizedName);
    assert.ok(names.includes('react'));
  });

  it('should extract technology terms from path segments', () => {
    const entry = {
      url: 'https://docs.example.com/kubernetes/deployment',
      title: 'Deployment Guide',
      domain: 'docs.example.com',
      pathSegments: ['kubernetes', 'deployment'],
    };
    const entities = extractEntitiesFromEntry(entry);
    const names = entities.map(e => e.normalizedName);
    assert.ok(names.includes('kubernetes'));
  });

  it('should return empty array for null entry', () => {
    assert.deepStrictEqual(extractEntitiesFromEntry(null), []);
  });
});

describe('extractEntitiesBatch', () => {
  it('should merge entities across multiple entries', () => {
    const entries = [
      {
        url: 'https://a.com/react',
        title: 'React Tutorial',
        domain: 'a.com',
        pathSegments: ['react'],
      },
      {
        url: 'https://b.com/react-hooks',
        title: 'React Hooks Deep Dive',
        domain: 'b.com',
        pathSegments: ['react hooks'],
      },
    ];
    const { entities, pageEntities } = extractEntitiesBatch(entries);
    const react = entities.find(e => e.normalizedName === 'react');
    assert.ok(react);
    assert.ok(react.mentions >= 2);
    assert.ok(pageEntities.has('https://a.com/react'));
    assert.ok(pageEntities.has('https://b.com/react-hooks'));
  });

  it('should track per-page entities', () => {
    const entries = [
      {
        url: 'https://a.com/python',
        title: 'Python Guide',
        domain: 'a.com',
        pathSegments: ['python'],
      },
      {
        url: 'https://b.com/rust',
        title: 'Rust Programming',
        domain: 'b.com',
        pathSegments: ['rust'],
      },
    ];
    const { pageEntities } = extractEntitiesBatch(entries);
    const aEntities = pageEntities.get('https://a.com/python').map(e => e.normalizedName);
    const bEntities = pageEntities.get('https://b.com/rust').map(e => e.normalizedName);
    assert.ok(aEntities.includes('python'));
    assert.ok(bEntities.includes('rust'));
  });
});
