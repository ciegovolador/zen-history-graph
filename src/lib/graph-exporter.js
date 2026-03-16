import { chunkByDomain, chunkByTopic } from './text-chunker.js';

const FORMAT_VERSION = '2.0.0';

export class GraphExporter {
  constructor(db) {
    this.db = db;
  }

  /**
   * Export the full knowledge graph in JSON-LD format.
   * @param {object} options - Optional { startDate, endDate } for filtering
   */
  async exportJsonLD(options = {}) {
    await this.db.open();

    let pages = await this.db.getAll('pages');
    const entities = await this.db.getAll('entities');
    const topics = await this.db.getAll('topics');
    let edges = await this.db.getAll('edges');

    // Filter by date range if specified
    if (options.startDate || options.endDate) {
      const start = options.startDate ? new Date(options.startDate).getTime() : 0;
      const end = options.endDate ? new Date(options.endDate).getTime() : Infinity;

      pages = pages.filter(p => p.lastVisited >= start && p.firstVisited <= end);
      const pageUrls = new Set(pages.map(p => p.url));

      edges = edges.filter(e => pageUrls.has(e.source) || pageUrls.has(e.target));
    }

    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'zen': 'https://zen-history-graph.local/ontology/',
        'Page': 'zen:Page',
        'Entity': 'zen:Entity',
        'Topic': 'zen:Topic',
        'MENTIONS': 'zen:mentions',
        'ABOUT': 'zen:about',
        'LINKS_TO': 'zen:linksTo',
        'RELATED_TO': 'zen:relatedTo',
        'TEMPORAL': 'zen:temporal',
        'SAME_DOMAIN': 'zen:sameDomain',
      },
      formatVersion: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      nodes: [
        ...pages.map(p => ({
          '@type': 'Page',
          url: p.url,
          domain: p.domain,
          title: p.title,
          visitCount: p.visitCount,
          firstVisited: p.firstVisited,
          lastVisited: p.lastVisited,
        })),
        ...entities.map(e => ({ '@type': 'Entity', ...e })),
        ...topics.map(t => ({ '@type': 'Topic', ...t })),
      ],
      edges: edges.map(e => ({
        '@type': e.type,
        source: e.source,
        target: e.target,
        weight: e.weight,
      })),
    };
  }

  /**
   * Export RAG-ready context chunks — domain-grouped and topic-grouped summaries.
   * No full page text — built from history metadata.
   */
  async exportRagChunks(options = {}) {
    await this.db.open();

    const pages = await this.db.getAll('pages');
    const edges = await this.db.getAll('edges');

    // Build page entities and topics from edges
    const pageEntities = new Map();
    const pageTopics = new Map();
    const mentionsEdges = edges.filter(e => e.type === 'MENTIONS');
    const aboutEdges = edges.filter(e => e.type === 'ABOUT');

    for (const edge of mentionsEdges) {
      if (!pageEntities.has(edge.source)) pageEntities.set(edge.source, []);
      pageEntities.get(edge.source).push({
        name: edge.target.replace('entity:', ''),
        id: edge.target,
      });
    }

    for (const edge of aboutEdges) {
      if (!pageTopics.has(edge.source)) pageTopics.set(edge.source, []);
      pageTopics.get(edge.source).push({
        name: edge.target.replace('topic:', ''),
        score: edge.weight || 0,
      });
    }

    // Build domain-grouped chunks
    const domainChunks = chunkByDomain(pages, pageEntities, pageTopics);

    // Build topic-grouped chunks
    const topicChunks = chunkByTopic(pages, pageTopics, 20);

    const allChunks = [...domainChunks, ...topicChunks];

    return {
      formatVersion: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      totalChunks: allChunks.length,
      chunks: allChunks,
    };
  }

  /**
   * Generate a human-readable context summary.
   * @returns {object} { formatVersion, markdown }
   */
  async exportContextSummary() {
    await this.db.open();

    const entities = await this.db.getAll('entities');
    const topics = await this.db.getAll('topics');
    const edges = await this.db.getAll('edges');
    const pages = await this.db.getAll('pages');

    // Top 20 entities by mention count
    const topEntities = entities
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 20);

    // Top 20 topics by score
    const topTopics = topics
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Top 10 entity relationships by co-occurrence weight
    const relatedEdges = edges
      .filter(e => e.type === 'RELATED_TO' && e.source.startsWith('entity:'))
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 10);

    // Top domains by visit count
    const domainVisits = new Map();
    for (const page of pages) {
      domainVisits.set(page.domain, (domainVisits.get(page.domain) || 0) + (page.visitCount || 1));
    }
    const topDomains = Array.from(domainVisits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // Edge type counts
    const edgeCounts = new Map();
    for (const e of edges) {
      edgeCounts.set(e.type, (edgeCounts.get(e.type) || 0) + 1);
    }

    // Build entity name lookup
    const entityNames = new Map(entities.map(e => [e.id, e.name]));

    let md = `# Browsing Context Summary\n\n`;
    md += `*${pages.length} pages indexed | ${entities.length} entities | ${topics.length} topics | ${edges.length} relationships*\n\n`;

    md += `## Top Domains\n\n`;
    for (const [domain, visits] of topDomains) {
      md += `- **${domain}** — ${visits} visits\n`;
    }

    md += `\n## Top Entities\n\n`;
    for (const e of topEntities) {
      md += `- **${e.name}** (${e.type}) — ${e.mentions} mentions\n`;
    }

    md += `\n## Top Topics\n\n`;
    for (const t of topTopics) {
      md += `- **${t.name}** — relevance: ${t.score.toFixed(3)}\n`;
    }

    md += `\n## Key Relationships\n\n`;
    for (const edge of relatedEdges) {
      const sourceName = entityNames.get(edge.source) || edge.source;
      const targetName = entityNames.get(edge.target) || edge.target;
      md += `- ${sourceName} <-> ${targetName} (co-occurred ${edge.weight} times)\n`;
    }

    md += `\n## Graph Structure\n\n`;
    for (const [type, count] of edgeCounts) {
      md += `- ${type}: ${count} edges\n`;
    }

    return {
      formatVersion: FORMAT_VERSION,
      markdown: md,
    };
  }
}
