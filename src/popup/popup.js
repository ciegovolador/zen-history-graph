document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupTabs();
  setupDashboard();
  setupSettings();
  setupExport();
  loadStats();
  listenForProgress();
}

// --- Tab navigation ---
function setupTabs() {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.remove('hidden');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  }
}

// --- Dashboard ---
function setupDashboard() {
  document.getElementById('btn-extract').addEventListener('click', async () => {
    const btn = document.getElementById('btn-extract');
    btn.disabled = true;
    btn.textContent = 'Extracting...';
    showProgress(0, 'Starting extraction...');

    try {
      const result = await browser.runtime.sendMessage({ type: 'START_EXTRACTION' });
      if (result.success) {
        showToast('Extraction complete!');
        renderStats(result.stats);
      } else {
        showToast('Extraction failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Extract & Build Graph';
      hideProgress();
    }
  });

  document.getElementById('btn-visualize').addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'OPEN_VISUALIZER' });
    window.close();
  });
}

async function loadStats() {
  try {
    const stats = await browser.runtime.sendMessage({ type: 'GET_STATS' });
    if (stats && stats.totalPages > 0) {
      renderStats(stats);
    }
  } catch (e) {
    // Background script may not be ready yet
  }
}

function renderStats(stats) {
  const el = document.getElementById('stats');
  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat"><span class="stat-value">${stats.totalPages}</span><span class="stat-label">Pages</span></div>
      <div class="stat"><span class="stat-value">${stats.totalEntities}</span><span class="stat-label">Entities</span></div>
      <div class="stat"><span class="stat-value">${stats.totalTopics}</span><span class="stat-label">Topics</span></div>
      <div class="stat"><span class="stat-value">${stats.totalEdges}</span><span class="stat-label">Relationships</span></div>
    </div>
    <p class="stat-meta">
      ${stats.dateRange ? `Covering ${stats.dateRange.start} — ${stats.dateRange.end}` : ''}<br>
      ${stats.lastUpdated ? `Last updated: ${new Date(stats.lastUpdated).toLocaleString()}` : ''}
    </p>
  `;
}

// --- Progress ---
function showProgress(percent, text) {
  const container = document.getElementById('progress-container');
  container.classList.remove('hidden');
  document.getElementById('progress-fill').style.width = percent + '%';
  document.getElementById('progress-text').textContent = text;
}

function hideProgress() {
  document.getElementById('progress-container').classList.add('hidden');
}

function listenForProgress() {
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'PROGRESS_UPDATE' && message.progress) {
      const { phase, current, total } = message.progress;
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      showProgress(percent, `${phase}: ${current} / ${total}`);
    }
  });
}

// --- Settings ---
async function setupSettings() {
  const settings = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
  if (settings) {
    document.getElementById('setting-dateRange').value = settings.dateRangeDays || 90;
    document.getElementById('setting-batchSize').value = settings.batchSize || 500;
    document.getElementById('setting-exclusions').value = (settings.exclusionPatterns || []).join('\n');
  }

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const newSettings = {
      dateRangeDays: parseInt(document.getElementById('setting-dateRange').value, 10),
      batchSize: parseInt(document.getElementById('setting-batchSize').value, 10),
      coOccurrenceThreshold: 5,
      exclusionPatterns: document.getElementById('setting-exclusions').value.split('\n').filter(Boolean),
    };
    await browser.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: newSettings });
    showToast('Settings saved');
  });
}

// --- Export ---
function setupExport() {
  document.getElementById('btn-export-jsonld').addEventListener('click', async () => {
    const data = await browser.runtime.sendMessage({ type: 'EXPORT_JSONLD' });
    downloadJson(data, `history-graph-${todayStr()}.jsonld`);
  });

  document.getElementById('btn-export-rag').addEventListener('click', async () => {
    const data = await browser.runtime.sendMessage({ type: 'EXPORT_RAG_CHUNKS' });
    downloadJson(data, `history-rag-${todayStr()}.json`);
  });

  document.getElementById('btn-export-summary').addEventListener('click', async () => {
    const data = await browser.runtime.sendMessage({ type: 'EXPORT_CONTEXT_SUMMARY' });
    downloadText(data.markdown, `context-summary-${todayStr()}.md`);
  });

  document.getElementById('btn-copy-context').addEventListener('click', async () => {
    const data = await browser.runtime.sendMessage({ type: 'EXPORT_CONTEXT_SUMMARY' });
    await navigator.clipboard.writeText(data.markdown);
    showToast('Context copied to clipboard');
  });
}

// --- Helpers ---
function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function showToast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}
