/* Beam search on a state-space graph: keep the w best nodes (by h) at every level. */
Studio.register({
  id: "search-beam",
  name: "Beam Search",
  family: "Graph search · informed",
  week: 3,
  problem: "graph",
  order: 57,
  summary: "Generate the children of every node in the beam and keep only the w best by h. Memory is bounded by w; a narrow beam can discard the only way to the goal.",
  pseudocode: `OPEN ← [start]
while goal not in OPEN
    children ← MoveGen of every node in OPEN, minus nodes seen before
    if children is empty: return failure
    OPEN ← the w best of children by h
return the goal's path`,
  complexity: "Per level: w × b evaluations; memory O(w · depth) with parent pointers",
  learn: {
    "intro": "Beam search is breadth-first search on a diet: at every level it keeps only the w most promising nodes by h and forgets the rest. A wider beam is safer, a narrower one is cheaper.",
    "definition": "Level by level, generate the children of every node in the beam, discard those seen before, and keep the w with the smallest h. Succeed when the goal enters the beam; fail when no new children remain.",
    "steps": [
      [
        "OPEN ← [start]",
        ""
      ],
      [
        "children ← MoveGen of every node in the beam",
        "Nodes seen earlier are dropped (graph search)."
      ],
      [
        "OPEN ← w best children by h",
        "Everything else is discarded for good: beam search cannot backtrack to it."
      ],
      [
        "goal in OPEN → done",
        ""
      ]
    ],
    "formulas": [
      {
        "f": "memory ≤ w per level",
        "read": "the beam width bounds the frontier",
        "why": "That is the whole point: predictable memory. w = 1 is hill climbing that may move uphill; w = ∞ is breadth-first search."
      }
    ],
    "why": "Keeps several alternatives alive, so one bad estimate does not end the search, but anything outside the beam is lost forever.",
    "traps": [
      "Beam search is incomplete: the only path to the goal can fall outside the beam.",
      "Ties in h decide which nodes survive."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "O(w · b · d)",
      "space": "O(w · d)"
    }
  },
  params: [{ key: "w", label: "Beam width w", type: "int", default: 2, min: 1, max: 8 }],
  run(P, { w }) {
    const steps = [], parent = { [P.start]: null }, seen = new Set([P.start]);
    let OPEN = [P.start], level = 0;
    const rows = [[0, "–", P.start]];
    const pathTo = x => { const p = []; while (x) { p.unshift(x); x = parent[x]; } return p; };
    const snap = (cap, extra = {}) => {
      const states = {}; seen.forEach(s => (states[s] = "closed")); OPEN.forEach(o => (states[o] = "open"));
      steps.push(Object.assign({ caption: cap, nodes: Studio.gs.nodes(P, states, Object.fromEntries(P.ids.map(i => [i, P.h[i]]))),
        edges: Studio.gs.edges(P, [], Object.keys(parent).filter(k => parent[k]).map(k => ({ u: parent[k], v: k, state: "tree" }))),
        lists: [{ label: "BEAM", items: OPEN.map(o => ({ text: `(${o},${parent[o] ?? "nil"},h=${P.h[o]})`, state: "open" })) }],
        table: { title: `beam width ${w}`, columns: ["level", "generated", "kept"], rows: rows.slice(), rowStates: rows.map((_, i) => (i === rows.length - 1 ? "cur" : "")) } }, extra));
    };
    snap(`Level 0: beam = [${P.start}]`);
    while (!OPEN.includes(P.goal)) {
      const kids = [];
      OPEN.forEach(n => P.adj[n].forEach(([c]) => { if (!seen.has(c) && !kids.includes(c)) { kids.push(c); parent[c] = n; } }));
      kids.forEach(k => seen.add(k));
      if (!kids.length) { snap(`Level ${level + 1}: no new children — beam search fails`, {}); return { steps, result: { found: false, expanded: seen.size } }; }
      kids.sort((a, b) => P.h[a] - P.h[b] || (a < b ? -1 : 1));
      const kept = kids.slice(0, w), dropped = kids.slice(w);
      level++;
      rows.push([level, kids.map(k => `${k}:${P.h[k]}`).join(" "), kept.join(",") + (dropped.length ? `  (dropped ${dropped.join(",")})` : "")]);
      OPEN = kept;
      snap(`Level ${level}: ${kids.length} new children, keep the ${kept.length} with smallest h${dropped.length ? `; ${dropped.join(", ")} discarded for good` : ""}`);
    }
    const path = pathTo(P.goal), cost = Studio.gs.pathCost(P, path);
    snap(`Goal ${P.goal} is in the beam: path ${path.join(" – ")}, cost ${cost}`, { nodes: Studio.gs.nodes(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path) });
    return { steps, result: { found: true, path, cost, expanded: seen.size } };
  },
});
