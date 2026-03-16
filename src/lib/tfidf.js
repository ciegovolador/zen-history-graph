/**
 * TF-IDF keyword extractor for topic identification.
 * Operates on page titles and URL path segments instead of full page text.
 */

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
  'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'also', 'use', 'how', 'our', 'has', 'was', 'been', 'are', 'is', 'were',
  'did', 'does', 'had', 'may', 'more', 'new', 'very', 'much', 'way',
  // Additional web/URL noise words
  'www', 'com', 'org', 'net', 'http', 'https', 'html', 'php', 'asp',
  'index', 'page', 'home', 'default', 'null', 'undefined',
]);

/**
 * Tokenize text into lowercase words, filtering stop words and short tokens.
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Compute term frequency for a document.
 */
function computeTF(tokens) {
  const tf = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  const len = tokens.length;
  if (len === 0) return tf;
  for (const [term, count] of tf) {
    tf.set(term, count / len);
  }
  return tf;
}

/**
 * Compute IDF across a corpus.
 * @param {Map<string, number>[]} documentTFs - Array of TF maps
 * @returns {Map<string, number>} term -> IDF score
 */
function computeIDF(documentTFs) {
  const docCount = documentTFs.length;
  const termDocCount = new Map();

  for (const tf of documentTFs) {
    for (const term of tf.keys()) {
      termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
    }
  }

  const idf = new Map();
  for (const [term, count] of termDocCount) {
    idf.set(term, Math.log(docCount / (1 + count)) + 1);
  }
  return idf;
}

/**
 * Extract top topics from a corpus of documents using TF-IDF.
 * Documents can be page titles, URL paths, or any text.
 *
 * @param {object[]} documents - Array of { url, text } objects
 * @param {number} topN - Number of top topics per document (default 10)
 * @returns {object} { topics: [{ id, name, score }], pageTopics: Map<url, [{ name, score }]> }
 */
export function extractTopics(documents, topN = 10) {
  if (documents.length === 0) return { topics: [], pageTopics: new Map() };

  // Tokenize all documents
  const docTokens = documents.map(doc => tokenize(doc.text));
  const docTFs = docTokens.map(tokens => computeTF(tokens));
  const idf = computeIDF(docTFs);

  // Compute TF-IDF scores per document
  const globalScores = new Map();
  const pageTopics = new Map();

  for (let i = 0; i < documents.length; i++) {
    const tf = docTFs[i];
    const docScores = [];

    for (const [term, tfScore] of tf) {
      const idfScore = idf.get(term) || 0;
      const tfidf = tfScore * idfScore;
      docScores.push({ name: term, score: tfidf });

      // Accumulate global scores
      globalScores.set(term, (globalScores.get(term) || 0) + tfidf);
    }

    // Top N topics for this document
    docScores.sort((a, b) => b.score - a.score);
    pageTopics.set(documents[i].url, docScores.slice(0, topN));
  }

  // Build global topic list
  const topics = Array.from(globalScores.entries())
    .map(([name, score]) => ({
      id: `topic:${name}`,
      name,
      score,
    }))
    .sort((a, b) => b.score - a.score);

  return { topics, pageTopics };
}

/**
 * Build document representations from history entries for TF-IDF.
 * Each "document" is the title + path segments of a history entry.
 *
 * @param {object[]} entries - Array of history entries with { url, title, pathSegments }
 * @returns {object[]} Array of { url, text } suitable for extractTopics()
 */
export function entriesToDocuments(entries) {
  return entries.map(entry => ({
    url: entry.url,
    text: [
      entry.title || '',
      ...(entry.pathSegments || []),
    ].join(' '),
  }));
}
