/* Iterative deepening A*: depth-first search bounded by f = g + h, bound raised to the smallest f that exceeded it. */
Studio.register({
  id: "search-ida-star",
  name: "IDA*",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 70,
  summary: "Depth-first search that never expands a node with f = g + h above a bound. Start with bound f(S); after a failed pass, raise the bound to the smallest f that was cut off. Optimal with admissible h, memory linear in depth.",
  pseudocode: `bound ← f(S) = h(S)
loop
    t ← DFS(S, g = 0, bound)          # depth-first, nodes on the current path are not revisited
    if t = FOUND: return the path
    if t = ∞: return failure
    bound ← t                          # smallest f that exceeded the bound

DFS(N, g, bound):
    f ← g + h(N);  if f > bound: return f
    if GoalTest(N): return FOUND
    min ← ∞
    for each child C not on the path: t ← DFS(C, g + k(N,C), bound); if FOUND: return FOUND; min ← min(min, t)
    return min`,
  complexity: "Time like A* times the number of distinct f-bounds; space O(b·d)",
  learn: {
    "intro": "A* is optimal but can run out of memory because OPEN grows exponentially. IDA* gets the same answer using memory proportional to the path length, by running depth-first searches with a growing cost limit.",
    "definition": "Repeat depth-first search from the start, refusing to go past any node whose f = g + h exceeds the current bound. The first bound is h(start); each next bound is the smallest f that was cut off in the previous pass.",
    "steps": [
      [
        "bound ← h(start)",
        "With admissible h this cannot exceed the optimal cost."
      ],
      [
        "DFS with f ≤ bound",
        "Only the current path is stored; nodes already on the path are skipped to avoid cycles."
      ],
      [
        "record the smallest f above the bound",
        "That is the next bound: no solution can be cheaper than it."
      ],
      [
        "repeat until the goal is reached",
        "The first goal found is optimal."
      ]
    ],
    "formulas": [
      {
        "f": "bound₀ = h(S),  boundₖ₊₁ = min { f(N) : f(N) > boundₖ }",
        "read": "raise the limit just enough to let in the next cheapest nodes",
        "why": "Never skipping a cost level means the first solution found is the cheapest."
      },
      {
        "f": "f(N) = g(N) + h(N)",
        "read": "cost so far plus estimated remainder",
        "why": "Same evaluation as A*."
      }
    ],
    "why": "Optimal with admissible h and linear memory. It repeats work in every pass, which is cheap when f takes few distinct values and expensive when many nodes have different f.",
    "traps": [
      "Count expansions across all passes.",
      "IDA* has no CLOSED list, so on graphs it may revisit nodes by different paths."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes with admissible h",
      "time": "A* × number of bounds (worst case)",
      "space": "O(b·d)"
    }
  },
  params: [],
  run(P) {
    const steps = [], summary = [];
    let bound = P.h[P.start], total = 0;
    for (let round = 1; round <= 60; round++) {
      let next = Infinity, expanded = 0, found = null;
      const path = [P.start];
      const snap = (cur, cap, cut = []) => {
        const states = {}; path.forEach(p => (states[p] = "visited")); states[cur] = "current"; cut.forEach(c => (states[c] = states[c] || "closed"));
        steps.push({ caption: `bound ${bound}: ${cap}`, nodes: Studio.gs.nodes(P, states), edges: Studio.gs.edges(P, path),
          lists: [{ label: "PATH", items: path.map(p => ({ text: p, state: "open" })) }],
          table: { title: "rounds", columns: ["bound", "expanded", "next bound", "result"], rows: summary.concat([[bound, expanded, next === Infinity ? "∞" : next, "…"]]), rowStates: summary.map(() => "").concat(["cur"]) },
          stats: [{ label: "g", value: Studio.gs.pathCost(P, path) }, { label: "f", value: Studio.gs.pathCost(P, path) + P.h[cur] }, { label: "bound", value: bound }] });
      };
      const dfs = (N, g) => {
        const f = g + P.h[N];
        if (f > bound) { next = Math.min(next, f); snap(N, `f(${N}) = ${g}+${P.h[N]} = ${f} > ${bound}: cut off`); return false; }
        if (N === P.goal) { found = path.slice(); return true; }
        expanded++;
        snap(N, `expand ${N}: g = ${g}, f = ${f} ≤ ${bound}`);
        for (const [c, w] of P.adj[N]) {
          if (path.includes(c)) continue;
          path.push(c);
          if (dfs(c, g + w)) return true;
          path.pop();
        }
        return false;
      };
      dfs(P.start, 0);
      total += expanded;
      if (found) {
        const cost = Studio.gs.pathCost(P, found);
        summary.push([bound, expanded, "–", `found ${found.join("–")} = ${cost}`]);
        steps.push({ caption: `bound ${bound}: goal reached, path ${found.join(" – ")}, cost ${cost}; ${total} expansions over ${round} rounds`,
          nodes: Studio.gs.nodes(P, Object.fromEntries(found.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, found),
          table: { title: "rounds", columns: ["bound", "expanded", "next bound", "result"], rows: summary, rowStates: summary.map((_, i) => (i === summary.length - 1 ? "ok" : "")) },
          stats: [{ label: "path cost", value: cost, state: "ok" }, { label: "total expanded", value: total }] });
        return { steps, result: { found: true, path: found, cost, expanded: total } };
      }
      summary.push([bound, expanded, next === Infinity ? "∞" : next, "no path within bound"]);
      if (next === Infinity) break;
      bound = next;
    }
    steps.push({ caption: "No path to the goal", nodes: Studio.gs.nodes(P), edges: Studio.gs.edges(P), table: { columns: ["bound", "expanded", "next bound", "result"], rows: summary } });
    return { steps, result: { found: false, expanded: total } };
  },
});
