/* Dijkstra's algorithm as taught: WHITE / BLACK colouring and a relaxation table. */
Studio.register({
  id: "search-dijkstra",
  name: "Dijkstra's Algorithm",
  family: "Graph search · optimal",
  week: 5,
  problem: "graph",
  order: 41,
  defaultExample: "graph-dijkstra",
  summary: "Every node is WHITE (not final) or BLACK (shortest distance known). Repeatedly blacken the WHITE node with the least d and relax its edges. Stops when the goal turns BLACK.",
  pseudocode: `d(S) ← 0;  d(v) ← ∞ for the rest;  all nodes WHITE
repeat
    N ← WHITE node with least d(N)           # ties: alphabetical
    colour N BLACK
    if N = goal: return the path (follow parents)
    for each WHITE neighbour C of N with edge cost k:
        if d(N) + k < d(C):                  # relaxation
            d(C) ← d(N) + k;  parent(C) ← N
until no WHITE node has d < ∞              # goal unreachable`,
  complexity: "O(V²) with a plain scan; O((V+E) log V) with a heap",
  learn: {
    "intro": "Dijkstra's algorithm is Uniform Cost Search written as a table. Each node carries a best-known distance d. The WHITE node with the smallest d is made BLACK, and then its neighbours are checked to see whether going through it gives them a shorter distance.",
    "definition": "Colour every node WHITE and give it d = ∞, except the start with d = 0. Pick the WHITE node N with least d and colour it BLACK: its d is now the true shortest distance from the start. For each WHITE neighbour C of N with edge cost k, if d(N)+k < d(C) then set d(C) = d(N)+k and parent(C) = N (a relaxation). Stop when the goal is coloured BLACK, then follow the parents back to the start.",
    "steps": [
      ["d(S) = 0, all nodes WHITE", "Nothing is final yet."],
      ["pick the WHITE node with least d", "Ties go alphabetically. A pick is counted each time a node turns BLACK."],
      ["colour it BLACK", "Its distance can no longer improve, because every other WHITE node has d at least as large and costs are not negative."],
      ["relax its WHITE neighbours", "Replace d(C) when going through N is shorter, and record N as the parent."],
      ["stop when the goal is BLACK", "Read the path through the parents."]
    ],
    "formulas": [
      { "f": "d(N) + k(N,C) < d(C)  ⇒  d(C) ← d(N) + k(N,C)", "read": "relaxation", "why": "A shorter way to C through the newly final node N has been found, so C's estimate improves." },
      { "f": "pick argmin d over WHITE nodes", "read": "closest unfinished node", "why": "With non-negative costs no later path can reach it more cheaply, so it can be made BLACK." }
    ],
    "why": "It gives the shortest path to every node it blackens, and to the goal once the goal is picked. It is the same search as UCS: OPEN is the set of WHITE nodes with finite d, CLOSED is the BLACK set. It has no sense of direction, so it spreads in all directions.",
    "traps": [
      "Only WHITE neighbours are relaxed: a BLACK node is already final.",
      "Edge costs must not be negative; with negative edges a BLACK node could still improve.",
      "d of a node can change several times before it turns BLACK (for example G falling from 9 to 8): only the BLACK value is final.",
      "Count picks, not relaxations."
    ],
    "props": { "complete": "yes (finite graph)", "optimal": "yes (non-negative costs)", "time": "O(V²) or O(E log V)", "space": "O(V)" }
  },
  params: [],
  run(P) {
    const F = Studio.fmt, steps = [], INF = Infinity;
    const d = Object.fromEntries(P.ids.map(i => [i, INF])), par = Object.fromEntries(P.ids.map(i => [i, null]));
    const black = new Set(), relaxLog = [];
    d[P.start] = 0;
    let picks = 0, cur = null, lastNotes = [];
    const rowsFor = () => P.ids.map(i => [i, d[i] === INF ? "∞" : F(d[i]), par[i] ?? "–", black.has(i) ? "BLACK" : "WHITE"]);
    const snap = (cap, extra = {}) => {
      const st = {}, bd = {};
      P.ids.forEach(i => { st[i] = black.has(i) ? "closed" : d[i] < INF ? "open" : "plain"; if (d[i] < INF) bd[i] = F(d[i]); });
      if (cur) st[cur] = "current";
      const edges = Studio.gs.edges(P, extra.path || []);
      P.ids.forEach(i => { if (par[i] && !(extra.path || []).includes(i)) { const e = edges.find(e => (e.u === par[i] && e.v === i) || (!P.directed && e.u === i && e.v === par[i])); if (e) e.state = "tree"; } });
      if (extra.path) extra.path.forEach(i => (st[i] = i === P.goal ? "goal" : "path"));
      const rows = rowsFor();
      steps.push({ caption: cap, nodes: Studio.gs.nodes(P, st, bd), edges,
        lists: [{ label: "RELAXATIONS", items: relaxLog.slice(-10).map(t => ({ text: t, state: "open" })) }],
        table: { title: "distance table", columns: ["node", "d", "parent", "colour"], rows, rowStates: P.ids.map(i => (i === cur && !extra.final ? "cur" : black.has(i) ? "ok" : "")) },
        stats: [{ label: "picks", value: picks }, { label: "BLACK", value: black.size }].concat(extra.stats || []) });
    };
    snap(`d(${P.start}) = 0, every other node ∞, all nodes WHITE`);
    while (true) {
      let N = null;
      for (const i of P.ids) if (!black.has(i) && d[i] < INF && (N === null || d[i] < d[N] || (d[i] === d[N] && i < N))) N = i;
      if (N === null) { cur = null; snap(`No WHITE node has finite d: ${P.goal || "the goal"} is unreachable`, { final: true }); return { steps, result: { found: false, expanded: picks, relaxations: relaxLog.slice() } }; }
      black.add(N); picks++; cur = N;
      if (N === P.goal) {
        const path = []; for (let x = N; x; x = par[x]) path.unshift(x);
        const cost = d[N];
        snap(`Pick ${picks}: ${N} has the least d = ${F(d[N])} among WHITE nodes and is the goal. Colour it BLACK: path ${path.join(" – ")}, cost ${F(cost)}`, { path, final: true, stats: [{ label: "path cost", value: F(cost), state: "ok" }] });
        return { steps, result: { found: true, path, cost: Studio.gs.pathCost(P, path), expanded: picks, picks, relaxations: relaxLog.slice() } };
      }
      const notes = [];
      for (const [c, w] of P.adj[N]) {
        if (black.has(c)) continue;
        const nd = d[N] + w;
        if (nd < d[c]) {
          const t = d[c] === INF ? `${c}: ∞ → ${F(nd)} via ${N}` : `${c}: ${F(d[c])} → ${F(nd)} via ${N}`;
          notes.push(t); relaxLog.push(t); d[c] = nd; par[c] = N;
        }
      }
      snap(`Pick ${picks}: ${N} has the least d = ${F(d[N])} among WHITE nodes. Colour it BLACK and relax its WHITE neighbours${notes.length ? ": " + notes.join("; ") : ": no distance improves"}`);
    }
  },
});
