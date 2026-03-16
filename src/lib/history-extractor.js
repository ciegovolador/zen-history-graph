import { normalizeUrl, isExcludedUrl, matchesPattern } from './url-utils.js';

/**
 * Extract and structure browser history into rich entries.
 * This is the main workhorse — it extracts all data needed for graph building
 * directly from browser.history APIs, with no network requests.
 */
export class HistoryExtractor {
  /**
   * Extract and normalize browser history entries with full visit details.
   * @param {object} options
   * @param {number} options.dateRangeDays - Days of history to fetch (default 90)
   * @param {number} options.batchSize - Entries per batch (default 500)
   * @param {string[]} options.exclusionPatterns - URL patterns to exclude
   * @param {function} onProgress - Progress callback
   * @returns {Promise<Map<string, object>>} Map of canonical URL -> structured entry
   */
  async extract(options = {}, onProgress = () => {}) {
    const {
      dateRangeDays = 90,
      batchSize = 500,
      exclusionPatterns = [],
    } = options;

    const startTime = Date.now() - dateRangeDays * 24 * 60 * 60 * 1000;

    // Fetch all history entries in the date range
    const rawEntries = await browser.history.search({
      text: '',
      startTime,
      maxResults: Number.MAX_SAFE_INTEGER,
    });

    const total = rawEntries.length;
    onProgress({ phase: 'History extraction', current: 0, total });

    // Process in batches
    const normalizedMap = new Map();
    for (let i = 0; i < rawEntries.length; i += batchSize) {
      const batch = rawEntries.slice(i, i + batchSize);

      for (const entry of batch) {
        // Filter out excluded URLs
        if (isExcludedUrl(entry.url)) continue;
        if (exclusionPatterns.some(p => matchesPattern(entry.url, p))) continue;

        const canonical = normalizeUrl(entry.url);
        if (!canonical) continue;

        // Get detailed visit info
        const visits = await browser.history.getVisits({ url: entry.url });

        const visitEvents = visits
          .filter(v => v.visitTime >= startTime)
          .map(v => ({
            timestamp: v.visitTime,
            transition: v.transition,
            referringVisitId: v.referringVisitId || null,
          }));

        // Parse URL structure for later use in entity/topic extraction
        let urlParts;
        try {
          const urlObj = new URL(canonical);
          urlParts = {
            domain: urlObj.hostname,
            pathSegments: urlObj.pathname
              .split('/')
              .filter(s => s.length > 0)
              .map(s => decodeURIComponent(s).replace(/[-_]/g, ' ')),
            searchParams: Object.fromEntries(urlObj.searchParams),
          };
        } catch {
          continue;
        }

        if (normalizedMap.has(canonical)) {
          // Merge with existing entry
          const existing = normalizedMap.get(canonical);
          existing.visitEvents.push(...visitEvents);
          existing.visitCount += entry.visitCount || 0;
          if (visitEvents.length > 0) {
            existing.firstVisited = Math.min(existing.firstVisited, ...visitEvents.map(v => v.timestamp));
            existing.lastVisited = Math.max(existing.lastVisited, ...visitEvents.map(v => v.timestamp));
          }
          // Update title if the new one is non-empty and existing is empty
          if (!existing.title && entry.title) {
            existing.title = entry.title;
          }
        } else {
          normalizedMap.set(canonical, {
            url: canonical,
            originalUrl: entry.url,
            domain: urlParts.domain,
            pathSegments: urlParts.pathSegments,
            title: entry.title || '',
            visitCount: entry.visitCount || 0,
            visitEvents,
            firstVisited: visitEvents.length > 0
              ? Math.min(...visitEvents.map(v => v.timestamp))
              : entry.lastVisitTime || Date.now(),
            lastVisited: visitEvents.length > 0
              ? Math.max(...visitEvents.map(v => v.timestamp))
              : entry.lastVisitTime || Date.now(),
          });
        }
      }

      onProgress({ phase: 'History extraction', current: Math.min(i + batchSize, total), total });
    }

    return normalizedMap;
  }
}

/**
 * Build navigation chains from visit events across all history entries.
 * Identifies sequences where transition type is "link" — these represent
 * user-initiated navigation from one page to another.
 *
 * @param {Map<string, object>} historyMap - Map of canonical URL -> entry
 * @returns {Array<{source: string, target: string, timestamp: number}>} Navigation edges
 */
export function buildNavigationChains(historyMap) {
  // Collect all visit events with their URLs, sorted by time
  const allVisits = [];
  for (const [url, entry] of historyMap) {
    for (const visit of entry.visitEvents) {
      allVisits.push({ url, ...visit });
    }
  }
  allVisits.sort((a, b) => a.timestamp - b.timestamp);

  const chains = [];
  // Look for consecutive visits where the later one has transition "link"
  // and they are within 30 seconds of each other (direct navigation)
  for (let i = 1; i < allVisits.length; i++) {
    const prev = allVisits[i - 1];
    const curr = allVisits[i];
    if (
      curr.transition === 'link' &&
      curr.url !== prev.url &&
      (curr.timestamp - prev.timestamp) < 30000 // within 30 seconds
    ) {
      chains.push({
        source: prev.url,
        target: curr.url,
        timestamp: curr.timestamp,
      });
    }
  }

  return chains;
}

/**
 * Find temporally proximate pages — pages visited within a time window.
 *
 * @param {Map<string, object>} historyMap - Map of canonical URL -> entry
 * @param {number} windowMs - Time window in milliseconds (default 10 minutes)
 * @returns {Array<{source: string, target: string, timestamp: number}>} Temporal edges
 */
export function findTemporalEdges(historyMap, windowMs = 10 * 60 * 1000) {
  // Collect all visit events with their URLs, sorted by time
  const allVisits = [];
  for (const [url, entry] of historyMap) {
    for (const visit of entry.visitEvents) {
      allVisits.push({ url, timestamp: visit.timestamp });
    }
  }
  allVisits.sort((a, b) => a.timestamp - b.timestamp);

  const edges = new Map(); // deduplicate by source::target pair
  for (let i = 0; i < allVisits.length; i++) {
    for (let j = i + 1; j < allVisits.length; j++) {
      const diff = allVisits[j].timestamp - allVisits[i].timestamp;
      if (diff > windowMs) break;
      if (allVisits[i].url === allVisits[j].url) continue;

      const key = [allVisits[i].url, allVisits[j].url].sort().join('::');
      if (!edges.has(key)) {
        edges.set(key, {
          source: allVisits[i].url,
          target: allVisits[j].url,
          timestamp: allVisits[i].timestamp,
        });
      }
    }
  }

  return Array.from(edges.values());
}

/**
 * Find pages sharing the same domain.
 *
 * @param {Map<string, object>} historyMap - Map of canonical URL -> entry
 * @returns {Array<{source: string, target: string, domain: string}>} Same-domain edges
 */
export function findSameDomainEdges(historyMap) {
  // Group URLs by domain
  const domainGroups = new Map();
  for (const [url, entry] of historyMap) {
    if (!domainGroups.has(entry.domain)) {
      domainGroups.set(entry.domain, []);
    }
    domainGroups.get(entry.domain).push(url);
  }

  const edges = [];
  for (const [domain, urls] of domainGroups) {
    if (urls.length < 2) continue;
    // Create edges between all pairs (limit to avoid combinatorial explosion)
    const maxPairs = Math.min(urls.length, 50);
    for (let i = 0; i < maxPairs; i++) {
      for (let j = i + 1; j < maxPairs; j++) {
        edges.push({
          source: urls[i],
          target: urls[j],
          domain,
        });
      }
    }
  }

  return edges;
}
