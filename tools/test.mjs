// node tools/test.mjs  — runs every algorithm on every compatible example and on random problems,
// checks step structure and results, and compares deterministic results with known answers.
import { loadStudio } from "./load.mjs";

const { Studio, errors } = loadStudio();
let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("  FAIL", msg); } };
errors.forEach(e => ok(false, e));

const STEP_KEYS = new Set(["caption", "nodes", "edges", "table", "lists", "stats", "chart", "scene", "blocks"]);
function checkRun(algo, prob, params = {}) {
  let r;
  try { r = Studio.run(algo, prob, params); }
  catch (e) {
    if (/limited to/.test(e.message)) return null;
    ok(false, `${algo.id} on ${prob.id}: threw ${e.message}`); return null;
  }
  const P = r.P;
  r.steps.forEach((s, i) => {
    const sc = s.scene || P.scene;
    const valid = new Set(P.ids.concat(sc ? sc.nodes.map(n => n.id) : []));
    const bad = Object.keys(s).filter(k => !STEP_KEYS.has(k));
    if (bad.length) ok(false, `${algo.id} step ${i}: unknown keys ${bad}`);
    if (typeof s.caption !== "string" || !s.caption) ok(false, `${algo.id} step ${i}: missing caption`);
    for (const e of s.edges || []) if (!valid.has(e.u) || !valid.has(e.v)) { ok(false, `${algo.id} step ${i}: edge ${e.u}-${e.v} not in problem`); break; }
    for (const id of Object.keys(s.nodes || {})) if (!valid.has(id)) { ok(false, `${algo.id} step ${i}: node ${id} not in problem`); break; }
    if (s.table) for (const row of s.table.rows) if (row.length !== s.table.columns.length) { ok(false, `${algo.id} step ${i}: row width ${row.length} ≠ ${s.table.columns.length} columns`); break; }
  });
  if (prob.type === "tsp" && r.result.tour) {
    const t = r.result.tour;
    ok(t.length === P.n && new Set(t).size === P.n, `${algo.id} on ${prob.id}: result is a permutation`);
    ok(P.cost(t) === r.result.cost, `${algo.id} on ${prob.id}: reported cost ${r.result.cost} = recomputed ${P.cost(t)}`);
  }
  if (prob.type === "graph" && r.result.found) {
    const p = r.result.path;
    ok(p[0] === P.start && p[p.length - 1] === P.goal, `${algo.id}: path runs start→goal`);
    let c = 0; for (let i = 0; i + 1 < p.length; i++) c += P.w(p[i], p[i + 1]);
    ok(c === r.result.cost, `${algo.id} on ${prob.id}: path cost ${c} = reported ${r.result.cost}`);
  }
  pass++;
  return r;
}

console.log(`${Studio.algorithms.length} algorithms, ${Studio.examples.length} examples`);
const randoms = [Studio.generators.tsp({ n: 7, seed: 3 }), Studio.generators.tsp({ n: 9, seed: 11 }), Studio.generators.graph({ n: 10, seed: 2 }), Studio.generators.graph({ n: 14, seed: 5 }),
  Studio.types.game.generator.make({ b: 3, d: 3, seed: 4 }), Studio.types.game.generator.make({ b: 2, d: 4, seed: 9 }), Studio.types.csp.generator.make({ n: 6 })];
for (const ex of Studio.examples) { try { Studio.prepare(ex); pass++; } catch (e) { ok(false, `prepare ${ex.id}: ${e.message}`); } }
for (const algo of Studio.algorithms) {
  for (const prob of Studio.examples.concat(randoms).filter(p => p.type === algo.problem)) checkRun(algo, prob);
}

// ---------- known answers on the deck instance (from the Python reference) ----------
const six = Studio.examples.find(e => e.id === "tsp-six-cities");
const R = (id, params) => Studio.run(Studio.get(id), six, params).result;
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
eq(R("tsp-brute-force").cost, 224, "brute force optimum");
eq(R("tsp-nearest-neighbour", { start: "A" }).tour.join(","), "A,C,E,D,F,B", "NN tour from A");
eq(R("tsp-nearest-neighbour", { start: "A" }).cost, 264, "NN cost from A");
eq(R("tsp-nearest-neighbour", { start: "C" }).cost, 240, "NN cost from C");
eq(R("tsp-greedy").tour.join(","), "A,C,D,F,B,E", "greedy tour");
eq(R("tsp-greedy").cost, 238, "greedy cost");
const sv = R("tsp-savings", { base: "A" });
eq(sv.tour.join(","), "A,D,B,F,C,E", "savings tour");
eq(sv.merged.slice(0, 3), ["BF", "BD", "CF"], "first three merged pairs");
eq(sv.notMerged.slice(0, 3), ["DF", "BC", "CD"], "first three refused pairs");
eq(R("tsp-savings", { base: "E" }).cost, 229, "savings base E");
eq(R("tsp-two-city-exchange", { start: "greedy" }).cost, 229, "2-city HC from greedy");
eq(R("tsp-two-edge-exchange", { start: "nn" }).cost, 224, "2-opt HC from NN");
eq(R("tsp-two-edge-exchange", { start: "greedy" }).cost, 229, "2-opt HC from greedy");
eq(R("tsp-vnd", { start: "greedy" }).cost, 224, "VND from greedy");
eq(R("tsp-beam", { start: "greedy", w: 1 }).cost, 229, "beam w=1");
eq(R("tsp-beam", { start: "greedy", w: 2 }).cost, 229, "beam w=2");
eq(R("tsp-beam", { start: "greedy", w: 3 }).cost, 224, "beam w=3");
const tb = Studio.run(Studio.get("tsp-tabu"), six, { start: "trap", tenure: 2, iters: 8 });
eq(tb.steps.filter(s => s.table).pop().table.rows.map(r => r[3]), [229, 229, 224, 229, 229, 231, 229, 229, 224], "tabu tt=2 cost sequence");
const tb3 = Studio.run(Studio.get("tsp-tabu"), six, { start: "trap", tenure: 3, iters: 8 });
eq(tb3.steps.filter(s => s.table).pop().table.rows.map(r => r[3]), [229, 229, 224, 229, 237, 233, 231, 224, 229], "tabu tt=3 cost sequence");
// crossovers on the deck parents
const X = Studio.tsp.crossovers, P6 = Studio.prepare(six), P1 = "A,C,D,F,B,E".split(","), P2 = "E,A,F,B,D,C".split(",");
eq(X.cx(P6, P1, P2).child.join(","), "A,C,F,B,D,E", "cycle crossover");
eq(X.pmx(P6, P1, P2, 2, 4).child.join(","), "E,C,D,F,B,A", "PMX 2..4");
eq(X.ox(P6, P1, P2, 2, 4).child.join(","), "E,C,D,F,A,B", "OX 2..4");
eq(X.aex(P6, P1, P2).child.join(","), "A,C,E,B,D,F", "alternating edges");
eq(X.hx(P6, P1, P2).child.join(","), "A,C,E,D,F,B", "heuristic crossover");
eq(X.ordinal(P6, P1, P2, 3).child.join(","), "A,C,D,B,F,E", "ordinal crossover");
eq(X.toOrdinal(P6.ids, "A,D,B,F,C,E".split(",")).code, [1, 3, 1, 3, 1, 1], "ordinal code");
// graph search on G1 and the weighted graph
const g1 = Studio.examples.find(e => e.id === "graph-g1"), gw = Studio.examples.find(e => e.id === "graph-weighted"), gi = Studio.examples.find(e => e.id === "graph-inadmissible");
const G = (id, p, params) => Studio.run(Studio.get(id), p, params).result;
eq(G("search-bfs", g1).path.join(""), "SADG", "BFS on G1");
eq(G("search-dfid", g1).path.join(""), "SADG", "DFID on G1");
const ucs = G("search-ucs", gw), ast = G("search-astar", gw), asi = G("search-astar", gi);
eq(ast.cost, ucs.cost, "A* (admissible h) matches UCS cost");
ok(ast.expanded <= ucs.expanded, `A* expands no more than UCS (${ast.expanded} vs ${ucs.expanded})`);
ok(asi.cost >= ucs.cost, `inadmissible h: A* cost ${asi.cost} ≥ optimum ${ucs.cost}`);
console.log(`  UCS ${ucs.path.join("")} = ${ucs.cost} (${ucs.expanded} expanded); A* ${ast.path.join("")} = ${ast.cost} (${ast.expanded}); A* with bad h ${asi.path.join("")} = ${asi.cost}`);

// ---------- syllabus extensions
const ex = id => Studio.examples.find(e => e.id === id), run = (a, p, q = {}) => Studio.run(Studio.get(a), p, q).result;
for (const g of [gw, gi, g1].concat(randoms.filter(r => r.type === "graph"))) {
  const u = run("search-ucs", g).cost;
  for (const a of ["search-ida-star", "search-rbfs", "search-dcfs"]) { const r = run(a, g); if (g === gi) ok(r.found, `${a} finds a path on ${g.id}`); else eq(r.cost, u, `${a} cost = UCS cost on ${g.id}`); }
}
eq(run("search-monotone-check", gw).admissible, true, "weighted graph h admissible"); eq(run("search-monotone-check", gi).admissible, false, "inadmissible example detected");
for (const g of [ex("game-three-ply"), ex("game-four-ply")].concat(randoms.filter(r => r.type === "game"))) {
  const mm = run("game-minimax", g), ab = run("game-alpha-beta", g), ss = run("game-sss-star", g);
  eq(ab.value, mm.value, `alpha-beta = minimax on ${g.id}`); eq(ss.value, mm.value, `SSS* = minimax on ${g.id}`);
  ok(ss.leaves <= ab.leaves, `SSS* evaluates ≤ alpha-beta leaves on ${g.id} (${ss.leaves} vs ${ab.leaves})`);
  ok(run("game-alpha-beta", g, { order: "best" }).leaves <= ab.leaves, `best ordering prunes at least as much on ${g.id}`);
}
eq(run("game-minimax", ex("game-three-ply")).value, 3, "classic tree value 3");
eq(run("game-alpha-beta", ex("game-three-ply")).pruned, 2, "classic tree prunes 2 leaves");
const BW = Studio.blocks;
for (const id of ["plan-sussman", "plan-reverse"]) { const Pp = Studio.prepare(ex(id));
  for (const a of ["plan-forward", "plan-backward", "plan-gsp", "plan-pop"]) { const plan = run(a, ex(id)).plan; ok(!!plan, `${a} finds a plan for ${id}`); if (!plan) continue;
    let st = Pp.init; let valid = true; for (const n of plan) { const o = Pp.ops.find(x => x.name === n); if (!BW.applicable(o, st)) { valid = false; break; } st = BW.apply(o, st); }
    ok(valid && Pp.goal.every(gl => st.has(gl)), `${a} plan for ${id} is executable and reaches the goal`); } }
eq(run("plan-pop", ex("plan-sussman")).plan.length, 6, "POP: Sussman in 6 steps"); eq(run("plan-gsp", ex("plan-sussman")).plan.length, 10, "GSP: Sussman anomaly costs 10 steps");
eq(run("andor-ao-star", ex("andor-revision")).cost, 3, "AO* solution cost");
for (const id of ["rules-family", "rules-animals"]) eq(run("rules-forward-chaining", ex(id)).facts.slice().sort(), run("rules-rete", ex(id)).facts.slice().sort(), `Rete derives the same facts as forward chaining on ${id}`);
const satisfies = (Pc, A) => Pc.cons.every(c => Studio.cspLib.ok(c, c.scope[0], A[c.scope[0]], c.scope[1], A[c.scope[1]]));
for (const p of [ex("csp-australia"), ex("csp-chain")].concat(randoms.filter(r => r.type === "csp"))) { const Pc = Studio.prepare(p);
  for (const a of ["csp-backtracking", "csp-forward-checking"]) { const s2 = run(a, p).solution; ok(s2 && satisfies(Pc, s2), `${a} solution satisfies ${p.id}`); } }
eq(run("csp-ac3", ex("csp-chain")).domains, { X: [1], Y: [2], Z: [3] }, "AC-3 solves the chain");
eq(run("csp-waltz", ex("waltz-cube")).unique, true, "Waltz: unique cube labelling with background");
eq(run("csp-waltz", ex("waltz-cube-free")).unique, false, "Waltz: ambiguity without background");
eq(JSON.stringify(run("csp-diagnosis", ex("circuit-polybox")).diagnoses), JSON.stringify([["M1"], ["A1"], ["M2", "M3"], ["M2", "A2"]]), "polybox diagnoses");
eq(run("align-dp", ex("align-gattaca")).cost, run("align-astar", ex("align-gattaca")).cost, "alignment: A* = DP cost");
eq(run("align-dp", ex("align-gattaca")).cost, 4, "GATTACA/GCATGCU edit distance 4");
eq(run("align-dp", ex("align-short")).cost, run("align-astar", ex("align-short")).cost, "alignment: A* = DP cost (short)");

console.log(fail ? `\n${fail} FAILED, ${pass} passed` : `\nall ${pass} checks passed`);
process.exit(fail ? 1 : 0);
