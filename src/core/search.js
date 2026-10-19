/* State-space search engine shared by BFS, DFS, DFID, UCS, best-first and A*.
 * Course notation: OPEN and CLOSED hold node pairs (N, parent, depth) or (N, parent, g).
 * Graph search: a child already on OPEN or CLOSED is not added again (except when a
 * cheaper path is found by UCS / A*, which update the pair and say so).
 */
(function (root) {
  "use strict";
  const Studio = root.Studio;

  function tieKey(mode) {
    // returns comparator for equal priority: alphabetical, FIFO (older first) or LIFO (newer first)
    if (mode === "fifo") return (a, b) => a.seq - b.seq;
    if (mode === "lifo") return (a, b) => b.seq - a.seq;
    return (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.seq - b.seq);
  }

  Studio.search = {
    /* kind: "bfs" | "dfs" | "ucs" | "best" | "astar"; opts: {depthBound, tie, weight} */
    run(P, kind, opts = {}) {
      const steps = [];
      const start = P.start, goal = P.goal;
      const show = kind === "ucs" || kind === "astar" ? "g" : kind === "best" ? "h" : "depth";
      const W = opts.weight ?? 1;
      let seq = 0;
      const mk = (id, parent, depth, g) => ({ id, parent, depth, g, h: P.h[id] ?? 0, f: g + W * (P.h[id] ?? 0), seq: seq++ });
      let OPEN = [mk(start, null, 0, 0)];
      const CLOSED = [];
      const tree = [];
      const rows = [];
      const pairText = x => {
        const val = show === "g" ? x.g : show === "h" ? x.h : x.depth;
        return `(${x.id},${x.parent ?? "nil"},${val}${kind === "astar" ? ",f=" + fmt(x.f) : ""})`;
      };
      const fmt = v => (Math.round(v * 100) / 100).toString();
      const prio = x => (kind === "ucs" ? x.g : kind === "best" ? x.h : kind === "astar" ? x.f : 0);
      const cmp = tieKey(opts.tie || "alpha");
      const sortOpen = () => { if (["ucs", "best", "astar"].includes(kind)) OPEN.sort((a, b) => prio(a) - prio(b) || cmp(a, b)); };
      const snapshot = (cur, caption, extra = {}) => {
        const nodes = {};
        P.ids.forEach(id => (nodes[id] = { state: "plain" }));
        CLOSED.forEach(x => (nodes[x.id] = { state: "closed", badge: show === "h" ? x.h : show === "g" ? x.g : x.depth }));
        OPEN.forEach(x => (nodes[x.id] = { state: "open", badge: show === "h" ? x.h : show === "g" ? x.g : x.depth }));
        if (goal && nodes[goal].state === "plain") nodes[goal].state = "goalcand";
        if (cur) nodes[cur.id] = { state: "current", badge: show === "h" ? cur.h : show === "g" ? cur.g : cur.depth };
        const edges = P.edges.map(([u, v, w]) => ({ u, v, state: "faint", label: w, directed: P.directed }));
        tree.forEach(([u, v]) => { const e = edges.find(e => (e.u === u && e.v === v) || (!P.directed && e.u === v && e.v === u)); if (e) e.state = "tree"; });
        if (extra.path) {
          for (let i = 0; i + 1 < extra.path.length; i++) {
            const e = edges.find(e => (e.u === extra.path[i] && e.v === extra.path[i + 1]) || (!P.directed && e.u === extra.path[i + 1] && e.v === extra.path[i]));
            if (e) e.state = "path";
          }
          extra.path.forEach(id => (nodes[id] = Object.assign({}, nodes[id], { state: id === goal ? "goal" : "path" })));
        }
        const cols = ["#", "expand", "children", "added to OPEN", "OPEN size"];
        steps.push({
          caption,
          nodes, edges,
          lists: [
            { label: "OPEN", items: OPEN.map(x => ({ text: pairText(x), state: "open" })) },
            { label: "CLOSED", items: CLOSED.slice().reverse().map(x => ({ text: pairText(x), state: "closed" })) },
          ],
          table: { title: kind === "dfs" && opts.depthBound != null ? `depth bound ${opts.depthBound}` : "expansions", columns: cols, rows: rows.map(r => r.cells), rowStates: rows.map((r, i) => (i === rows.length - 1 && !extra.final ? "cur" : r.state || "")) },
          stats: [{ label: "expanded", value: CLOSED.length }, { label: "OPEN", value: OPEN.length }].concat(extra.stats || []),
        });
      };
      snapshot(null, `OPEN ← [(${start},nil,0)], CLOSED ← [ ]`);
      while (OPEN.length) {
        const N = kind === "dfs" ? OPEN.shift() : OPEN.shift(); // DFS keeps OPEN as a stack (children prepended)
        if (goal && N.id === goal) {
          CLOSED.push(N);
          const path = []; let x = N;
          const byId = id => CLOSED.find(c => c.id === id);
          while (x) { path.unshift(x.id); x = x.parent ? byId(x.parent) : null; }
          rows.push({ cells: [CLOSED.length, N.id, "goal test succeeds", "", OPEN.length], state: "ok" });
          const cost = N.g;
          snapshot(null, `Goal ${goal} picked from OPEN: path ${path.join(" – ")}, cost ${cost}, ${CLOSED.length} nodes expanded`, { path, final: true, stats: [{ label: "path cost", value: cost, state: "ok" }] });
          return { steps, result: { found: true, path, cost, expanded: CLOSED.length } };
        }
        CLOSED.push(N);
        const kids = [];
        const added = [];
        const notes = [];
        for (const [c, w] of P.adj[N.id]) {
          if (opts.depthBound != null && N.depth + 1 > opts.depthBound) break;
          const g = N.g + w;
          const inOpen = OPEN.find(x => x.id === c), inClosed = CLOSED.find(x => x.id === c);
          kids.push(c);
          if (!inOpen && !inClosed) { const k = mk(c, N.id, N.depth + 1, g); added.push(k); tree.push([N.id, c]); }
          else if ((kind === "ucs" || kind === "astar") && g < (inOpen || inClosed).g) {
            const old = inOpen || inClosed;
            notes.push(`${c}: cheaper path via ${N.id} (g ${old.g} → ${g})`);
            const ti = tree.findIndex(([, v]) => v === c); if (ti >= 0) tree.splice(ti, 1); tree.push([N.id, c]);
            old.parent = N.id; old.g = g; old.depth = N.depth + 1; old.f = g + W * old.h;
            if (inClosed) { CLOSED.splice(CLOSED.indexOf(inClosed), 1); OPEN.push(inClosed); notes[notes.length - 1] += ", reopened"; }
          }
        }
        if (kind === "dfs") OPEN = added.concat(OPEN); else OPEN = OPEN.concat(added);
        sortOpen();
        rows.push({ cells: [CLOSED.length, N.id, kids.join(",") || "–", added.map(a => a.id).join(",") || "–", OPEN.length] });
        const dbNote = opts.depthBound != null && N.depth >= opts.depthBound ? ` (depth bound ${opts.depthBound} reached: no children)` : "";
        snapshot(N, `Expand ${N.id}: ${added.length ? "add " + added.map(a => a.id).join(", ") + " to OPEN" : "no new children"}${dbNote}${notes.length ? "; " + notes.join("; ") : ""}`);
      }
      snapshot(null, `OPEN is empty: no path to ${goal || "a goal"}${opts.depthBound != null ? " within depth " + opts.depthBound : ""}`, { final: true });
      return { steps, result: { found: false, expanded: CLOSED.length } };
    },
  };

  /* Start tours for perturbative methods */
  Studio.tsp.startTour = function (P, spec, seed) {
    const ids = P.ids.slice();
    if (!spec || spec === "alphabetical") return ids;
    if (spec === "random") return [ids[0]].concat(Studio.rng(seed || 1).shuffle(ids.slice(1)));
    if (spec === "nn") {
      const t = [ids[0]];
      while (t.length < ids.length) { const c = t[t.length - 1]; t.push(ids.filter(x => !t.includes(x)).sort((a, b) => P.d(c, a) - P.d(c, b) || (a < b ? -1 : 1))[0]); }
      return t;
    }
    if (spec === "greedy") {
      const deg = Object.fromEntries(ids.map(c => [c, 0])), par = Object.fromEntries(ids.map(c => [c, c])), chosen = [];
      const find = x => (par[x] === x ? x : (par[x] = find(par[x])));
      const E = []; ids.forEach((a, i) => ids.slice(i + 1).forEach(b => E.push([P.d(a, b), a, b])));
      E.sort((x, y) => x[0] - y[0] || (x[1] + x[2] < y[1] + y[2] ? -1 : 1));
      for (const [, a, b] of E) {
        if (chosen.length === ids.length) break;
        if (deg[a] === 2 || deg[b] === 2) continue;
        if (find(a) === find(b) && chosen.length < ids.length - 1) continue;
        chosen.push([a, b]); deg[a]++; deg[b]++; par[find(a)] = find(b);
      }
      return Studio.tsp.edgesToTour(ids, chosen, ids[0]);
    }
    const t = String(spec).split(/[\s,]+/).filter(Boolean);
    if (t.length !== ids.length || new Set(t).size !== ids.length || t.some(c => !ids.includes(c))) throw new Error(`Start tour "${spec}" must list every city exactly once`);
    return t;
  };
  Studio.tsp.edgesToTour = function (ids, edges, start) {
    const adj = Object.fromEntries(ids.map(c => [c, []]));
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    const t = [start]; let prev = null, cur = start, nxt = adj[start].slice().sort()[0];
    while (t.length < ids.length) { t.push(nxt); prev = cur; cur = nxt; nxt = adj[cur].find(x => x !== prev); }
    return t;
  };
  Studio.tsp.startParam = { key: "start", label: "Start tour", type: "select", default: "greedy",
    options: [["greedy", "Greedy tour"], ["nn", "Nearest-neighbour tour"], ["alphabetical", "A, B, C, … in order"], ["random", "Random (uses seed)"]],
    help: "Or type a tour such as A,C,D,F,B,E", allowText: true };
})(typeof window !== "undefined" ? window : globalThis);

/* Small helpers for custom graph-search tracers */
(function (root) {
  "use strict";
  const Studio = root.Studio;
  Studio.gs = {
    nodes(P, states = {}, badges = {}) { const n = {}; P.ids.forEach(id => (n[id] = { state: states[id] || "plain", badge: badges[id] })); return n; },
    edges(P, path = [], extra = []) {
      const E = P.edges.map(([u, v, w]) => ({ u, v, state: "faint", label: w, directed: P.directed }));
      for (let i = 0; i + 1 < path.length; i++) { const e = E.find(e => (e.u === path[i] && e.v === path[i + 1]) || (!P.directed && e.u === path[i + 1] && e.v === path[i])); if (e) e.state = "path"; }
      extra.forEach(x => { const e = E.find(e => (e.u === x.u && e.v === x.v) || (!P.directed && e.u === x.v && e.v === x.u)); if (e) Object.assign(e, x, { u: e.u, v: e.v }); });
      return E;
    },
    pathCost(P, path) { let c = 0; for (let i = 0; i + 1 < path.length; i++) c += P.w(path[i], path[i + 1]); return c; },
    hstar(P, goal) { // true remaining cost by Dijkstra from the goal (reverse edges for directed graphs)
      const d = Object.fromEntries(P.ids.map(i => [i, Infinity])); d[goal] = 0; const Q = new Set(P.ids);
      const into = Object.fromEntries(P.ids.map(i => [i, []])); P.edges.forEach(([u, v, w]) => { into[v].push([u, w]); if (!P.directed) into[u].push([v, w]); });
      while (Q.size) { let u = null; for (const x of Q) if (u === null || d[x] < d[u]) u = x; Q.delete(u); for (const [v, w] of into[u]) if (d[u] + w < d[v]) d[v] = d[u] + w; }
      return d;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
