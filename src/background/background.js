import { HistoryExtractor } from '../lib/history-extractor.js';
import { GraphBuilder } from '../lib/graph-builder.js';
import { GraphExporter } from '../lib/graph-exporter.js';
import { GraphDB } from '../lib/graph-db.js';

const db = new GraphDB();
const historyExtractor = new HistoryExtractor();
const graphBuilder = new GraphBuilder(db);
const graphExporter = new GraphExporter(db);

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case 'START_EXTRACTION':
      return startExtraction(message.options);
    case 'GET_STATS':
      return graphBuilder.getStats();
    case 'EXPORT_JSONLD':
      return graphExporter.exportJsonLD(message.options);
    case 'EXPORT_RAG_CHUNKS':
      return graphExporter.exportRagChunks(message.options);
    case 'EXPORT_CONTEXT_SUMMARY':
      return graphExporter.exportContextSummary();
    case 'GET_GRAPH_DATA':
      return getGraphData();
    case 'OPEN_VISUALIZER':
      return openVisualizer();
    case 'GET_SETTINGS':
      return getSettings();
    case 'SAVE_SETTINGS':
      return saveSettings(message.settings);
    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

async function startExtraction(options = {}) {
  await db.open();
  const settings = await getSettings();
  const merged = { ...settings, ...options };

  const onProgress = (progress) => {
    browser.runtime.sendMessage({ type: 'PROGRESS_UPDATE', progress });
  };

  // Pipeline: extract history -> build graph. No content fetching needed.
  const historyMap = await historyExtractor.extract(merged, onProgress);
  await graphBuilder.build(historyMap, merged, onProgress);

  return { success: true, stats: await graphBuilder.getStats() };
}

async function getSettings() {
  const result = await browser.storage.local.get('settings');
  return result.settings || {
    dateRangeDays: 90,
    batchSize: 500,
    coOccurrenceThreshold: 5,
    exclusionPatterns: [],
  };
}

async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
  return { success: true };
}

async function getGraphData() {
  await db.open();
  const [pages, entities, topics, edges] = await Promise.all([
    db.getAll('pages'),
    db.getAll('entities'),
    db.getAll('topics'),
    db.getAll('edges'),
  ]);
  return { pages, entities, topics, edges };
}

async function openVisualizer() {
  const url = browser.runtime.getURL('visualizer/visualizer.html');
  await browser.tabs.create({ url });
  return { success: true };
}
