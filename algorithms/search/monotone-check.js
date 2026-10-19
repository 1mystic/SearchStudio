/* Checks a heuristic: admissible (h ≤ h*) and monotone / consistent (h(m) ≤ k(m,n) + h(n) on every edge). */
Studio.register({
  id: "search-monotone-check",
  name: "Admissibility & monotone check",
  family: "Graph search · optimal",
  week: 6,
  problem: "graph",
  order: 65,
  summary: "Compute the true remaining cost h* by a backward Dijkstra from the goal, then test every node for admissibility (h ≤ h*) and every edge for the monotone condition h(m) ≤ k(m,n) + h(n).",
  pseudocode: `h* ← Dijkstra from the goal (true cost to the goal)
for each node n: admissible at n  ⇔  h(n) ≤ h*(n)
for each edge (m, n) with cost k: monotone  ⇔  h(m) ≤ k + h(n)   (both directions if undirected)
monotone everywhere and h(goal) = 0  ⇒  admissible`,
  complexity: "O(E log V) for Dijkstra plus O(V + E) checks",
  learn: {
    "intro": "A* is only as good as its heuristic. Two properties matter: admissibility (never overestimate the remaining cost) and the monotone or consistency condition (the estimate never drops by more than the cost of an edge). This tool checks both on any graph.",
    "definition": "Compute the true remaining cost h*(n) to the goal by Dijkstra's algorithm from the goal. h is admissible if h(n) ≤ h*(n) everywhere. h is monotone if h(m) ≤ k(m,n) + h(n) for every edge (m,n).",
    "steps": [
      [
        "h* by Dijkstra from the goal",
        "Exact distances, so the check is exact."
      ],
      [
        "check h(n) ≤ h*(n) for each node",
        "Admissibility makes A* optimal."
      ],
      [
        "check h(m) ≤ k(m,n) + h(n) for each edge",
        "Monotonicity makes f non-decreasing along every path."
      ]
    ],
    "formulas": [
      {
        "f": "admissible: h(n) ≤ h*(n)",
        "read": "never overestimate",
        "why": "A* then never discards the optimal path."
      },
      {
        "f": "monotone: h(m) − h(n) ≤ k(m,n)",
        "read": "the estimate drops by at most the edge cost",
        "why": "Then f(n) = g(n) + h(n) ≥ g(m) + h(m) = f(m): f never decreases, so a node is closed with its optimal g and never reopened."
      },
      {
        "f": "monotone ∧ h(goal) = 0 ⇒ admissible",
        "read": "consistency is the stronger property",
        "why": "Summing the edge inequalities along the optimal path gives h(n) ≤ h*(n)."
      }
    ],
    "why": "Knowing which property holds tells you whether A* is optimal (admissible) and whether it may need to reopen closed nodes (not monotone).",
    "traps": [
      "Admissible does not imply monotone.",
      "Check both directions of an undirected edge."
    ],
    "props": {
      "complete": "n/a",
      "optimal": "n/a",
      "time": "O(E log V)",
      "space": "O(V)"
    }
  },
  params: [],
  run(P) {
    const steps = [], hs = Studio.gs.hstar(P, P.goal);
    const nrows = P.ids.map(i => [i, P.h[i], hs[i] === Infinity ? "∞" : hs[i], P.h[i] <= hs[i] ? "yes" : "NO"]);
    const bad = P.ids.filter(i => P.h[i] > hs[i]);
    steps.push({ caption: `h* by Dijkstra from ${P.goal}. ${bad.length ? "Not admissible at " + bad.join(", ") : "h ≤ h* at every node: admissible"}`,
      nodes: Studio.gs.nodes(P, Object.fromEntries(P.ids.map(i => [i, bad.includes(i) ? "current" : "plain"])), Object.fromEntries(P.ids.map(i => [i, `${P.h[i]}/${hs[i]}`]))), edges: Studio.gs.edges(P),
      table: { title: "admissibility (badge = h / h*)", columns: ["node", "h", "h*", "h ≤ h*"], rows: nrows, rowStates: nrows.map(r => (r[3] === "NO" ? "bad" : "ok")) } });
    const erows = [], viol = [];
    P.edges.forEach(([u, v, w]) => {
      const dirs = P.directed ? [[u, v]] : [[u, v], [v, u]];
      dirs.forEach(([m, n]) => { const ok = P.h[m] <= w + P.h[n]; erows.push([`${m}→${n}`, P.h[m], `${w} + ${P.h[n]} = ${w + P.h[n]}`, ok ? "yes" : "NO"]); if (!ok) viol.push([m, n]); });
    });
    steps.push({ caption: viol.length ? `Monotone condition fails on ${viol.map(v => v.join("→")).join(", ")}: f can decrease along a path, so A* may need to reopen closed nodes` : "h(m) ≤ k(m,n) + h(n) on every edge: monotone (consistent), so f never decreases along a path",
      nodes: Studio.gs.nodes(P, Object.fromEntries(viol.flat().map(i => [i, "current"])), Object.fromEntries(P.ids.map(i => [i, P.h[i]]))),
      edges: Studio.gs.edges(P, [], viol.map(([m, n]) => ({ u: m, v: n, state: "rejected" }))),
      table: { title: "monotone condition", columns: ["edge", "h(m)", "k + h(n)", "holds"], rows: erows, rowStates: erows.map(r => (r[3] === "NO" ? "bad" : "")) },
      stats: [{ label: "admissible", value: bad.length ? "no" : "yes", state: bad.length ? "bad" : "ok" }, { label: "monotone", value: viol.length ? "no" : "yes", state: viol.length ? "bad" : "ok" }] });
    return { steps, result: { admissible: !bad.length, monotone: !viol.length } };
  },
});
