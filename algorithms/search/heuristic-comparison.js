/* Informed heuristics compared: A* with h = 0, the given h, and the perfect h = h*, side by side. */
Studio.register({
  id: "search-heuristic-comparison",
  name: "Heuristic comparison (A* with h = 0, h, h*)",
  family: "Graph search · optimal",
  week: 5,
  problem: "graph",
  order: 62,
  summary: "Runs A* three times: with h = 0 (which is UCS), with the problem's h, and with the perfect h = h*. Compares nodes expanded and the effective branching factor b*: a better heuristic means fewer expansions.",
  pseudocode: `for each heuristic H in [ h = 0,  h (given),  h = h* ]:
    run A* with f = g + H
    record: nodes expanded, nodes generated, path cost
    b* ← the branching factor of a uniform tree of depth d (solution length)
         with the same number of nodes:   generated = 1 + b* + b*² + … + b*^d
compare the three rows`,
  complexity: "Three A* runs",
  learn: {
    "intro": "The quality of a heuristic shows in how much search it saves. Here the same graph is searched by A* with three heuristics: no information (h = 0), the given h, and the perfect h = h*, the true remaining cost.",
    "definition": "A* orders OPEN on f = g + h. With h = 0 it expands nodes in order of g, which is Uniform Cost Search. With h = h* (the exact cost to the goal, computed by Dijkstra from the goal) f is constant along an optimal path, so only that path is expanded (up to ties). An admissible h lies between the two: h ≤ h*, and a larger h (closer to h*) never expands more nodes than a smaller admissible one, apart from ties. **Supplementary:** the effective branching factor b* is not part of the lecture notation; it is the b that makes a uniform tree of depth d (the solution length) hold exactly as many nodes as were generated, 1 + b* + … + b*^d = generated. A smaller b* (closer to 1) means a better heuristic.",
    "steps": [
      ["A* with h = 0", "The baseline: Uniform Cost Search."],
      ["A* with the given h", "How much the problem's heuristic helps."],
      ["A* with h = h*", "The best any heuristic can do: expand only the solution path."],
      ["compare expansions and b*", "Fewer expansions and b* near 1 mean a more informed heuristic."]
    ],
    "formulas": [
      { "f": "0 ≤ h ≤ h*  ⇒  expansions(h*) ≤ expansions(h) ≤ expansions(0)", "read": "a more informed admissible h expands no more nodes (up to ties)", "why": "A* expands every node with f < C*; raising h raises f and removes nodes from that set." },
      { "f": "generated = 1 + b* + b*² + … + b*^d", "read": "effective branching factor (supplementary)", "why": "It turns a node count into a single branching number that can be compared across problems." }
    ],
    "why": "It makes the value of heuristic information concrete. On an inadmissible h the middle row can be cheaper to run but return a worse path: the path cost column then differs from the other two.",
    "traps": [
      "Admissible does not mean good: h = 0 is admissible and almost useless.",
      "With an inadmissible h the middle row may have a higher cost than the others.",
      "Ties can make the counts differ by one or two; the ordering of the three rows is what matters.",
      "h* needs the true remaining costs, which in practice means already having solved the problem."
    ],
    "props": { "complete": "yes", "optimal": "yes for h = 0 and h*; yes for h admissible", "time": "3 × A*", "space": "3 × A*" }
  },
  params: [{ key: "tie", label: "Ties", type: "select", default: "alpha", options: [["alpha", "alphabetical"], ["fifo", "first in, first out"], ["lifo", "last in, first out"]] }],
  run(P, { tie }) {
    const F = Studio.fmt, steps = [];
    const hs = Studio.gs.hstar(P, P.goal);
    const hstar = Object.fromEntries(P.ids.map(i => [i, isFinite(hs[i]) ? hs[i] : 0]));
    const variants = [
      { key: "h = 0", label: "h = 0 (UCS)", h: Object.fromEntries(P.ids.map(i => [i, 0])) },
      { key: "h", label: "h (given)", h: P.h },
      { key: "h = h*", label: "h = h* (perfect)", h: hstar },
    ];
    // effective branching factor: solve 1 + b + ... + b^d = N by bisection
    const bstar = (N, d) => {
      if (d <= 0 || N <= d + 1) return 1;
      const sum = b => { let s = 1, t = 1; for (let i = 1; i <= d; i++) { t *= b; s += t; } return s; };
      let lo = 1, hi = Math.max(2, N);
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (sum(m) < N) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    const rows = [], rowStates = [], labels = [], vals = [], res = [];
    const admissibleGiven = P.ids.every(i => P.h[i] <= hstar[i] + 1e-9);
    steps.push({ caption: `Run A* three times on the same graph: h = 0, the given h${admissibleGiven ? "" : " (not admissible here)"}, and the perfect h = h*. Compare expansions and the effective branching factor b*`,
      nodes: Studio.gs.nodes(P, { [P.start]: "start", [P.goal]: "goal" }, Object.fromEntries(P.ids.map(i => [i, F(hstar[i])]))), edges: Studio.gs.edges(P),
      table: { title: "h*(N) is the true remaining cost (shown on the nodes)", columns: ["node", "h", "h*"], rows: P.ids.map(i => [i, P.h[i], F(hstar[i])]) },
      stats: [{ label: "heuristics", value: 3 }] });
    variants.forEach((v, k) => {
      const Q = Object.assign({}, P, { h: v.h });
      const r = Studio.search.run(Q, "astar", { tie });
      const last = r.steps[r.steps.length - 1], R = r.result;
      const lists = last.lists || [];
      const generated = lists.reduce((n, l) => n + l.items.length, 0);
      const d = R.found ? R.path.length - 1 : 0, b = R.found ? bstar(generated, d) : NaN;
      res.push({ expanded: R.expanded, generated, cost: R.cost, path: R.path, b, found: R.found });
      rows.push([v.label, R.expanded, generated, R.found ? F(R.cost) : "–", R.found ? b.toFixed(2) : "–"]); rowStates.push(k === variants.length - 1 ? "ok" : "");
      labels.push(v.key); vals.push(R.expanded);
      steps.push({ caption: `A* with ${v.label}: ${R.found ? `path ${R.path.join(" – ")}, cost ${F(R.cost)}, ${R.expanded} nodes expanded, ${generated} generated, b* = ${b.toFixed(2)}` : "no path"}${k === 1 && !admissibleGiven ? ". This h overestimates somewhere, so A* may return a costlier path" : ""}`,
        nodes: last.nodes, edges: last.edges, lists,
        table: { title: "A* with three heuristics", columns: ["heuristic", "expanded", "generated", "cost", "b*"], rows: rows.map(x => x.slice()), rowStates: rows.map((_, i) => (i === rows.length - 1 ? "cur" : "")) },
        chart: { kind: "bars", yLabel: "nodes expanded", labels: labels.slice(), values: vals.slice(), mark: k },
        stats: [{ label: "expanded", value: R.expanded }, { label: "b*", value: R.found ? b.toFixed(2) : "–" }] });
    });
    const [r0, r1, r2] = res;
    const ordered = r2.expanded <= r1.expanded && r1.expanded <= r0.expanded;
    steps.push({ caption: `Summary: expansions ${r0.expanded} (h = 0), ${r1.expanded} (h), ${r2.expanded} (h*)${ordered ? ": the more informed the heuristic, the fewer nodes" : " (not monotone here: ties or an inadmissible h)"}. b*: ${r0.b.toFixed(2)}, ${r1.b.toFixed(2)}, ${r2.b.toFixed(2)}`,
      nodes: steps[steps.length - 1].nodes, edges: steps[steps.length - 1].edges,
      table: { title: "A* with three heuristics", columns: ["heuristic", "expanded", "generated", "cost", "b*"], rows, rowStates },
      chart: { kind: "bars", yLabel: "nodes expanded", labels, values: vals, mark: 1 },
      stats: [{ label: "expanded h=0 / h / h*", value: `${r0.expanded} / ${r1.expanded} / ${r2.expanded}` }, { label: "path cost (given h)", value: r1.found ? F(r1.cost) : "–", state: "ok" }] });
    return { steps, result: { found: r1.found, path: r1.path, cost: r1.cost, expanded: r1.expanded, expandedH0: r0.expanded, expandedGiven: r1.expanded, expandedHstar: r2.expanded, bstarH0: r0.b, bstarGiven: r1.b, bstarHstar: r2.b, costH0: r0.cost, costHstar: r2.cost } };
  },
});
