/* Depth First Iterative Deepening: depth-bounded DFS with bound 0, 1, 2, ... */
Studio.register({
  id: "search-dfid",
  name: "Depth First Iterative Deepening",
  family: "Graph search · uninformed",
  week: 2,
  problem: "graph",
  order: 30,
  summary: "Run depth-bounded DFS with bound 0, 1, 2, … until the goal is found. The path of BFS with the memory of DFS, at the price of repeated work.",
  pseudocode: `for bound ← 0, 1, 2, …
    result ← DB-DFS(S, bound)      # DFS that does not expand nodes at depth = bound
    if result ≠ failure: return result
    if no node was cut off by the bound: return failure`,
  complexity: "Time O(b^d) (≈ b/(b−1) × BFS), space O(b·d)",
  learn: {
    "intro": "Depth First Iterative Deepening runs DFS with a depth limit of 0, then 1, then 2, … It finds the same shallow path as BFS while using only DFS's memory.",
    "definition": "Repeat depth-bounded DFS (DB-DFS) with an increasing bound until the goal is found. DB-DFS does not expand nodes at depth equal to the bound.",
    "steps": [
      [
        "for bound ← 0, 1, 2, …",
        ""
      ],
      [
        "DB-DFS(S, bound)",
        "A full DFS that stops descending at the bound."
      ],
      [
        "if found: return",
        "The first bound that works is the shallowest goal depth."
      ]
    ],
    "formulas": [
      {
        "f": "N(DFID) ≈ N(BFS) · b/(b−1)",
        "read": "extra work is a small factor of BFS",
        "why": "Most nodes of a tree are on the last level, so repeating the upper levels is cheap."
      }
    ],
    "why": "Combines BFS's optimal depth with DFS's small memory; the repeated work is small for branching factors above 2.",
    "traps": [
      "Count expansions over all rounds, not just the last.",
      "With CLOSED checking, DB-DFS can miss a shallower route to a node seen earlier via a deeper path."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes for unit costs",
      "time": "O(b^d)",
      "space": "O(b·d)"
    }
  },
  params: [{ key: "maxBound", label: "Largest bound to try", type: "int", default: 12, min: 0, max: 40 }],
  run(P, { maxBound }) {
    const steps = [], summary = [];
    let total = 0;
    for (let bound = 0; bound <= maxBound; bound++) {
      const r = Studio.search.run(P, "dfs", { depthBound: bound });
      total += r.result.expanded;
      summary.push([bound, r.result.expanded, r.result.found ? r.result.path.join(" – ") : "no path"]);
      r.steps.forEach(s => {
        s.caption = `bound ${bound}: ` + s.caption;
        s.stats = [{ label: "bound", value: bound }, { label: "total expanded", value: total - r.result.expanded + (s.stats ? s.stats[0].value : 0) }].concat((s.stats || []).slice(1));
        steps.push(s);
      });
      if (r.result.found) {
        const last = steps[steps.length - 1];
        last.table = { title: "dry run", columns: ["bound", "expanded", "result"], rows: summary.concat([["total", total, ""]]), rowStates: summary.map(x => (x[2] === "no path" ? "" : "ok")).concat(["warn"]) };
        last.caption = `bound ${bound}: path ${r.result.path.join(" – ")} found; ${total} expansions over ${bound + 1} rounds`;
        return { steps, result: Object.assign({}, r.result, { expandedTotal: total, bound }) };
      }
      const cut = r.steps.some(s => /depth bound/.test(s.caption));
      if (!cut) break;
    }
    return { steps, result: { found: false, expandedTotal: total } };
  },
});
