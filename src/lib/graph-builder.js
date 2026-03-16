import { extractEntitiesBatch } from './entity-extractor.js';
import { extractTopics, entriesToDocuments } from './tfidf.js';
import { buildNavigationChains, findTemporalEdges, findSameDomainEdges } from './history-extractor.js';

export class GraphBuilder {
  constructor(db) {
    this.db = db;
  }

  /**
   * Build the knowledge graph from history entries directly.
   * No content fetching — works purely from history metadata.
   *
   * @param {Map<string, object>} historyMap - Map of URL -> history entry
   * @param {object} options
   * @param {function} onProgress
   */
  async build(historyMap, options = {}, onProgress = () => {}) {
    const { coOccurrenceThreshold = 5, temporalWindowMs = 10 * 60 * 1000 } = options;
    const entries = Array.from(historyMap.values());
    const total = entries.length;
    let completed = 0;

    // Phase 1: Create page nodes and extract entities
    onProgress({ phase: 'Graph: pages & entities', current: 0, total });

    const { entities: allEntities, pageEntities } = extractEntitiesBatch(entries);

    for (const entry of entries) {
      // Create page node
      const pageNode = {
        url: entry.url,
        domain: entry.domain,
        title: entry.title,
        pathSegments: entry.pathSegments,
        visitCount: entry.visitCount,
        firstVisited: entry.firstVisited,
        lastVisited: entry.lastVisited,
        visitEvents: entry.visitEvents,
      };
      await this.db.put('pages', pageNode);

      // Store entities and create MENTIONS edges
      const entryEntities = pageEntities.get(entry.url) || [];
      for (const entity of entryEntities) {
        const existing = await this.db.get('entities', entity.id);
        if (existing) {
          existing.mentions += entity.mentions;
          for (const alias of entity.aliases) {
            if (!existing.aliases.includes(alias)) {
              existing.aliases.push(alias);
            }
          }
          await this.db.put('entities', existing);
        } else {
          await this.db.put('entities', entity);
        }

        await this.db.put('edges', {
          id: `mentions:${entry.url}:${entity.id}`,
          type: 'MENTIONS',
          source: entry.url,
          target: entity.id,
          weight: entity.mentions,
        });
      }

      completed++;
      if (completed % 100 === 0 || completed === total) {
        onProgress({ phase: 'Graph: pages & entities', current: completed, total });
      }
    }

    // Phase 2: Extract topics via TF-IDF over titles + path segments
    onProgress({ phase: 'Graph: topic extraction', current: 0, total: 1 });

    const documents = entriesToDocuments(entries);
    const { topics, pageTopics } = extractTopics(documents);

    for (const topic of topics) {
      await this.db.put('topics', topic);
    }

    for (const [url, docTopics] of pageTopics) {
      for (const topic of docTopics) {
        await this.db.put('edges', {
          id: `about:${url}:${topic.name}`,
          type: 'ABOUT',
          source: url,
          target: `topic:${topic.name}`,
          weight: topic.score,
        });
      }
    }

    onProgress({ phase: 'Graph: topic extraction', current: 1, total: 1 });

    // Phase 3: LINKS_TO edges from navigation chains (transition = "link")
    onProgress({ phase: 'Graph: navigation chains', current: 0, total: 1 });

    const navChains = buildNavigationChains(historyMap);
    for (const chain of navChains) {
      await this.db.put('edges', {
        id: `links:${chain.source}:${chain.target}`,
        type: 'LINKS_TO',
        source: chain.source,
        target: chain.target,
        weight: 1,
      });
    }

    onProgress({ phase: 'Graph: navigation chains', current: 1, total: 1 });

    // Phase 4: TEMPORAL edges between pages visited in close time proximity
    onProgress({ phase: 'Graph: temporal edges', current: 0, total: 1 });

    const temporalEdges = findTemporalEdges(historyMap, temporalWindowMs);
    for (const edge of temporalEdges) {
      await this.db.put('edges', {
        id: `temporal:${[edge.source, edge.target].sort().join('::')}`,
        type: 'TEMPORAL',
        source: edge.source,
        target: edge.target,
        weight: 1,
      });
    }

    onProgress({ phase: 'Graph: temporal edges', current: 1, total: 1 });

    // Phase 5: SAME_DOMAIN edges
    onProgress({ phase: 'Graph: domain edges', current: 0, total: 1 });

    const domainEdges = findSameDomainEdges(historyMap);
    for (const edge of domainEdges) {
      await this.db.put('edges', {
        id: `domain:${edge.source}::${edge.target}`,
        type: 'SAME_DOMAIN',
        source: edge.source,
        target: edge.target,
        domain: edge.domain,
      });
    }

    onProgress({ phase: 'Graph: domain edges', current: 1, total: 1 });

    // Phase 6: RELATED_TO edges from co-occurrence
    onProgress({ phase: 'Graph: co-occurrence', current: 0, total: 1 });

    // Entity co-occurrence
    const entityCoOccurrence = new Map();
    for (const entities of pageEntities.values()) {
      const ids = entities.map(e => e.id);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = [ids[i], ids[j]].sort().join('::');
          entityCoOccurrence.set(key, (entityCoOccurrence.get(key) || 0) + 1);
        }
      }
    }

    for (const [key, count] of entityCoOccurrence) {
      if (count >= coOccurrenceThreshold) {
        const [source, target] = key.split('::');
        await this.db.put('edges', {
          id: `related:${key}`,
          type: 'RELATED_TO',
          source,
          target,
          weight: count,
        });
      }
    }

    // Topic co-occurrence
    const topicCoOccurrence = new Map();
    for (const [, docTopics] of pageTopics) {
      const names = docTopics.map(t => `topic:${t.name}`);
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const key = [names[i], names[j]].sort().join('::');
          topicCoOccurrence.set(key, (topicCoOccurrence.get(key) || 0) + 1);
        }
      }
    }

    for (const [key, count] of topicCoOccurrence) {
      if (count >= coOccurrenceThreshold) {
        const [source, target] = key.split('::');
        await this.db.put('edges', {
          id: `related:${key}`,
          type: 'RELATED_TO',
          source,
          target,
          weight: count,
        });
      }
    }

    onProgress({ phase: 'Graph: co-occurrence', current: 1, total: 1 });

    // Update metadata
    await this.db.putMeta('lastUpdated', Date.now());
    if (entries.length > 0) {
      await this.db.putMeta('lastProcessedTimestamp', Math.max(...entries.map(e => e.lastVisited)));
    }
  }

  /**
   * Get graph statistics.
   */
  async getStats() {
    await this.db.open();

    const [totalPages, totalEntities, totalTopics, totalEdges] = await Promise.all([
      this.db.count('pages'),
      this.db.count('entities'),
      this.db.count('topics'),
      this.db.count('edges'),
    ]);

    const lastUpdated = await this.db.getMeta('lastUpdated');

    let dateRange = null;
    const allPages = await this.db.getAll('pages');
    if (allPages.length > 0) {
      const timestamps = allPages.flatMap(p => [p.firstVisited, p.lastVisited]).filter(Boolean);
      if (timestamps.length > 0) {
        dateRange = {
          start: new Date(Math.min(...timestamps)).toISOString().split('T')[0],
          end: new Date(Math.max(...timestamps)).toISOString().split('T')[0],
        };
      }
    }

    return {
      totalPages,
      totalEntities,
      totalTopics,
      totalEdges,
      lastUpdated,
      dateRange,
    };
  }
}
