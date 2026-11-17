// Known answers for the state-space problem type (water jugs, 8-puzzle, missionaries and cannibals).
// Reference values were computed by an independent throwaway breadth-first script (not committed).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const ALGOS = ["statespace-bfs", "statespace-dfs", "statespace-simple", "statespace-best-first", "statespace-astar"];
  const jug = ex("space-water-jug"), puz = ex("space-8-puzzle"), mc = ex("space-missionaries");
  const gen = Studio.types.statespace.generator.make({ moves: 10, seed: 3 }), gen2 = Studio.types.statespace.generator.make({ moves: 10, seed: 7 });
  const any4 = Object.assign({}, jug, { id: "jug-any-4", goal: { contains: 4 } });

  // every algorithm on every example and generated problem, structure-checked
  for (const id of ALGOS) for (const p of [jug, puz, mc, any4, gen, gen2]) {
    const small = p === gen || p === gen2 ? { maxExpand: 100 } : {};
    checkRun(Studio.get(id), p, small);
    if (id === "statespace-astar" || id === "statespace-best-first") for (const h of ["misplaced", "none"]) checkRun(Studio.get(id), p, Object.assign({ h }, small));
  }
  checkRun(Studio.get("statespace-dfs"), puz, { depthBound: 6 });
  checkRun(Studio.get("statespace-simple"), puz, { open: "stack" });

  // water jugs 8-5-3 from (8,0,0): 16 reachable states; 4+4 split needs 7 pourings, "some jug holds 4" needs 6
  const Pj = Studio.prepare(jug);
  eq(Pj.reachable, 16, "water jugs: 16 reachable states"); eq(Pj.truncated, false, "water jugs: preview not truncated");
  eq(run("statespace-bfs", jug).length, 7, "BFS: 8-5-3 split 4+4 in 7 pourings");
  eq(run("statespace-bfs", any4).length, 6, "BFS: some jug holds 4 in 6 pourings");
  ok(run("statespace-bfs", jug).expanded <= 16, "BFS expands at most the 16 reachable states");
  eq(run("statespace-bfs", jug).path[0], "8,0,0", "path starts at the start state");
  eq(run("statespace-bfs", jug).path.slice(-1)[0], "4,4,0", "path ends at (4,4,0)");
  ok(run("statespace-dfs", jug).length >= 7, "DFS solution is not shorter than BFS");
  ok(run("statespace-dfs", jug).found, "DFS finds a solution");

  // replay a returned path through MoveGen
  const replay = (p, r) => { const D = Studio.prepare(p).dom; let ok1 = r.path[0] === D.init; for (let i = 1; i < r.path.length; i++) ok1 = ok1 && D.moves(r.path[i - 1]).some(m => m.to === r.path[i]); return ok1 && D.isGoal(r.path[r.path.length - 1]); };
  for (const p of [jug, any4, puz, mc, gen, gen2]) for (const id of ["statespace-bfs", "statespace-dfs", "statespace-best-first", "statespace-astar"]) {
    if (id === "statespace-dfs" && !["space-water-jug", "jug-any-4", "space-missionaries"].includes(p.id)) continue;
    const r = run(id, p, { maxExpand: 800 }); ok(r.found && replay(p, r), `${id} on ${p.id}: path is a legal move sequence ending at the goal`);
  }

  // 8-puzzle: 5 moves optimal (BFS over all 181 440 states agrees); A* with either heuristic is optimal, Manhattan expands no more
  const bfs = run("statespace-bfs", puz), am = run("statespace-astar", puz, { h: "manhattan" }), ao = run("statespace-astar", puz, { h: "misplaced" });
  eq(bfs.length, 5, "8-puzzle: BFS length 5"); eq(am.length, 5, "A* Manhattan: length 5"); eq(ao.length, 5, "A* misplaced: length 5");
  ok(am.expanded <= ao.expanded, `A* Manhattan expands ≤ misplaced (${am.expanded} vs ${ao.expanded})`);
  ok(ao.expanded <= bfs.expanded, `A* misplaced expands ≤ BFS (${ao.expanded} vs ${bfs.expanded})`);
  for (const p of [gen, gen2]) {
    const b = run("statespace-bfs", p, { maxExpand: 800 }), a1 = run("statespace-astar", p, { h: "manhattan", maxExpand: 800 }), a2 = run("statespace-astar", p, { h: "misplaced", maxExpand: 800 });
    eq(a1.length, b.length, `A* Manhattan optimal on ${p.id}`); eq(a2.length, b.length, `A* misplaced optimal on ${p.id}`);
    ok(a1.expanded <= a2.expanded, `Manhattan ≤ misplaced expansions on ${p.id} (${a1.expanded} vs ${a2.expanded})`);
  }
  ok(run("statespace-best-first", puz).length >= 5, "best first solution is not shorter than optimal");
  eq(Studio.prepare(puz).truncated, true, "8-puzzle preview is capped");
  eq(Studio.prepare(puz).ids.length, 40, "8-puzzle preview holds 40 states");

  // missionaries and cannibals (3, 3, boat 2): 11 crossings, 16 reachable states; A* with the full-boat bound is optimal
  eq(run("statespace-bfs", mc).length, 11, "M&C: BFS 11 crossings"); eq(run("statespace-astar", mc).length, 11, "M&C: A* 11 crossings");
  eq(Studio.prepare(Object.assign({}, mc, { cap: 100 })).reachable, 16, "M&C: 16 reachable safe states");
  eq(run("statespace-bfs", Object.assign({}, mc, { id: "mc-4-3", missionaries: 4, cannibals: 3 })).found, true, "M&C 4 missionaries, 3 cannibals is solvable");
  eq(run("statespace-bfs", Object.assign({}, mc, { id: "mc-4-4", missionaries: 4, cannibals: 4 }), { maxExpand: 1000 }).found, false, "M&C 4+4 with boat 2 has no solution");

  // simple search: the goal is reached but the path cannot be recovered
  const sr = run("statespace-simple", jug);
  eq(sr.found, true, "simple search reaches the goal"); eq(sr.path, null, "simple search cannot recover the path");

  // expansion cap, depth bound and validation
  eq(run("statespace-bfs", puz, { maxExpand: 3 }).capped, true, "expansion cap stops the search");
  eq(run("statespace-dfs", puz, { depthBound: 2 }).found, false, "depth bound 2 cannot reach a 5-move goal");
  let threw = false; try { Studio.validateProblem(Object.assign({}, puz, { id: "bad", start: "823164705" })); } catch (e) { threw = /never reach/.test(e.message); }
  ok(threw, "an unsolvable 8-puzzle start is rejected");
  threw = false; try { Studio.validateProblem({ id: "bad2", type: "statespace", domain: "chess" }); } catch (e) { threw = true; }
  ok(threw, "unknown domain is rejected");
  eq(Studio.types.statespace.generator.make({ moves: 10, seed: 3 }), gen, "generator is deterministic for a seed");
};
