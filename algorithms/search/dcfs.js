/* Divide and Conquer Frontier Search: best-first search that stores only OPEN (no CLOSED), keeps a relay node
 * near the middle of each path, and recovers the path by solving start→relay and relay→goal recursively. */
Studio.register({
  id: "search-dcfs",
  name: "Divide & Conquer Frontier Search",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 80,
  summary: "Frontier search drops CLOSED: each OPEN node remembers which neighbours already used an edge to it, so expanded nodes are never regenerated. A relay node halfway along each path lets the path be rebuilt by two smaller searches.",
  pseudocode: `DCFS(S, G):
    run frontier search from S to G           # OPEN only; each node keeps a 'used' set of neighbours
        each node carries relay = the first node on its path with g ≥ C/2   (C = estimate f(S))
    if G is next to S: return [S, G]
    R ← relay of G
    return DCFS(S, R) ++ DCFS(R, G)       # (dropping the repeated R)`,
  complexity: "Memory: the frontier only; time: a few times one frontier search (geometric recursion)",
  learn: {
    "intro": "Most of A*'s memory is the CLOSED list, kept only to avoid regenerating expanded nodes and to rebuild the path. Frontier search drops CLOSED altogether; Divide and Conquer Frontier Search then rebuilds the path from a node remembered halfway along it.",
    "definition": "Run best-first search keeping only OPEN. Each OPEN node records which neighbours already used an edge into it, so expanded nodes are never regenerated. Each node also carries a relay node from the middle of its path. Once the goal is reached, solve start→relay and relay→goal the same way, recursively.",
    "steps": [
      [
        "OPEN only, with 'used' edge sets",
        "Instead of CLOSED, the frontier node remembers the edges already used."
      ],
      [
        "relay ← first node with g ≥ C/2",
        "C is estimated as f(start)."
      ],
      [
        "solve start→relay and relay→goal",
        "Each half is a smaller problem; the recursion rebuilds the full path."
      ]
    ],
    "formulas": [
      {
        "f": "memory ≈ |frontier|, not |frontier| + |expanded|",
        "read": "only the boundary of the search is stored",
        "why": "For grid-like spaces (such as sequence alignment) the frontier is much smaller than the expanded region."
      }
    ],
    "why": "Trades extra time (the recursive searches) for a large memory saving. It is the basis of memory-efficient sequence alignment.",
    "traps": [
      "Frontier search alone gives the cost, not the path: the relay recursion recovers it.",
      "The 'used' bookkeeping is what replaces the CLOSED check."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes with admissible h",
      "time": "a small multiple of one search",
      "space": "frontier only"
    }
  },
  params: [],
  run(P) {
    const steps = [], log = [];
    let peak = 0, totalExp = 0;
    const solve = (s, g, depth, useH) => {
      const h = id => (useH ? P.h[id] : 0);
      const est = useH ? h(s) : 0;
      const OPEN = new Map([[s, { id: s, g: 0, used: new Set(), relay: null, cnt: 0, parent: null }]]);
      let found = null, exp = 0;
      while (OPEN.size) {
        let N = null; for (const x of OPEN.values()) if (!N || x.g + h(x.id) < N.g + h(N.id) || (x.g + h(x.id) === N.g + h(N.id) && x.id < N.id)) N = x;
        OPEN.delete(N.id);
        if (N.id === g) { found = N; break; }
        exp++;
        for (const [c, w] of P.adj[N.id]) {
          if (N.used.has(c)) continue;
          const g2 = N.g + w;
          let relay = N.relay;
          const half = (useH ? est : 0) / 2;
          if (!relay && (useH ? g2 >= half : false)) relay = c;
          const old = OPEN.get(c);
          if (old) { old.used.add(N.id); if (g2 < old.g) { old.g = g2; old.relay = relay; old.cnt = N.cnt + 1; old.parent = N.id; } }
          else OPEN.set(c, { id: c, g: g2, used: new Set([N.id]), relay, cnt: N.cnt + 1, parent: N.id });
        }
        peak = Math.max(peak, OPEN.size);
        const states = {}; for (const k of OPEN.keys()) states[k] = "open"; states[N.id] = "current"; states[s] = states[s] || "start"; states[g] = states[g] || "goalcand";
        steps.push({ caption: `${"· ".repeat(depth)}search ${s}→${g}: expand ${N.id} (g=${N.g}); OPEN keeps ${OPEN.size} nodes and no CLOSED list`,
          nodes: Studio.gs.nodes(P, states, Object.fromEntries([...OPEN.values()].map(x => [x.id, x.g]))), edges: Studio.gs.edges(P),
          lists: [{ label: "OPEN", items: [...OPEN.values()].map(x => ({ text: `(${x.id}, g=${x.g}, used {${[...x.used].join(",")}}${x.relay ? ", relay " + x.relay : ""})`, state: "open" })) }],
          table: { title: "sub-problems", columns: ["level", "search", "result"], rows: log.map(l => l.slice()) }, stats: [{ label: "OPEN", value: OPEN.size }, { label: "peak memory", value: peak }] });
      }
      totalExp += exp;
      if (!found) { log.push([depth, `${s}→${g}`, "no path"]); return null; }
      const C = found.g;
      // (each frontier node stores only its immediate predecessor, used as a last-resort relay)
      // midpoint relay: with h the relay was set at g ≥ f(S)/2; without h, rerun picking the node on the path with g closest to C/2
      let R = found.relay;
      if (!R || R === s || R === g) {
        if (found.cnt <= 1) { log.push([depth, `${s}→${g}`, `adjacent, cost ${C}`]); return [s, g]; }
        // fallback: second search marking relays at C/2 now that C is known
        const OP2 = new Map([[s, { id: s, g: 0, used: new Set(), relay: null, parent: null }]]); let f2 = null;
        while (OP2.size) {
          let N = null; for (const x of OP2.values()) if (!N || x.g < N.g || (x.g === N.g && x.id < N.id)) N = x;
          OP2.delete(N.id); if (N.id === g) { f2 = N; break; }
          for (const [c, w] of P.adj[N.id]) { if (N.used.has(c)) continue; const g2 = N.g + w; let relay = N.relay; if (!relay && g2 >= C / 2 && c !== g) relay = c;
            const old = OP2.get(c); if (old) { old.used.add(N.id); if (g2 < old.g) { old.g = g2; old.relay = relay; old.parent = N.id; } } else OP2.set(c, { id: c, g: g2, used: new Set([N.id]), relay, parent: N.id }); }
        }
        R = f2 && f2.relay;
        if (!R || R === s || R === g) R = found.parent; // the goal's predecessor is always an interior node here
      }
      log.push([depth, `${s}→${g}`, `cost ${C}, relay ${R}`]);
      const left = solve(s, R, depth + 1, false), right = solve(R, g, depth + 1, false);
      if (!left || !right) return null;
      return left.concat(right.slice(1));
    };
    const path = solve(P.start, P.goal, 0, true);
    if (!path) { steps.push({ caption: "No path to the goal", nodes: Studio.gs.nodes(P), edges: Studio.gs.edges(P) }); return { steps, result: { found: false, expanded: totalExp } }; }
    const cost = Studio.gs.pathCost(P, path);
    steps.push({ caption: `Path rebuilt from relays: ${path.join(" – ")}, cost ${cost}. Peak OPEN size ${peak} (no CLOSED list stored)`,
      nodes: Studio.gs.nodes(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      table: { title: "sub-problems", columns: ["level", "search", "result"], rows: log }, stats: [{ label: "path cost", value: cost, state: "ok" }, { label: "peak OPEN", value: peak }] });
    return { steps, result: { found: true, path, cost, expanded: totalExp } };
  },
});
