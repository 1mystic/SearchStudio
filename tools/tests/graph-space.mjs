// Week 6 space-saving searches on the graph type (BFHS, DC-BFHS, Beam Stack, SMGS, Frontier, A* with upper bound).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const ids = ["search-astar-ub", "search-bfhs", "search-dc-bfhs", "search-beam-stack", "search-smgs", "search-frontier"];
  const graphs = ["graph-g1", "graph-weighted", "graph-grid"].map(ex).concat([Studio.generators.graph({ n: 10, seed: 2 }), Studio.generators.graph({ n: 14, seed: 5 })]);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  for (const g of graphs) {
    const u = run("search-ucs", g).cost;
    for (const id of ids) {
      const algo = Studio.get(id);
      for (const params of id === "search-beam-stack" ? [{ w: 1 }, { w: 2 }, { w: 4 }] : [{}]) {
        const r = run(id, g, params);
        ok(r.found && near(r.cost, u), `${id} ${JSON.stringify(params)} cost ${r.cost} = UCS ${u} on ${g.id}`);
        checkRun(algo, g, params);
      }
    }
  }
  // inadmissible h: only a path must be found
  const gi = ex("graph-inadmissible");
  for (const id of ids) { ok(run(id, gi).found, `${id} finds a path on graph-inadmissible`); checkRun(Studio.get(id), gi); }
  // known answer: grid 4x5, unit costs, optimum = 7 (3 down + 4 right), checked independently in a scratch Dijkstra
  const grid = ex("graph-grid");
  for (const id of ids) eq(run(id, grid).cost, 7, `${id} on the 4x5 grid`);
  // memory: CLOSED-pruning methods never hold more CLOSED nodes than A*, and strictly fewer on the grid
  const astarClosed = run("search-astar", grid).expanded;
  for (const id of ["search-bfhs", "search-dc-bfhs", "search-smgs", "search-frontier"]) {
    const r = run(id, grid);
    ok(r.peakClosed <= astarClosed, `${id}: peak CLOSED ${r.peakClosed} ≤ A* CLOSED ${astarClosed} on the grid`);
  }
  ok(run("search-bfhs", grid).peakClosed < astarClosed, "BFHS keeps strictly fewer CLOSED nodes than A* on the grid");
  eq(run("search-frontier", grid).peakClosed, 0, "frontier search stores no CLOSED nodes");
  ok(run("search-smgs", grid).pruned > 0, "SMGS prunes some CLOSED nodes on the grid");
  ok(run("search-astar-ub", grid).peakOpen <= run("search-astar-ub", grid).astarPeakOpen, "upper-bound pruning never enlarges OPEN");
  // a bound that is too low finds nothing; a given bound equal to the optimum keeps the optimum
  eq(run("search-astar-ub", grid, { U: 5 }).found === true ? "found" : "none", "none", "U = 5 < C* = 7: no solution within the bound");
  eq(run("search-bfhs", grid, { U: 7 }).cost, 7, "BFHS with U = C* still finds the optimum");
  // frontier search is for undirected graphs only
  eq(checkRun(Studio.get("search-frontier"), { id: "d", type: "graph", directed: true, nodes: [{ id: "A", h: 0 }, { id: "B", h: 0 }], edges: [["A", "B", 1]], start: "A", goal: "B" }), null, "frontier search declines directed graphs");
};
