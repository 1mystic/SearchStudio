// Stream D1: graph-type algorithms for Weeks 2, 5 and 12 (depth-bounded DFS, Dijkstra, branch & bound,
// weighted A*, British Museum, DFBnB, heuristic comparison) and the display-rounding fix.
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const g1 = ex("graph-g1"), gw = ex("graph-weighted"), gi = ex("graph-inadmissible"), gd = ex("graph-dijkstra"), gt = ex("graph-t");
  const rnd = [Studio.generators.graph({ n: 10, seed: 2 }), Studio.generators.graph({ n: 14, seed: 5 })];
  const all = [g1, gw, gi, gd, gt].concat(rnd);
  const NEW = ["search-dfs-bounded", "search-dijkstra", "search-branch-and-bound", "search-weighted-astar", "search-british-museum", "search-dfbnb", "search-heuristic-comparison"];
  for (const id of NEW) { ok(!!Studio.get(id), `${id} is registered`); for (const g of all) checkRun(Studio.get(id), g); }
  const weights = { "search-weighted-astar": [{ weight: 1.5 }, { weight: 2 }], "search-dfbnb": [{ useH: "g" }], "search-dfs-bounded": [{ depthBound: 1 }, { depthBound: 6 }] };
  for (const id of Object.keys(weights)) for (const q of weights[id]) for (const g of all) checkRun(Studio.get(id), g, q);

  // ---- independent reference: textbook Dijkstra on the edge list (not the tracer's code path)
  const refCost = p => {
    const d = {}; p.nodes.forEach(n => (d[n.id] = Infinity)); d[p.start] = 0; const done = new Set();
    for (;;) {
      let u = null; for (const k in d) if (!done.has(k) && d[k] < Infinity && (u === null || d[k] < d[u])) u = k;
      if (u === null) break; done.add(u);
      for (const [a, b, w] of p.edges) { if (a === u && d[u] + w < d[b]) d[b] = d[u] + w; if (!p.directed && b === u && d[u] + w < d[a]) d[a] = d[u] + w; }
    }
    return d[p.goal];
  };
  for (const g of all) eq(run("search-ucs", g).cost, refCost(g), `UCS = reference Dijkstra on ${g.id}`);

  // ---- Depth-bounded DFS (Week 2)
  eq(run("search-dfs-bounded", g1, { depthBound: 3 }).path.join(""), "SADG", "bounded DFS finds SADG with bound 3 on G1");
  eq(run("search-dfs-bounded", g1, { depthBound: 2 }).found, false, "bounded DFS fails with bound 2 on G1 (goal is at depth 3)");
  eq(run("search-dfs-bounded", g1, { depthBound: 40 }).path.join(""), run("search-dfs", g1).path.join(""), "bounded DFS with a huge bound = plain DFS");

  // ---- Dijkstra (Week 5)
  const dj = run("search-dijkstra", gd);
  eq(dj.path.join(""), "SBDG", "Dijkstra path on the Dijkstra demo graph"); eq(dj.cost, 8, "Dijkstra cost 8"); eq(dj.picks, 6, "Dijkstra: 6 picks");
  ok(dj.relaxations.includes("G: 9 → 8 via D"), `Dijkstra relaxes G 9 → 8 (got ${dj.relaxations})`);
  const dg = run("search-dijkstra", g1);
  eq([dg.path.join(""), dg.cost], ["SADG", 3], "Dijkstra on the unit-cost G1 in this repo (answer S–B–D–G = 8 needs the weighted graph, see graph-dijkstra)");
  for (const g of all) eq(run("search-dijkstra", g).cost, refCost(g), `Dijkstra = reference on ${g.id}`);
  const lastDj = Studio.run(Studio.get("search-dijkstra"), gd, {}).steps.at(-1);
  eq(lastDj.table.rows.filter(r => r[3] === "BLACK").length, 6, "Dijkstra table: every node BLACK at the end");

  // ---- Branch & Bound on a state space (Week 5): graph T
  const bb = run("search-branch-and-bound", gt);
  eq(bb.path.join(""), "SABG", "B&B path on graph T"); eq(bb.cost, 4, "B&B cost on graph T"); eq(bb.refinements, 5, "B&B: 5 refinements on graph T");
  eq(bb.counts, { S: 1, A: 2, B: 2, G: 3 }, "B&B final tree counts on graph T");
  // independent check of graph T: enumerate the tree by hand-written recursion (all simple paths, counted per prefix reached before termination is not needed: check path costs)
  const sp = (() => { const out = []; const adj = {}; gt.edges.forEach(([a, b, w]) => { (adj[a] ||= []).push([b, w]); (adj[b] ||= []).push([a, w]); });
    const go = (p, g) => { if (p.at(-1) === "G") { out.push([p.join(""), g]); return; } for (const [v, w] of adj[p.at(-1)]) if (!p.includes(v)) go(p.concat(v), g + w); }; go(["S"], 0); return out.sort((a, b) => a[1] - b[1]); })();
  eq(sp[0], ["SABG", 4], "graph T: independent enumeration gives SABG = 4 as the unique cheapest"); ok(sp[1][1] > 4, "graph T: optimum is unique");
  for (const g of all) { const r = run("search-branch-and-bound", g); eq(r.cost, refCost(g), `B&B = UCS on ${g.id}`); eq(Object.values(r.counts).reduce((a, b) => a + b, 0), r.treeSize, `B&B counts sum to tree size on ${g.id}`); }

  // ---- Weighted A* (Week 5): cost <= w * C* for admissible h
  for (const g of all) for (const w of [1.5, 2]) {
    const r = run("search-weighted-astar", g, { weight: w }), C = refCost(g);
    ok(r.found, `weighted A* w=${w} finds a path on ${g.id}`);
    if (g !== gi) ok(r.cost <= w * C + 1e-9 && r.cost >= C, `weighted A* w=${w} on ${g.id}: ${r.cost} within [${C}, ${w * C}]`);
    else ok(r.admissible === false, "weighted A*: inadmissible example is reported as inadmissible (no bound guaranteed)");
  }
  eq(run("search-weighted-astar", gw, { weight: 1 }).cost, refCost(gw), "weighted A* with w = 1 is A*");
  eq(run("search-weighted-astar", gw, { weight: 2 }).expanded <= run("search-astar", gw).expanded, true, "weighted A* w=2 expands no more than A* on the weighted graph");

  // ---- British Museum (Week 5)
  for (const g of all) { const r = run("search-british-museum", g); eq(r.cost, refCost(g), `British Museum = UCS on ${g.id}`); ok(!r.truncated, `British Museum completes on ${g.id}`); }
  eq(run("search-british-museum", gt).paths, 4, "graph T has 4 simple S-G paths");
  eq(run("search-british-museum", gd).paths, 3, "Dijkstra demo graph has 3 simple S-G paths");

  // ---- Depth-first branch and bound (Week 12)
  for (const g of all) {
    eq(run("search-dfbnb", g, { useH: "g" }).cost, refCost(g), `DFBnB (g only) = UCS on ${g.id}`);
    if (g === gi) ok(run("search-dfbnb", g).found, "DFBnB with an inadmissible h still finds a path");
    else eq(run("search-dfbnb", g).cost, refCost(g), `DFBnB (g + h) = UCS on ${g.id}`);
  }
  ok(run("search-dfbnb", gw).expanded <= run("search-dfbnb", gw, { useH: "g" }).expanded, "DFBnB with an admissible h expands no more than with g only");

  // ---- Heuristic comparison (Week 5)
  for (const g of all) {
    const r = run("search-heuristic-comparison", g);
    ok(r.expandedHstar <= r.expandedH0, `h* expands no more than h = 0 on ${g.id} (${r.expandedHstar} vs ${r.expandedH0})`);
    eq(r.costH0, refCost(g), `comparison: h = 0 cost optimal on ${g.id}`); eq(r.costHstar, refCost(g), `comparison: h* cost optimal on ${g.id}`);
    ok(r.bstarHstar <= r.bstarH0 + 1e-9 && r.bstarH0 >= 1, `b*(h*) ≤ b*(h=0) on ${g.id}`);
    if (g !== gi) ok(r.expandedHstar <= r.expandedGiven && r.expandedGiven <= r.expandedH0, `expansions ordered h* ≤ h ≤ 0 on ${g.id}: ${r.expandedHstar}, ${r.expandedGiven}, ${r.expandedH0}`);
  }
  const hc = Studio.run(Studio.get("search-heuristic-comparison"), gw, {}).steps;
  ok(hc.some(s => s.chart && s.chart.kind === "bars"), "comparison draws a bar chart of expansions");

  // ---- display rounding: costs shown with at most 2 decimals, results stay exact
  const dec = { id: "graph-decimals", type: "graph", name: "decimals", directed: false, start: "S", goal: "G",
    nodes: [{ id: "S", h: 0 }, { id: "A", h: 0 }, { id: "B", h: 0 }, { id: "G", h: 0 }],
    edges: [["S", "A", 0.1], ["A", "B", 0.2], ["B", "G", 0.7], ["S", "B", 0.35], ["A", "G", 1.1]] };
  const noisy = /\d\.\d{3,}/;
  for (const a of Studio.algorithms.filter(x => x.problem === "graph")) {
    let r; try { r = Studio.run(a, dec, {}); } catch (e) { continue; }
    const bad = r.steps.find(s => noisy.test(JSON.stringify(s)));
    ok(!bad, `${a.id}: no float noise in displayed values (${bad ? bad.caption : ""})`);
    if (r.result.found && r.result.path) { ok(r.result.cost === Studio.gs.pathCost(r.P, r.result.path), `${a.id}: result.cost stays the exact path cost on decimals`); }
  }
  eq(run("search-ucs", dec).path.join(""), "SABG", "UCS path on decimals (S–A–B–G ≈ 1.0 beats S–B–G = 1.05)");
};
