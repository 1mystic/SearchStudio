/* Depth-First Branch and Bound: DFS with an upper bound U on the cost, pruning every path that cannot beat it. */
Studio.register({
  id: "search-dfbnb",
  name: "Depth-First Branch and Bound",
  family: "Graph search · optimal",
  week: 12,
  problem: "graph",
  order: 66,
  summary: "Depth-first search that remembers the best solution cost U found so far and abandons any path whose g + h is already ≥ U. Linear memory, and optimal when h is admissible.",
  pseudocode: `U ← ∞;  best ← none
DFBnB(N, g, path):
    if g + h(N) ≥ U: prune; return                 # cannot improve on the best solution
    if GoalTest(N): U ← g;  best ← path;  return   # a better solution
    for each child C of N not on the path, in increasing order of g' + h(C):
        DFBnB(C, g + k(N,C), path + C)
return best`,
  complexity: "Time exponential in the worst case, space O(b·d)",
  learn: {
    "intro": "Depth-First Branch and Bound keeps the small memory of depth-first search but still finds the optimal path. It carries a bound U, the cost of the best complete path found so far, and cuts off any branch that already costs at least U.",
    "definition": "Explore depth-first. The first path to the goal sets U = its cost. From then on, a path to node N is pruned when g(N) + h(N) ≥ U, because with an admissible h no completion of it can be cheaper than U. Whenever a cheaper goal path is found, U is lowered. When the search ends, the best path found is optimal. Only the current path is stored, so memory is linear in the depth. With the option 'g only' the heuristic is ignored (h = 0): then the pruning test is g(N) ≥ U.",
    "steps": [
      ["U ← ∞", "No solution known yet."],
      ["go depth-first, nearest children first", "Ordering by g + h finds a good U early."],
      ["prune if g + h ≥ U", "This path cannot beat the best solution."],
      ["goal reached with g < U: U ← g", "A cheaper solution; remember the path."],
      ["backtrack until every branch is searched or pruned", "The last U is the optimum."]
    ],
    "formulas": [
      { "f": "prune N when g(N) + h(N) ≥ U", "read": "its best possible total is no better than the bound", "why": "With h ≤ h* the true cost of any path through N is at least g(N)+h(N), so continuing cannot help." },
      { "f": "U ← min(U, g(goal))", "read": "tighten the bound at each solution", "why": "A smaller U prunes more of the remaining tree." }
    ],
    "why": "It needs memory only for the current path, unlike A* whose OPEN list can grow exponentially, and it still returns an optimal path. Its weakness is that, on a graph, it may reach the same state again by many paths. A good first solution (found by ordering children well) makes it prune heavily.",
    "traps": [
      "The first goal found is not the answer: keep searching with the bound.",
      "With an inadmissible h the pruning can discard the optimal path; with h = 0 ('g only') it is always safe.",
      "A bad child ordering finds a poor U late and prunes little.",
      "Prune with ≥ U: a path equal to U cannot improve the answer."
    ],
    "props": { "complete": "yes (finite graph)", "optimal": "yes with admissible h", "time": "exponential worst case", "space": "O(b·d)" }
  },
  params: [
    { key: "useH", label: "Bound uses", type: "select", default: "f", options: [["f", "g + h (heuristic)"], ["g", "g only (h = 0)"]] },
    { key: "maxSteps", label: "Steps to record", type: "int", default: 300, min: 20, max: 2000 },
  ],
  run(P, { useH, maxSteps }) {
    maxSteps = maxSteps || 300;
    const F = Studio.fmt, steps = [], path = [P.start], h = id => (useH === "g" ? 0 : P.h[id]);
    let U = Infinity, best = null, expanded = 0, pruned = 0, improvements = 0, recorded = 0, omitted = 0;
    const log = [];
    const snap = (cap, state = {}) => {
      if (recorded >= maxSteps) { omitted++; return; }
      recorded++;
      const st = {}; (best || []).forEach(i => (st[i] = "path")); path.forEach(i => (st[i] = "visited")); st[path[path.length - 1]] = "current"; st[P.goal] = st[P.goal] === "current" ? "current" : "goal";
      steps.push({ caption: cap, nodes: Studio.gs.nodes(P, st), edges: Studio.gs.edges(P, best || []),
        lists: [{ label: "CURRENT PATH", items: path.map(p => ({ text: p, state: "open" })) }],
        table: { title: "events", columns: ["#", "event", "path", "g + h", "U"], rows: log.slice(-12), rowStates: log.slice(-12).map(r => (r[1] === "pruned" ? "bad" : r[1] === "new U" ? "ok" : "")) },
        stats: [{ label: "U", value: U === Infinity ? "∞" : F(U), state: state.ok }, { label: "expanded", value: expanded }, { label: "pruned", value: pruned }] });
    };
    const Us = () => (U === Infinity ? "∞" : F(U));
    snap(`U ← ∞: no solution yet. Search depth-first from ${P.start}, nearest children first`);
    const dfs = (N, g) => {
      const f = g + h(N);
      if (f >= U) {
        pruned++; log.push([log.length + 1, "pruned", path.join("–"), F(f), Us()]);
        snap(`Prune ${path.join("–")}: g + h = ${F(g)} + ${F(h(N))} = ${F(f)} ≥ U = ${Us()}, so no completion can beat the best solution`);
        return;
      }
      if (N === P.goal) {
        U = g; best = path.slice(); improvements++;
        log.push([log.length + 1, "new U", path.join("–"), F(f), Us()]);
        snap(`Goal reached by ${path.join("–")} with cost ${F(g)} < U: U ← ${F(g)}, remember this path and keep searching`, { ok: "ok" });
        return;
      }
      expanded++;
      const kids = P.adj[N].filter(([c]) => !path.includes(c)).map(([c, w]) => ({ c, g: g + w })).sort((a, b) => a.g + h(a.c) - (b.g + h(b.c)) || (a.c < b.c ? -1 : 1));
      log.push([log.length + 1, "expand", path.join("–"), F(f), Us()]);
      snap(`Expand ${N} (g = ${F(g)}, g + h = ${F(f)} < U = ${Us()}): children in order ${kids.map(k => `${k.c} (${F(k.g + h(k.c))})`).join(", ") || "none"}`);
      for (const k of kids) { path.push(k.c); dfs(k.c, k.g); path.pop(); }
    };
    dfs(P.start, 0);
    if (!best) { steps.push({ caption: `The search space is exhausted: no path to ${P.goal}`, nodes: Studio.gs.nodes(P), edges: Studio.gs.edges(P) }); return { steps, result: { found: false, expanded, pruned } }; }
    const cost = Studio.gs.pathCost(P, best);
    path.length = 0;
    const st = {}; best.forEach(i => (st[i] = i === P.goal ? "goal" : "path"));
    steps.push({ caption: `Every branch is searched or pruned: the best path is ${best.join(" – ")}, cost ${F(cost)} (U improved ${improvements} time${improvements === 1 ? "" : "s"}, ${expanded} expansions, ${pruned} prunes${omitted ? `; ${omitted} intermediate steps not shown` : ""})`,
      nodes: Studio.gs.nodes(P, st), edges: Studio.gs.edges(P, best),
      table: { title: "events", columns: ["#", "event", "path", "g + h", "U"], rows: log.slice(-12) },
      stats: [{ label: "path cost", value: F(cost), state: "ok" }, { label: "expanded", value: expanded }, { label: "pruned", value: pruned }] });
    return { steps, result: { found: true, path: best, cost, expanded, pruned, improvements } };
  },
});
