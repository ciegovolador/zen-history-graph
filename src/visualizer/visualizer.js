// --- State ---
let graphData = { nodes: [], edges: [] };
let visibleNodes = [];
let visibleEdges = [];
let simulation = null;

// Camera
let camera = { x: 0, y: 0, zoom: 1 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let draggedNode = null;
let hoveredNode = null;
let selectedNode = null;

// Config
const NODE_COLORS = {
  Page: '#3d7aed',
  Entity: '#9b59b6',
  Topic: '#2ecc71',
};
const EDGE_COLORS = {
  MENTIONS: '#5577aa44',
  ABOUT: '#55aa7744',
  LINKS_TO: '#aa775544',
  TEMPORAL: '#77557744',
  SAME_DOMAIN: '#55777744',
  RELATED_TO: '#aa557744',
};

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  setupCanvas();
  setupControls();
  await loadData();
  startSimulation();
  render();
});

// --- Canvas Setup ---
const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');

function setupCanvas() {
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    render();
  });
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('dblclick', onDblClick);
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

// --- Data Loading ---
async function loadData() {
  try {
    const raw = await browser.runtime.sendMessage({ type: 'GET_GRAPH_DATA' });
    if (!raw || raw.error) {
      console.error('Failed to load graph data:', raw?.error);
      return;
    }
    graphData = processGraphData(raw);
    applyFilters();
  } catch (err) {
    console.error('Error loading graph data:', err);
  }
}

function processGraphData(raw) {
  const nodes = [];
  const nodeMap = new Map();

  // Pages — size by visit count
  for (const page of (raw.pages || [])) {
    const node = {
      id: page.url,
      type: 'Page',
      label: page.title || page.domain || page.url,
      url: page.url,
      domain: page.domain,
      visitCount: page.visitCount || 1,
      firstVisited: page.firstVisited,
      lastVisited: page.lastVisited,
      radius: Math.max(4, Math.min(20, Math.sqrt(page.visitCount || 1) * 3)),
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600,
      vx: 0,
      vy: 0,
    };
    nodes.push(node);
    nodeMap.set(node.id, node);
  }

  // Entities — size by mention count
  for (const entity of (raw.entities || [])) {
    const node = {
      id: entity.id,
      type: 'Entity',
      label: entity.name,
      entityType: entity.type,
      mentions: entity.mentions || 1,
      aliases: entity.aliases || [],
      radius: Math.max(5, Math.min(25, Math.sqrt(entity.mentions || 1) * 4)),
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600,
      vx: 0,
      vy: 0,
    };
    nodes.push(node);
    nodeMap.set(node.id, node);
  }

  // Topics — size by score
  for (const topic of (raw.topics || [])) {
    const node = {
      id: topic.id,
      type: 'Topic',
      label: topic.name,
      score: topic.score || 0,
      radius: Math.max(4, Math.min(18, Math.sqrt(topic.score || 1) * 5)),
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600,
      vx: 0,
      vy: 0,
    };
    nodes.push(node);
    nodeMap.set(node.id, node);
  }

  // Edges
  const edges = (raw.edges || [])
    .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
    .map(e => ({
      id: e.id,
      type: e.type,
      source: e.source,
      target: e.target,
      weight: e.weight || 1,
    }));

  return { nodes, edges, nodeMap };
}

// --- Filtering ---
function applyFilters() {
  const maxNodes = parseInt(document.getElementById('max-nodes').value, 10);

  // Get enabled types
  const enabledNodeTypes = new Set();
  document.querySelectorAll('[data-node]').forEach(cb => {
    if (cb.checked) enabledNodeTypes.add(cb.dataset.node);
  });

  const enabledEdgeTypes = new Set();
  document.querySelectorAll('[data-edge]').forEach(cb => {
    if (cb.checked) enabledEdgeTypes.add(cb.dataset.edge);
  });

  // Filter and rank nodes — prioritize high-connectivity nodes
  const connectionCount = new Map();
  for (const edge of graphData.edges) {
    if (!enabledEdgeTypes.has(edge.type)) continue;
    connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
    connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
  }

  const filtered = graphData.nodes
    .filter(n => enabledNodeTypes.has(n.type))
    .map(n => ({ ...n, connections: connectionCount.get(n.id) || 0 }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, maxNodes);

  const visibleIds = new Set(filtered.map(n => n.id));
  visibleNodes = filtered;
  visibleEdges = graphData.edges.filter(
    e => enabledEdgeTypes.has(e.type) && visibleIds.has(e.source) && visibleIds.has(e.target)
  );

  // Build lookup for rendering
  visibleNodes._map = new Map(visibleNodes.map(n => [n.id, n]));

  document.getElementById('stat-nodes').textContent = `${visibleNodes.length} nodes`;
  document.getElementById('stat-edges').textContent = `${visibleEdges.length} edges`;

  startSimulation();
}

// --- Force Simulation ---
function startSimulation() {
  if (simulation) cancelAnimationFrame(simulation);

  const nodeMap = visibleNodes._map || new Map(visibleNodes.map(n => [n.id, n]));
  let alpha = 1;
  let ticks = 0;

  function tick() {
    alpha *= 0.995;
    if (alpha < 0.001 || ticks > 500) {
      render();
      return;
    }
    ticks++;

    // Center gravity
    for (const node of visibleNodes) {
      node.vx -= node.x * 0.001 * alpha;
      node.vy -= node.y * 0.001 * alpha;
    }

    // Repulsion (Barnes-Hut approximation — simplified)
    for (let i = 0; i < visibleNodes.length; i++) {
      for (let j = i + 1; j < visibleNodes.length; j++) {
        const a = visibleNodes[i];
        const b = visibleNodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const repulsion = 800 * alpha / (dist * dist);
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Attraction (edges)
    for (const edge of visibleEdges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = 0.05 * alpha;
      const idealDist = 100;
      const force = (dist - idealDist) * strength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Apply velocities with damping
    for (const node of visibleNodes) {
      if (node === draggedNode) continue;
      node.vx *= 0.6;
      node.vy *= 0.6;
      node.x += node.vx;
      node.y += node.vy;
    }

    render();
    simulation = requestAnimationFrame(tick);
  }

  simulation = requestAnimationFrame(tick);
}

// --- Rendering ---
function render() {
  const w = canvas.width;
  const h = canvas.height;
  const showLabels = document.getElementById('show-labels').checked;
  const showArrows = document.getElementById('show-arrows').checked;
  const nodeMap = visibleNodes._map || new Map(visibleNodes.map(n => [n.id, n]));

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Apply camera transform
  ctx.translate(w / 2 + camera.x, h / 2 + camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // Draw edges
  for (const edge of visibleEdges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);

    // Highlight edges connected to hovered/selected node
    const isHighlighted = hoveredNode && (edge.source === hoveredNode.id || edge.target === hoveredNode.id);
    const isSelected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

    if (isHighlighted || isSelected) {
      ctx.strokeStyle = (EDGE_COLORS[edge.type] || '#ffffff44').replace(/44$/, 'cc');
      ctx.lineWidth = 2 / camera.zoom;
    } else {
      ctx.strokeStyle = EDGE_COLORS[edge.type] || '#ffffff22';
      ctx.lineWidth = 0.5 / camera.zoom;
    }
    ctx.stroke();

    // Draw arrow
    if (showArrows && (isHighlighted || isSelected)) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const arrowLen = 8 / camera.zoom;
        const endX = target.x - (dx / dist) * target.radius;
        const endY = target.y - (dy / dist) * target.radius;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLen * Math.cos(angle - 0.4), endY - arrowLen * Math.sin(angle - 0.4));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLen * Math.cos(angle + 0.4), endY - arrowLen * Math.sin(angle + 0.4));
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  for (const node of visibleNodes) {
    const isHovered = hoveredNode === node;
    const isSelected = selectedNode === node;
    const baseColor = NODE_COLORS[node.type] || '#ffffff';

    // Glow for hovered/selected
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = baseColor + '44';
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered || isSelected ? baseColor : baseColor + 'cc';
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected ? '#ffffff' : baseColor;
    ctx.lineWidth = isSelected ? 2 / camera.zoom : 0.5 / camera.zoom;
    ctx.stroke();

    // Label
    if (showLabels && (camera.zoom > 0.5 || isHovered || isSelected || node.radius > 10)) {
      const fontSize = Math.max(9, Math.min(13, 11 / camera.zoom));
      ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isHovered || isSelected ? '#ffffff' : '#ccccdd';

      const label = truncate(node.label, 30);
      const labelY = node.y + node.radius + 3;
      // Text shadow for readability
      ctx.strokeStyle = '#0d0d1a';
      ctx.lineWidth = 3 / camera.zoom;
      ctx.strokeText(label, node.x, labelY);
      ctx.fillText(label, node.x, labelY);
    }
  }

  ctx.restore();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

// --- Interaction ---
function screenToWorld(sx, sy) {
  return {
    x: (sx - canvas.width / 2 - camera.x) / camera.zoom,
    y: (sy - canvas.height / 2 - camera.y) / camera.zoom,
  };
}

function findNodeAt(wx, wy) {
  // Reverse order so topmost (last drawn) is found first
  for (let i = visibleNodes.length - 1; i >= 0; i--) {
    const n = visibleNodes[i];
    const dx = n.x - wx;
    const dy = n.y - wy;
    if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) {
      return n;
    }
  }
  return null;
}

function onWheel(e) {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const newZoom = Math.max(0.05, Math.min(10, camera.zoom * factor));

  // Zoom toward cursor position
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const wx = mx - canvas.width / 2 - camera.x;
  const wy = my - canvas.height / 2 - camera.y;

  camera.x -= wx * (newZoom / camera.zoom - 1);
  camera.y -= wy * (newZoom / camera.zoom - 1);
  camera.zoom = newZoom;
  render();
}

function onMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const world = screenToWorld(mx, my);
  const node = findNodeAt(world.x, world.y);

  if (node) {
    draggedNode = node;
    canvas.style.cursor = 'grabbing';
  } else {
    isDragging = true;
    dragStart = { x: e.clientX - camera.x, y: e.clientY - camera.y };
    canvas.style.cursor = 'grabbing';
  }
}

function onMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const world = screenToWorld(mx, my);

  if (draggedNode) {
    draggedNode.x = world.x;
    draggedNode.y = world.y;
    draggedNode.vx = 0;
    draggedNode.vy = 0;
    render();
    return;
  }

  if (isDragging) {
    camera.x = e.clientX - dragStart.x;
    camera.y = e.clientY - dragStart.y;
    render();
    return;
  }

  // Hover detection
  const node = findNodeAt(world.x, world.y);
  if (node !== hoveredNode) {
    hoveredNode = node;
    canvas.style.cursor = node ? 'pointer' : 'grab';

    if (node) {
      showTooltip(e.clientX, e.clientY, node);
    } else {
      hideTooltip();
    }
    render();
  } else if (node) {
    moveTooltip(e.clientX, e.clientY);
  }
}

function onMouseUp(e) {
  if (draggedNode) {
    // If it was just a click (no significant drag), select the node
    draggedNode = null;
  }
  if (isDragging) {
    isDragging = false;
  }
  canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
}

function onDblClick(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const world = screenToWorld(mx, my);
  const node = findNodeAt(world.x, world.y);

  if (node) {
    selectedNode = node;
    showDetailPanel(node);
    render();
  } else {
    selectedNode = null;
    hideDetailPanel();
    render();
  }
}

// --- Tooltip ---
function showTooltip(x, y, node) {
  const el = document.getElementById('tooltip');
  let html = `<span class="result-type ${node.type}">${node.type}</span> `;
  html += `<strong>${truncate(node.label, 60)}</strong>`;
  if (node.type === 'Page') html += `<br>${node.domain} &middot; ${node.visitCount} visits`;
  if (node.type === 'Entity') html += `<br>${node.entityType} &middot; ${node.mentions} mentions`;
  if (node.type === 'Topic') html += `<br>score: ${(node.score || 0).toFixed(3)}`;
  el.innerHTML = html;
  el.classList.remove('hidden');
  moveTooltip(x, y);
}

function moveTooltip(x, y) {
  const el = document.getElementById('tooltip');
  el.style.left = (x + 14) + 'px';
  el.style.top = (y + 14) + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').classList.add('hidden');
}

// --- Detail Panel ---
function showDetailPanel(node) {
  const panel = document.getElementById('detail-panel');
  const nodeMap = visibleNodes._map || new Map(visibleNodes.map(n => [n.id, n]));

  document.getElementById('detail-title').textContent = node.label;

  const typeEl = document.getElementById('detail-type');
  typeEl.innerHTML = `<span class="result-type ${node.type}">${node.type}</span>`;
  if (node.type === 'Entity') typeEl.innerHTML += ` ${node.entityType}`;

  // Body
  const body = document.getElementById('detail-body');
  let bodyHtml = '';
  if (node.type === 'Page') {
    bodyHtml = `
      <a href="${node.url}" target="_blank">${truncate(node.url, 60)}</a><br>
      Domain: ${node.domain}<br>
      Visits: ${node.visitCount}<br>
      First: ${node.firstVisited ? new Date(node.firstVisited).toLocaleDateString() : 'N/A'}<br>
      Last: ${node.lastVisited ? new Date(node.lastVisited).toLocaleDateString() : 'N/A'}
    `;
  } else if (node.type === 'Entity') {
    bodyHtml = `
      Type: ${node.entityType}<br>
      Mentions: ${node.mentions}<br>
      ${node.aliases?.length > 1 ? 'Aliases: ' + node.aliases.join(', ') : ''}
    `;
  } else if (node.type === 'Topic') {
    bodyHtml = `Score: ${(node.score || 0).toFixed(4)}`;
  }
  body.innerHTML = bodyHtml;

  // Connections
  const conns = document.getElementById('detail-connections');
  const connected = visibleEdges
    .filter(e => e.source === node.id || e.target === node.id)
    .map(e => {
      const otherId = e.source === node.id ? e.target : e.source;
      const other = nodeMap.get(otherId);
      return { edge: e, other };
    })
    .filter(c => c.other);

  // Group by edge type
  const grouped = new Map();
  for (const c of connected) {
    if (!grouped.has(c.edge.type)) grouped.set(c.edge.type, []);
    grouped.get(c.edge.type).push(c);
  }

  let connHtml = '';
  for (const [type, items] of grouped) {
    connHtml += `<h4>${type} (${items.length})</h4>`;
    for (const item of items.slice(0, 15)) {
      connHtml += `<div class="conn-item" data-id="${item.other.id}">
        <span class="result-type ${item.other.type}">${item.other.type[0]}</span>
        ${truncate(item.other.label, 40)}
      </div>`;
    }
    if (items.length > 15) connHtml += `<div class="conn-item" style="color:#6a6a8a">...and ${items.length - 15} more</div>`;
  }
  conns.innerHTML = connHtml || '<p style="color:#6a6a8a">No visible connections</p>';

  // Click on connection items to navigate
  conns.querySelectorAll('.conn-item[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      const targetNode = nodeMap.get(el.dataset.id);
      if (targetNode) {
        selectedNode = targetNode;
        // Pan camera to node
        camera.x = -targetNode.x * camera.zoom;
        camera.y = -targetNode.y * camera.zoom;
        showDetailPanel(targetNode);
        render();
      }
    });
  });

  panel.classList.remove('hidden');
}

function hideDetailPanel() {
  document.getElementById('detail-panel').classList.add('hidden');
}

// --- Controls ---
function setupControls() {
  // Filter checkboxes
  document.querySelectorAll('[data-node], [data-edge]').forEach(cb => {
    cb.addEventListener('change', () => {
      applyFilters();
      render();
    });
  });

  // Max nodes slider
  const slider = document.getElementById('max-nodes');
  const sliderVal = document.getElementById('max-nodes-val');
  slider.addEventListener('input', () => {
    sliderVal.textContent = slider.value;
  });
  slider.addEventListener('change', () => {
    applyFilters();
  });

  // Show labels / arrows
  document.getElementById('show-labels').addEventListener('change', render);
  document.getElementById('show-arrows').addEventListener('change', render);

  // Reset view
  document.getElementById('btn-reset-view').addEventListener('click', () => {
    camera = { x: 0, y: 0, zoom: 1 };
    render();
  });

  // Refresh data
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    await loadData();
    render();
  });

  // Detail close
  document.getElementById('detail-close').addEventListener('click', () => {
    selectedNode = null;
    hideDetailPanel();
    render();
  });

  // Search
  setupSearch();
}

// --- Search ---
function setupSearch() {
  const input = document.getElementById('search');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      results.classList.add('hidden');
      return;
    }

    const matches = visibleNodes
      .filter(n => n.label.toLowerCase().includes(query) || (n.url && n.url.toLowerCase().includes(query)))
      .slice(0, 20);

    if (matches.length === 0) {
      results.classList.add('hidden');
      return;
    }

    results.innerHTML = matches.map(n =>
      `<div class="result-item" data-id="${n.id}">
        <span class="result-type ${n.type}">${n.type}</span>
        ${truncate(n.label, 50)}
      </div>`
    ).join('');

    results.classList.remove('hidden');

    results.querySelectorAll('.result-item').forEach(el => {
      el.addEventListener('click', () => {
        const node = (visibleNodes._map || new Map(visibleNodes.map(n => [n.id, n]))).get(el.dataset.id);
        if (node) {
          selectedNode = node;
          camera.x = -node.x * camera.zoom;
          camera.y = -node.y * camera.zoom;
          showDetailPanel(node);
          render();
        }
        results.classList.add('hidden');
        input.value = '';
      });
    });
  });

  // Close search on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-box')) {
      results.classList.add('hidden');
    }
  });

  // Close on Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      results.classList.add('hidden');
      input.blur();
    }
  });
}
