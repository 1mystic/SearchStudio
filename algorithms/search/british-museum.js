/* British Museum search on paths: enumerate every simple path, keep the cheapest. */
Studio.register({
  id: "search-british-museum",
  name: "British Museum (brute force on paths)",
  family: "Graph search · optimal",
  week: 5,
  problem: "graph",
  order: 43,
  defaultExample: "graph-dijkstra",
  summary: "Try every simple path from S to the goal and keep the cheapest. Always right, hopelessly slow on big graphs: the yardstick the clever algorithms are measured against.",
  pseudocode: `best ← none;  cost* ← ∞
DFS over simple paths from S (a node may not repeat on the current path):
    if the path ends at the goal:
        if cost(path) < cost*: best ← path;  cost* ← cost(path)
        (do not extend a path past the goal)
return best`,
  complexity: "Exponential: the number of simple paths",
  learn: {
    "intro": "The British Museum method looks at every possible path, one by one, and keeps the cheapest. It needs no cleverness and no heuristic, and its answer is the optimum. Its cost is the number of paths, which explodes as the graph grows.",
    "definition": "Enumerate all simple paths (no repeated node) from S to the goal by depth-first exploration, in alphabetical order of neighbours. Each time a path reaches the goal, compare its cost with the best so far and keep the cheaper (the earlier one is kept on a tie). The answer has the same cost as Uniform Cost Search. The tracer shows each complete path found; after the first 40 it only reports improvements, and it counts everything.",
    "steps": [
      ["extend the path one neighbour at a time", "A node already on the path is skipped, so every path is simple."],
      ["when the goal is reached, record the path", "Do not extend past the goal."],
      ["keep the cheapest so far", "Strictly cheaper replaces; ties keep the first."],
      ["backtrack and continue", "Until every path has been tried."]
    ],
    "formulas": [
      { "f": "cost(path) = Σ k(edge)", "read": "sum of edge costs", "why": "Paths are compared by total cost." },
      { "f": "answer = min over all simple S→goal paths", "read": "exhaustive minimum", "why": "Nothing is skipped, so the minimum is the true optimum." }
    ],
    "why": "It shows how much work the intelligent methods avoid. Uniform Cost Search finds the same cost while looking at a tiny fraction of the paths.",
    "traps": [
      "The number of simple paths can be exponential in the number of nodes.",
      "It must not reuse a node on the same path, otherwise cycles give infinitely many paths.",
      "Finding the first path is not enough: all paths must be tried."
    ],
    "props": { "complete": "yes", "optimal": "yes", "time": "exponential (number of simple paths)", "space": "O(path length)" }
  },
  params: [{ key: "limit", label: "Safety limit (paths)", type: "int", default: 100000, min: 100, max: 1000000 }],
  run(P, { limit }) {
    limit = limit || 100000;
    const F = Studio.fmt, steps = [], path = [P.start];
    let best = null, bestCost = Infinity, count = 0, shown = 0, stopped = false, visits = 0;
    const log = [];
    const snap = (cap, bestPath, status) => {
      const st = {}; (bestPath || []).forEach(i => (st[i] = "path")); path.forEach(i => { if (!st[i]) st[i] = "visited"; }); st[P.goal] = "goal";
      steps.push({ caption: cap, nodes: Studio.gs.nodes(P, st), edges: Studio.gs.edges(P, bestPath || []),
        lists: [{ label: "CURRENT PATH", items: path.map(p => ({ text: p, state: "open" })) }],
        table: { title: "paths reaching the goal", columns: ["#", "path", "cost", "verdict"], rows: log.slice(-14), rowStates: log.slice(-14).map(r => (r[3] === "new best" ? "ok" : "")) },
        stats: [{ label: "paths found", value: count }, { label: "best cost", value: bestCost === Infinity ? "–" : F(bestCost), state: status }] });
    };
    snap(`Start at ${P.start}: enumerate every simple path to ${P.goal}`, null);
    const dfs = (N, g) => {
      if (stopped) return;
      if (N === P.goal) {
        count++;
        const prev = bestCost, better = g < bestCost;
        if (better) { best = path.slice(); bestCost = g; }
        const verdict = better ? "new best" : "not cheaper";
        log.push([count, path.join("–"), F(g), verdict]);
        if (shown < 40 || better) { shown++; snap(`Path ${count}: ${path.join(" – ")} costs ${F(g)}: ${better ? (prev === Infinity ? "the first path to the goal, keep it" : "cheaper than the best so far (" + F(prev) + "), keep it") : "not cheaper than " + F(bestCost) + ", discard"}`, best, better ? "ok" : undefined); }
        if (count >= limit) stopped = true;
        return;
      }
      if (++visits > limit * 50) { stopped = true; return; }
      for (const [c, w] of P.adj[N]) { if (path.includes(c)) continue; path.push(c); dfs(c, g + w); path.pop(); if (stopped) return; }
    };
    dfs(P.start, 0);
    if (!best) { steps.push({ caption: `No path from ${P.start} to ${P.goal}`, nodes: Studio.gs.nodes(P), edges: Studio.gs.edges(P), stats: [{ label: "paths found", value: 0 }] }); return { steps, result: { found: false, expanded: visits, paths: 0 } }; }
    const cost = Studio.gs.pathCost(P, best);
    path.length = 0;
    const st = {}; best.forEach(i => (st[i] = i === P.goal ? "goal" : "path"));
    steps.push({ caption: `${stopped ? "Stopped at the safety limit. " : "All paths tried. "}${count} path${count === 1 ? "" : "s"} reach ${P.goal}; the cheapest is ${best.join(" – ")}, cost ${F(cost)}`,
      nodes: Studio.gs.nodes(P, st), edges: Studio.gs.edges(P, best),
      table: { title: "paths reaching the goal", columns: ["#", "path", "cost", "verdict"], rows: log.slice(-14), rowStates: log.slice(-14).map(r => (r[3] === "new best" ? "ok" : "")) },
      stats: [{ label: "paths found", value: count }, { label: "path cost", value: F(cost), state: "ok" }] });
    return { steps, result: { found: true, path: best, cost, expanded: visits, paths: count, truncated: stopped } };
  },
});
