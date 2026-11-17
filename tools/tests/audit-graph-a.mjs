// Audit "graph-a": Weeks 2-3 graph search (DFS, BFS, DFID, depth-bounded DFS, best first, hill climbing, beam) and the
// state-space type. Every classic property has a small hand-traced example; the expected values below were worked out by hand
// on the graphs in examples/graph-{dfs-deep,dfid-closed,hill-trap,plateau,greedy-detour}.json and checked against an
// independent reference (a plain BFS written here, not the tracer's code path).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const names = ["graph-dfs-deep", "graph-dfid-closed", "graph-hill-trap", "graph-plateau", "graph-greedy-detour"];
  const G = Object.fromEntries(names.map(n => [n, ex(n)]));
  const ALGOS = ["search-bfs", "search-dfs", "search-dfid", "search-dfs-bounded", "search-best-first", "search-hill-climbing", "search-beam"];
  for (const n of names) for (const id of ALGOS) checkRun(Studio.get(id), G[n]);
  for (const n of names) for (const w of [1, 2, 3]) checkRun(Studio.get("search-beam"), G[n], { w });
  for (const n of names) for (const b of [0, 1, 2, 3, 4, 5]) checkRun(Studio.get("search-dfs-bounded"), G[n], { depthBound: b });
  const path = (id, g, p) => run(id, g, p).path.join("");

  // independent reference: fewest edges by plain BFS over the edge list
  const fewest = p => {
    const adj = {}; p.edges.forEach(([a, b]) => { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); });
    const d = { [p.start]: 0 }, q = [p.start];
    for (let i = 0; i < q.length; i++) for (const v of adj[q[i]] || []) if (!(v in d)) { d[v] = d[q[i]] + 1; q.push(v); }
    return d[p.goal];
  };
  eq([fewest(G["graph-dfs-deep"]), fewest(G["graph-dfid-closed"])], [3, 3], "reference BFS: both goals are 3 edges from S");

  // ---- DFS dives, BFS and DFID find the fewest-edge path (graph-dfs-deep)
  const deep = G["graph-dfs-deep"];
  eq(path("search-dfs", deep), "SACDEG", "DFS dives down the long branch");
  eq(run("search-dfs", deep).expanded, 6, "DFS: 6 picks");
  eq(path("search-bfs", deep), "SBFG", "BFS returns the 3-edge path");
  eq(run("search-bfs", deep).path.length - 1, fewest(deep), "BFS path length = reference fewest edges");
  ok(run("search-dfs", deep).path.length - 1 > fewest(deep), "DFS path is longer than the fewest-edge path");
  // DFID: bounds 0..3 expand 1 + 3 + 5 + 7 = 16 nodes (S is expanded in every round); BFS expands 7
  const di = run("search-dfid", deep);
  eq([di.path.join(""), di.bound, di.expandedTotal], ["SBFG", 3, 16], "DFID: path SBFG found at bound 3 after 16 expansions");
  const tbl = Studio.run(Studio.get("search-dfid"), deep, {}).steps.at(-1).table.rows;
  eq(tbl.map(r => r[1]), [1, 3, 5, 7, 16], "DFID dry-run table: expansions per round 1, 3, 5, 7 and total 16");
  ok(di.expandedTotal > run("search-bfs", deep).expanded, "DFID re-expands nodes: total expansions exceed BFS");
  // depth-bounded DFS misses a goal beyond the bound
  eq(run("search-dfs-bounded", deep, { depthBound: 2 }).found, false, "bounded DFS, bound 2: the goal at depth 3 is missed");
  eq(path("search-dfs-bounded", deep, { depthBound: 3 }), "SBFG", "bounded DFS, bound 3: finds S-B-F-G (after cutting the long branch at D)");
  eq(path("search-dfs-bounded", deep, { depthBound: 40 }), "SACDEG", "bounded DFS with a huge bound = DFS");

  // ---- DFID reopens nodes first met by a deeper route (graph-dfid-closed)
  const dc = G["graph-dfid-closed"];
  eq(path("search-dfs", dc), "SAXYG", "DFS: 4 edges");
  eq(path("search-bfs", dc), "SBYG", "BFS: 3 edges");
  eq(run("search-dfs-bounded", dc, { depthBound: 3 }).found, false, "bounded DFS, bound 3 misses G at depth 3 (Y was closed at depth 3)");
  eq(path("search-dfs-bounded", dc, { depthBound: 4 }), "SAXYG", "bounded DFS, bound 4 finds the long path");
  const d2 = run("search-dfid", dc);
  eq([d2.path.join(""), d2.bound], ["SBYG", 3], "DFID finds the shallowest goal S-B-Y-G at bound 3 (it reopens Y)");
  ok(Studio.run(Studio.get("search-dfid"), dc, {}).steps.some(s => /shallower route via B \(depth 3 → 2\), reopened/.test(s.caption)), "DFID caption explains the reopening of Y");
  // on every example and random graph DFID's path is as short as BFS's (the property that reopening restores)
  const rnd = [Studio.generators.graph({ n: 10, seed: 2 }), Studio.generators.graph({ n: 14, seed: 5 }), Studio.generators.graph({ n: 12, seed: 9 }), Studio.generators.graph({ n: 8, seed: 4 })];
  for (const g of Studio.examples.filter(e => e.type === "graph").concat(rnd)) {
    const a = run("search-dfid", g), b = run("search-bfs", g);
    eq([a.found, a.found ? a.path.length : 0], [b.found, b.found ? b.path.length : 0], `DFID path has as many nodes as BFS on ${g.id}`);
  }

  // ---- hill climbing stuck, plateau, beam width (graph-hill-trap, graph-plateau)
  const trap = G["graph-hill-trap"];
  const hc = run("search-hill-climbing", trap);
  eq([hc.found, hc.path.join("")], [false, "SL"], "hill climbing stops at the local optimum L");
  ok(/local optimum/.test(Studio.run(Studio.get("search-hill-climbing"), trap, {}).steps.at(-1).caption), "hill climbing final caption names the local optimum");
  eq(run("search-beam", trap, { w: 1 }).found, false, "beam w=1 fails on the trap graph (L, then X, then nothing)");
  eq(path("search-beam", trap, { w: 2 }), "SBCG", "beam w=2 reaches G");
  eq(path("search-beam", trap, { w: 3 }), "SBCG", "beam w=3 reaches G");
  eq(path("search-best-first", trap), "SBCG", "best first is not trapped (OPEN remembers B)");
  eq(run("search-best-first", trap).expanded, 5, "best first expands S, L, B, C, G");
  eq(path("search-dfs", trap), "SBCG", "DFS also finds S-B-C-G (L is a dead end it backs out of)");
  const pl = G["graph-plateau"];
  const hp = run("search-hill-climbing", pl);
  eq([hp.found, hp.path.join("")], [false, "SA"], "hill climbing stops on the plateau at A");
  ok(/plateau/.test(Studio.run(Studio.get("search-hill-climbing"), pl, {}).steps.at(-2).caption), "plateau caption says plateau");
  eq(path("search-beam", pl, { w: 1 }), "SABCG", "beam w=1 walks across the plateau");
  eq(path("search-best-first", pl), "SABCG", "best first walks across the plateau");

  // ---- best first is not optimal (graph-greedy-detour)
  const gd = G["graph-greedy-detour"];
  eq([path("search-best-first", gd), run("search-best-first", gd).cost], ["SAG", 11], "best first: S-A-G, cost 11");
  eq([path("search-hill-climbing", gd), run("search-hill-climbing", gd).cost], ["SAG", 11], "hill climbing: S-A-G, cost 11");
  eq([path("search-ucs", gd), run("search-ucs", gd).cost], ["SBG", 4], "UCS: S-B-G, cost 4");
  eq(path("search-astar", gd), "SBG", "A* finds S-B-G");
  const gw = ex("graph-weighted");
  ok(run("search-best-first", gw).cost > run("search-ucs", gw).cost, "best first is more expensive than UCS on graph-weighted");
  // BFS is fewest edges, not cheapest
  ok(run("search-bfs", gd).cost > run("search-ucs", gd).cost, "BFS (fewest edges) is not cheapest on graph-greedy-detour");

  // final captions state the property
  ok(/no guarantee/.test(Studio.run(Studio.get("search-dfs"), deep, {}).steps.at(-1).caption), "DFS final caption says the path is not guaranteed shortest");
  ok(/fewest edges/.test(Studio.run(Studio.get("search-bfs"), deep, {}).steps.at(-1).caption), "BFS final caption says fewest edges");
  ok(/not guaranteed cheapest/.test(Studio.run(Studio.get("search-best-first"), gd, {}).steps.at(-1).caption), "best first final caption says not guaranteed cheapest");

  // default examples exist and are accepted
  for (const id of ["search-bfs", "search-dfs", "search-dfid", "search-dfs-bounded", "search-best-first", "search-hill-climbing", "search-beam", "statespace-bfs", "statespace-dfs", "statespace-simple", "statespace-best-first", "statespace-astar"]) {
    const a = Studio.get(id); ok(!!a.defaultExample && !!Studio.examples.find(e => e.id === a.defaultExample && e.type === a.problem), `${id} has a valid defaultExample`);
  }

  // ---- state space (week 2-3): jug 7 litres, 8-puzzle 12 moves
  const j7 = ex("space-jug-seven"), p12 = ex("space-8-puzzle-12"), p5 = ex("space-8-puzzle"), jug = ex("space-water-jug");
  // independent reference BFS over pourings of 8-5-3 (not the tracer)
  const cap = [8, 5, 3];
  const nexts = s => { const out = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i === j) continue; const a = Math.min(s[i], cap[j] - s[j]); if (a <= 0) continue; const t = s.slice(); t[i] -= a; t[j] += a; out.push(t); } return out; };
  const refJug = pred => { const seen = new Map([["8,0,0", 0]]), q = [[8, 0, 0]]; for (let i = 0; i < q.length; i++) { if (pred(q[i])) return seen.get(q[i].join(",")); for (const t of nexts(q[i])) if (!seen.has(t.join(","))) { seen.set(t.join(","), seen.get(q[i].join(",")) + 1); q.push(t); } } return null; };
  eq(refJug(s => s.includes(7)), 5, "reference BFS: 7 litres in some jug needs 5 pourings");
  eq(run("statespace-bfs", j7).length, 5, "BFS: 5 pourings for 7 litres");
  eq(run("statespace-dfs", j7).length, 9, "DFS: 9 pourings for 7 litres (not shortest)");
  eq(run("statespace-dfs", j7).path.at(-1).split(",").includes("7"), true, "DFS ends with 7 litres in a jug");
  eq(run("statespace-dfs", j7, { depthBound: 4 }).found, false, "DFS with depth bound 4 misses the 5-move goal");
  eq(run("statespace-dfs", j7, { depthBound: 5 }).length, 5, "DFS with depth bound 5 finds a 5-pouring plan");
  ok(/shorter solution may exist/.test(Studio.run(Studio.get("statespace-dfs"), j7, {}).steps.at(-1).caption), "statespace DFS final caption says a shorter solution may exist");
  ok(/no solution has fewer moves/.test(Studio.run(Studio.get("statespace-bfs"), j7, {}).steps.at(-1).caption), "statespace BFS final caption says fewest moves");
  // simple search loses the path
  for (const open of ["queue", "stack"]) {
    const r = run("statespace-simple", jug, { open });
    eq([r.found, r.path], [true, null], `simple search (${open}) reaches the goal but has no path`);
  }
  eq(run("statespace-simple", jug, { open: "queue" }).expanded, 15, "simple search queue: 15 expansions (same as BFS)");
  eq(run("statespace-simple", jug, { open: "stack" }).expanded, 9, "simple search stack: 9 expansions (same as DFS)");
  ok(/path cannot be recovered/.test(Studio.run(Studio.get("statespace-simple"), jug, {}).steps.at(-1).caption), "simple search final caption says the path is lost");
  eq(run("statespace-bfs", jug).path.length, 8, "BFS on the same problem recovers an 8-state path");
  // 8-puzzle, 12 moves from the goal: sharper admissible h expands fewer states, both optimal; BFS and h=0 hit the cap
  const am = run("statespace-astar", p12, { h: "manhattan" }), ao = run("statespace-astar", p12, { h: "misplaced" });
  eq([am.length, am.expanded], [12, 16], "A* Manhattan: 12 moves, 16 expansions");
  eq([ao.length, ao.expanded], [12, 79], "A* tiles out of place: 12 moves, 79 expansions");
  ok(am.expanded < ao.expanded, "Manhattan expands fewer states than tiles out of place");
  eq([run("statespace-bfs", p12).found, run("statespace-bfs", p12).capped], [false, true], "BFS hits the 400-expansion cap on the 12-move board");
  eq(run("statespace-astar", p12, { h: "none" }).capped, true, "A* with h = 0 hits the cap too");
  const bm = run("statespace-best-first", p12, { h: "manhattan" }), bo = run("statespace-best-first", p12, { h: "misplaced" });
  eq([bm.length, bm.expanded], [12, 28], "best first Manhattan: 12 moves, 28 expansions");
  eq([bo.length, bo.expanded], [44, 208], "best first tiles out of place: 44 moves (not optimal), 208 expansions");
  // the optimum 12 is confirmed by an uncapped BFS (about 1450 expansions)
  eq(run("statespace-bfs", p12, { maxExpand: 1600 }).length, 12, "uncapped BFS agrees: 12 moves is optimal");
  // easy board: the two heuristics tie
  eq([run("statespace-astar", p5, { h: "manhattan" }).expanded, run("statespace-astar", p5, { h: "misplaced" }).expanded, run("statespace-bfs", p5).expanded], [6, 6, 35], "5-move board: A* 6 and 6 expansions, BFS 35");
  for (const id of ["statespace-bfs", "statespace-dfs", "statespace-simple", "statespace-best-first", "statespace-astar"]) for (const p of [j7, p12]) checkRun(Studio.get(id), p);
};
