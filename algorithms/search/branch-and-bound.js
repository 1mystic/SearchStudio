/* Branch & Bound on a state space: tree search with OPEN ordered on g, no CLOSED list, duplicate states counted. */
Studio.register({
  id: "search-branch-and-bound",
  name: "Branch & Bound (state space)",
  family: "Graph search · optimal",
  week: 5,
  problem: "graph",
  order: 42,
  summary: "Tree search with OPEN ordered on g and no CLOSED list. The same state can appear many times in the search tree; the tracer counts the occurrences. The first goal picked is the cheapest path.",
  pseudocode: `OPEN ← [(S, nil, g=0)]                      # a search TREE: no CLOSED list
repeat
    N ← node on OPEN with least g                # ties: alphabetical, then oldest
    remove N from OPEN;  count one refinement
    if GoalTest(N): return the path of N         # g(N) is the bound: nothing on OPEN is cheaper
    for each child C of N not already on N's own path
        add (C, N, g(N)+k(N,C)) to OPEN          # even if C already occurs elsewhere in the tree`,
  complexity: "Can be exponential: duplicates are not merged",
  learn: {
    "intro": "Branch & Bound explores a tree of paths, always refining the cheapest partial path. Nothing records which states have already been reached, so the same state can be generated again by a different path. This tracer shows how often each state occurs in the search tree.",
    "definition": "Each OPEN entry is one partial path from S, stored as a node pair (node, parent, g). A refinement takes the cheapest entry and replaces it by its children, one per neighbour that is not already on that path (so a path never loops). There is no CLOSED list, so two different paths to the same state are both kept as separate tree nodes. The goal test is applied when the goal is picked from OPEN; its g is then the cost of the cheapest path, because every other entry on OPEN costs at least as much.",
    "steps": [
      ["OPEN ← [(S, nil, 0)]", "The search tree has one node."],
      ["N ← least-g entry", "Each pick is one refinement."],
      ["if GoalTest(N): return", "g(N) is the bound for every other entry."],
      ["children not on N's path", "Duplicates of a state in other branches are not removed."],
      ["count occurrences", "Total tree nodes = sum of the occurrence counts of all states."]
    ],
    "formulas": [
      { "f": "g(C) = g(N) + k(N, C)", "read": "cost of the extended path", "why": "Each tree node carries the cost of its own path." },
      { "f": "tree size = Σ occurrences(state)", "read": "every path prefix is a node", "why": "Without CLOSED, merging never happens, so the tree can be much larger than the graph." }
    ],
    "why": "It finds the optimal path like UCS, but because it does not merge duplicates it does more work. Adding a CLOSED list (and updating g on cheaper paths) turns it into Dijkstra's algorithm. The occurrence counts show exactly what a CLOSED list saves.",
    "traps": [
      "The goal state may itself appear several times in the tree; only the first one picked ends the search.",
      "Do not stop when the goal is generated: stop when it is picked.",
      "A pick of a node is counted as a refinement even when it is the goal."
    ],
    "props": { "complete": "yes (finite graph, no loops on a path)", "optimal": "yes (non-negative costs)", "time": "exponential in the worst case", "space": "all tree nodes" }
  },
  params: [{ key: "limit", label: "Safety limit (refinements)", type: "int", default: 1500, min: 10, max: 20000 }],
  run(P, { limit }) {
    limit = limit || 1500;
    const F = Studio.fmt, steps = [];
    let seq = 0;
    const mk = (path, g) => ({ path, id: path[path.length - 1], parent: path.length > 1 ? path[path.length - 2] : null, g, seq: seq++, status: "OPEN", no: 0 });
    const root = mk([P.start], 0), tree = [root];
    let OPEN = [root], picks = 0, last = null;
    const occ = () => { const c = Object.fromEntries(P.ids.map(i => [i, 0])); tree.forEach(t => c[t.id]++); return c; };
    const pair = x => `(${x.id},${x.parent ?? "nil"},${F(x.g)})`;
    const snap = (cap, extra = {}) => {
      const c = occ(), st = {}, bd = {};
      P.ids.forEach(i => { if (c[i]) { st[i] = tree.some(t => t.id === i && t.status === "OPEN") ? "open" : "closed"; bd[i] = "×" + c[i]; } });
      if (last) st[last.id] = extra.final ? "goal" : "current";
      if (extra.path) extra.path.forEach(i => (st[i] = i === P.goal ? "goal" : "path"));
      const shown = tree.slice(-40), stateRows = shown.map(t => [t.path.join("–"), t.id, F(t.g), t.status]);
      steps.push({ caption: cap, nodes: Studio.gs.nodes(P, st, bd), edges: Studio.gs.edges(P, extra.path || []),
        lists: [
          { label: "OPEN (by g)", items: OPEN.map(x => ({ text: `${pair(x)}  ${x.path.join("–")}`, state: "open" })) },
          { label: "OCCURRENCES IN TREE", items: P.ids.filter(i => c[i]).map(i => ({ text: `${i} × ${c[i]}`, state: c[i] > 1 ? "closed" : "plain" })) },
        ],
        table: { title: tree.length > 40 ? "search tree (latest 40 nodes)" : "search tree (one row per tree node)", columns: ["path", "state", "g", "status"], rows: stateRows,
          rowStates: shown.map(t => (t.status === "goal" ? "ok" : t === last && !extra.final ? "cur" : t.status === "expanded" ? "dim" : "")) },
        stats: [{ label: "refinements", value: picks }, { label: "tree nodes", value: tree.length }, { label: "OPEN", value: OPEN.length }].concat(extra.stats || []) });
    };
    snap(`OPEN ← [(${P.start},nil,0)]: the search tree has one node`);
    while (OPEN.length) {
      if (picks >= limit) { last = null; snap(`Stopped after ${picks} refinements (safety limit): the tree has ${tree.length} nodes because duplicates are never merged`, { final: true }); return { steps, result: { found: false, truncated: true, expanded: picks, refinements: picks, treeSize: tree.length, counts: occ() } }; }
      OPEN.sort((a, b) => a.g - b.g || (a.id < b.id ? -1 : a.id > b.id ? 1 : a.seq - b.seq));
      const N = OPEN.shift(); picks++; last = N;
      if (N.id === P.goal) {
        N.status = "goal";
        const c = occ(), cost = Studio.gs.pathCost(P, N.path);
        snap(`Refinement ${picks}: the goal ${N.id} is picked with the least g = ${F(N.g)}, so ${N.path.join(" – ")} (cost ${F(cost)}) is optimal. Tree holds ${tree.length} nodes: ${P.ids.filter(i => c[i]).map(i => `${i} ${c[i]}`).join(", ")}`,
          { path: N.path, final: true, stats: [{ label: "path cost", value: F(cost), state: "ok" }] });
        return { steps, result: { found: true, path: N.path.slice(), cost, expanded: picks, refinements: picks, treeSize: tree.length, counts: c } };
      }
      N.status = "expanded";
      const kids = [];
      for (const [v, w] of P.adj[N.id]) { if (N.path.includes(v)) continue; const k = mk(N.path.concat(v), N.g + w); kids.push(k); tree.push(k); OPEN.push(k); }
      const dup = kids.filter(k => tree.some(t => t !== k && t.id === k.id)).map(k => k.id);
      snap(`Refinement ${picks}: ${N.id} (g = ${F(N.g)}) has the least g on OPEN. ${kids.length ? "Add " + kids.map(k => `${k.id} (g=${F(k.g)})`).join(", ") + " to the tree" : "No children off its own path"}${dup.length ? `; ${dup.join(", ")} already occur${dup.length === 1 ? "s" : ""} elsewhere in the tree and ${dup.length === 1 ? "is" : "are"} kept again (no CLOSED list)` : ""}`);
    }
    last = null;
    snap(`OPEN is empty: no path to ${P.goal || "a goal"}`, { final: true });
    return { steps, result: { found: false, expanded: picks, refinements: picks, treeSize: tree.length, counts: occ() } };
  },
});
