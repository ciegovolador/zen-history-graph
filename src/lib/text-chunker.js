/**
 * Context chunker for history-based knowledge graph.
 * Instead of chunking full article text, this creates "context chunks"
 * from groups of related history entries — by domain, by topic cluster,
 * or by time window. Each chunk is a summary of a cluster of visits.
 */

/**
 * Create context chunks grouped by domain.
 * Each chunk summarizes all visits to a given domain.
 *
 * @param {object[]} entries - Array of history entries
 * @param {Map<string, object[]>} pageEntities - Map of url -> entities
 * @param {Map<string, object[]>} pageTopics - Map of url -> topics
 * @returns {object[]} Array of context chunks
 */
export function chunkByDomain(entries, pageEntities = new Map(), pageTopics = new Map()) {
  const domainGroups = new Map();

  for (const entry of entries) {
    if (!domainGroups.has(entry.domain)) {
      domainGroups.set(entry.domain, []);
    }
    domainGroups.get(entry.domain).push(entry);
  }

  const chunks = [];
  for (const [domain, domainEntries] of domainGroups) {
    const totalVisits = domainEntries.reduce((sum, e) => sum + (e.visitCount || 1), 0);
    const titles = domainEntries
      .map(e => e.title)
      .filter(Boolean)
      .slice(0, 10);

    // Collect entities and topics for this domain
    const entitySet = new Set();
    const topicSet = new Set();
    for (const entry of domainEntries) {
      const entities = pageEntities.get(entry.url) || [];
      for (const e of entities) entitySet.add(e.name);
      const topics = pageTopics.get(entry.url) || [];
      for (const t of topics) topicSet.add(t.name);
    }

    // Find visit date range
    const timestamps = domainEntries.flatMap(e =>
      e.visitEvents ? e.visitEvents.map(v => v.timestamp) : [e.firstVisited, e.lastVisited]
    ).filter(Boolean);

    const startTs = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const endTs = timestamps.length > 0 ? Math.max(...timestamps) : null;

    const keyPages = titles.length > 0
      ? `Key pages: ${titles.map(t => `'${t}'`).join(', ')}.`
      : '';
    const entityList = entitySet.size > 0
      ? `Related entities: ${Array.from(entitySet).slice(0, 10).join(', ')}.`
      : '';
    const topicList = topicSet.size > 0
      ? `Topics: ${Array.from(topicSet).slice(0, 10).join(', ')}.`
      : '';

    const textParts = [
      `Visited ${domain} ${totalVisits} times across ${domainEntries.length} pages.`,
      keyPages,
      entityList,
      topicList,
    ].filter(Boolean);

    chunks.push({
      id: `domain:${domain}`,
      type: 'domain',
      text: textParts.join(' '),
      source_urls: domainEntries.map(e => e.url),
      visit_range: startTs && endTs ? {
        start: new Date(startTs).toISOString().split('T')[0],
        end: new Date(endTs).toISOString().split('T')[0],
      } : null,
      entities: Array.from(entitySet).slice(0, 20),
      topics: Array.from(topicSet).slice(0, 20),
      visit_count: totalVisits,
      page_count: domainEntries.length,
    });
  }

  // Sort by visit count descending
  chunks.sort((a, b) => b.visit_count - a.visit_count);
  return chunks;
}

/**
 * Create context chunks grouped by topic.
 * Each chunk summarizes all pages associated with a given topic.
 *
 * @param {object[]} entries - Array of history entries
 * @param {Map<string, object[]>} pageTopics - Map of url -> topics array
 * @param {number} topN - Number of top topics to create chunks for (default 20)
 * @returns {object[]} Array of context chunks
 */
export function chunkByTopic(entries, pageTopics = new Map(), topN = 20) {
  // Invert: topic -> pages
  const topicPages = new Map();
  for (const [url, topics] of pageTopics) {
    for (const topic of topics) {
      if (!topicPages.has(topic.name)) {
        topicPages.set(topic.name, []);
      }
      topicPages.get(topic.name).push(url);
    }
  }

  // Build entry lookup
  const entryMap = new Map(entries.map(e => [e.url, e]));

  // Sort topics by number of associated pages
  const sortedTopics = Array.from(topicPages.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, topN);

  const chunks = [];
  for (const [topicName, urls] of sortedTopics) {
    const topicEntries = urls.map(u => entryMap.get(u)).filter(Boolean);
    const domains = [...new Set(topicEntries.map(e => e.domain))];
    const titles = topicEntries
      .map(e => e.title)
      .filter(Boolean)
      .slice(0, 8);
    const totalVisits = topicEntries.reduce((sum, e) => sum + (e.visitCount || 1), 0);

    const textParts = [
      `Topic "${topicName}" appears across ${urls.length} pages on ${domains.length} domains.`,
      titles.length > 0 ? `Key pages: ${titles.map(t => `'${t}'`).join(', ')}.` : '',
      domains.length > 0 ? `Domains: ${domains.slice(0, 5).join(', ')}.` : '',
    ].filter(Boolean);

    chunks.push({
      id: `topic:${topicName}`,
      type: 'topic',
      text: textParts.join(' '),
      source_urls: urls,
      entities: [],
      topics: [topicName],
      visit_count: totalVisits,
      page_count: urls.length,
    });
  }

  return chunks;
}

/**
 * Create context chunks grouped by time window.
 * Groups visits into time buckets and summarizes activity in each window.
 *
 * @param {object[]} entries - Array of history entries
 * @param {number} windowMs - Time window size in ms (default: 1 day)
 * @returns {object[]} Array of context chunks
 */
export function chunkByTimeWindow(entries, windowMs = 24 * 60 * 60 * 1000) {
  if (entries.length === 0) return [];

  // Collect all visits with timestamps
  const allVisits = [];
  for (const entry of entries) {
    if (entry.visitEvents) {
      for (const v of entry.visitEvents) {
        allVisits.push({ url: entry.url, title: entry.title, domain: entry.domain, timestamp: v.timestamp });
      }
    } else {
      allVisits.push({ url: entry.url, title: entry.title, domain: entry.domain, timestamp: entry.lastVisited });
    }
  }
  allVisits.sort((a, b) => a.timestamp - b.timestamp);

  if (allVisits.length === 0) return [];

  // Group into time windows
  const windows = [];
  let windowStart = allVisits[0].timestamp;
  let currentWindow = [];

  for (const visit of allVisits) {
    if (visit.timestamp - windowStart > windowMs) {
      if (currentWindow.length > 0) {
        windows.push({ start: windowStart, visits: currentWindow });
      }
      windowStart = visit.timestamp;
      currentWindow = [];
    }
    currentWindow.push(visit);
  }
  if (currentWindow.length > 0) {
    windows.push({ start: windowStart, visits: currentWindow });
  }

  return windows.map((w, i) => {
    const urls = [...new Set(w.visits.map(v => v.url))];
    const domains = [...new Set(w.visits.map(v => v.domain))];
    const titles = [...new Set(w.visits.map(v => v.title).filter(Boolean))].slice(0, 8);
    const startDate = new Date(w.start).toISOString().split('T')[0];

    return {
      id: `timewindow:${startDate}:${i}`,
      type: 'time_window',
      text: `${w.visits.length} visits on ${startDate} across ${domains.length} domains. Pages: ${titles.join(', ')}.`,
      source_urls: urls,
      visit_range: {
        start: startDate,
        end: new Date(w.start + windowMs).toISOString().split('T')[0],
      },
      entities: [],
      topics: [],
      visit_count: w.visits.length,
      page_count: urls.length,
    };
  });
}
