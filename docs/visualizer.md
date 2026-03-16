# Graph Visualizer

The graph visualizer is a full-page interactive view of your knowledge graph, rendered on a Canvas-based force-directed layout with zero external dependencies.

## Opening the Visualizer

From the popup dashboard, click **"Open Graph Visualizer"**. This opens a new browser tab with the full graph view.

You must run extraction at least once before opening the visualizer — it reads from the IndexedDB graph built during extraction.

## Interface Overview

```
+--[Toolbar]---------------------------------------------------+
|  ZEN History Graph  [  Search nodes...  ]     234 nodes  567 edges |
+--[Sidebar]--+------------------------------------------------+
|  Node Types |                                                |
|  [x] Pages  |                                                |
|  [x] Entities|           Force-directed graph                |
|  [x] Topics |           rendered on Canvas                   |
|             |                                                |
|  Edge Types |                                                |
|  [x] Mentions|                                               |
|  [x] About  |                                                |
|  ...        |                                                |
|             |                                                |
|  Display    |                                                |
|  Max nodes  |                                                |
|  [====500]  |                                                |
|  [x] Labels |                                                |
|  [ ] Arrows |                                                |
|             |                                                |
|  [Reset View]                                                |
|  [Refresh]  |                                                |
+-------------+------------------------------------------------+
```

## Navigation

| Action | How |
|--------|-----|
| **Pan** | Click and drag on empty space |
| **Zoom** | Scroll wheel (zooms toward cursor) |
| **Move a node** | Click and drag a node |
| **Hover** | Move cursor over a node to see tooltip |
| **Select** | Double-click a node to open detail panel |
| **Deselect** | Double-click empty space, or click X on detail panel |

## Node Types

Nodes are color-coded and sized by importance:

| Type | Color | Size based on |
|------|-------|---------------|
| **Page** | Blue | Visit count |
| **Entity** | Purple | Mention count |
| **Topic** | Green | TF-IDF score |

## Edge Types

| Type | What it represents |
|------|--------------------|
| **MENTIONS** | A page's title/URL references an entity |
| **ABOUT** | A page is associated with a topic (via TF-IDF) |
| **LINKS_TO** | User navigated from one page to another (link transition) |
| **TEMPORAL** | Two pages were visited within 10 minutes of each other |
| **SAME_DOMAIN** | Two pages are on the same domain |
| **RELATED_TO** | Two entities or topics co-occur on 5+ pages |

Edges are drawn as lines between nodes. When you hover or select a node, its connected edges are highlighted.

## Sidebar Controls

### Node Types

Toggle which node types are visible. Uncheck "Pages" to see only the entity-topic relationship network, for example.

### Edge Types

Toggle which edge types are drawn. **SAME_DOMAIN** is off by default because it can create very dense clusters — enable it when exploring domain-specific patterns.

### Max Nodes

Slider from 50 to 2000. Controls how many nodes are displayed. Nodes are ranked by connection count — the most connected nodes are shown first. Lower values give a cleaner, faster view. Higher values show more of the graph.

### Show Labels

Toggle text labels on nodes. Labels auto-hide at low zoom levels for performance — only important (large) nodes keep their labels visible when zoomed out.

### Show Arrows

Toggle directional arrows on edges. Only shown on highlighted edges (hovered or selected node's connections) to reduce visual clutter.

## Search

Type in the search box to find nodes by name or URL. Results appear in a dropdown — click a result to:

1. Center the camera on that node
2. Select it (opens the detail panel)

Press **Escape** to close the search results.

## Detail Panel

Double-click a node to open the detail panel on the right side. It shows:

- **Node name and type**
- **Properties**: URL, domain, visit count (pages), mention count (entities), score (topics)
- **Connections**: Grouped by edge type, showing connected nodes

Click any connection in the list to navigate to that node — the camera pans to it and the detail panel updates.

## Performance Tips

- **Start with 200-300 max nodes** for smooth interaction
- **Disable SAME_DOMAIN edges** if the graph is too dense
- **Turn off labels** when exploring large graphs
- **Use search** to jump to specific nodes instead of scrolling
- The force simulation settles after a few seconds — nodes stop moving once the layout stabilizes
