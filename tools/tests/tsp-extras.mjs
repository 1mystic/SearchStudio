// Stream G: TSP additions (representation lab, branch & bound, stochastic hill climbing, best neighbour for k moves).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const six = ex("tsp-six-cities"), a = ex("tsp-pyq-five-a"), b = ex("tsp-pyq-five-b"), t13 = ex("tsp-thirteen-cities");
  const rand = [Studio.generators.tsp({ n: 7, seed: 3 }), Studio.generators.tsp({ n: 9, seed: 11 })];

  // ---- independent exhaustive search (does not use the studio's algorithms)
  const optimum = (p) => {
    const P = Studio.prepare(p), rest = P.ids.slice(1); let best = Infinity;
    const go = (left, t, c) => {
      if (c >= best) return;
      if (!left.length) { best = Math.min(best, c + P.d(t[t.length - 1], t[0])); return; }
      left.forEach((x, i) => go(left.slice(0, i).concat(left.slice(i + 1)), t.concat(x), c + P.d(t[t.length - 1], x)));
    };
    go(rest, [P.ids[0]], 0); return best;
  };

  // ---- structure checks on every example and random problem, all new algorithms
  for (const id of ["tsp-representation-lab", "tsp-branch-and-bound", "tsp-stochastic-hc", "tsp-best-neighbour-moves"]) {
    for (const p of [six, a, b, t13].concat(rand)) checkRun(Studio.get(id), p);
  }

  // ================= 1. representation lab (notes' examples)
  // ordinal reference list = the cities of the tour in alphabetical order: D..M for the 10-city tour
  const T1 = "I,L,G,D,F,H,J,E,K,M";
  const rep = run("tsp-representation-lab", t13, { tour: T1 });
  eq(rep.refList.join(""), "DEFGHIJKLM", "ordinal reference list is the tour's cities, alphabetical");
  eq(rep.ordinal, [6, 8, 4, 1, 2, 2, 2, 1, 1, 1], "ordinal of I,L,G,D,F,H,J,E,K,M");
  const T2 = "J,G,F,I,L,M,E,D,H,K";
  const rep2 = run("tsp-representation-lab", t13, { tour: T2 });
  eq(rep2.adjacency, "H,D,I,F,K,L,G,J,M,E".split(","), "adjacency of J,G,F,I,L,M,E,D,H,K (listed in alphabetical order of city, entry = successor)");
  eq(Studio.tsp.crossovers.fromOrdinal(rep.refList, rep.ordinal).join(","), T1, "ordinal decodes back to the tour");
  ok(rep.reversedValid && rep2.reversedValid, "the reversed tour's adjacency is a valid single cycle");
  // the reversed adjacency is the inverse of the forward adjacency
  const inv = {}; rep2.refList.forEach((c, i) => (inv[rep2.adjacency[i]] = c));
  eq(rep2.reversedAdjacency, rep2.refList.map(c => inv[c]), "reversed adjacency = inverse mapping");
  // single-point crossover on ordinal strings always decodes to a tour; the same cut on adjacency lists sometimes does not
  let adjBroken = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const cut of [1, 3, 5, 9]) {
      const r = run("tsp-representation-lab", t13, { tour: T1, cut, seed });
      const good = r.children.every(c => c.length === 10 && new Set(c).size === 10 && c.every(x => T1.split(",").includes(x)));
      ok(good && r.childrenValid, `ordinal one-point crossover gives valid tours (seed ${seed}, cut ${cut})`);
      ok(r.childOrdinal.every(o => o.every((g, i) => g >= 1 && g <= 10 - i)), `child genes stay in 1..n-i+1 (seed ${seed}, cut ${cut})`);
      if (!r.adjacencyChildValid) adjBroken++;
    }
  }
  ok(adjBroken > 0, "one-point crossover on adjacency lists breaks the tour for some cuts (contrast)");

  // ================= 2. branch & bound equals brute force
  eq(run("tsp-brute-force", six).cost, 224, "brute force six cities (reference)");
  for (const [p, want] of [[six, 224], [a, optimum(a)], [b, optimum(b)]]) {
    eq(optimum(p), run("tsp-brute-force", p).cost, `independent search agrees with brute force on ${p.id}`);
    for (const order of ["dfs", "best"]) {
      const r = run("tsp-branch-and-bound", p, { order });
      eq(r.cost, want, `B&B (${order}) optimum on ${p.id}`);
      eq(Studio.prepare(p).cost(r.tour), want, `B&B (${order}) tour cost on ${p.id}`);
    }
  }
  eq(run("tsp-branch-and-bound", six).cost, 224, "B&B on tsp-six-cities = 224");
  eq(Studio.tsp.canon(run("tsp-branch-and-bound", six).tour).join(","), Studio.tsp.canon("A,D,B,F,C,E".split(",")).join(","), "B&B optimum tour A,D,B,F,C,E");
  // root bound = half the sum of two cheapest edges per city (computed by hand: six cities 349/2, practice A 311/2)
  eq(run("tsp-branch-and-bound", six).rootBound, 174.5, "six cities root bound (50+81+54+51+58+55)/2");
  eq(run("tsp-branch-and-bound", a).rootBound, 155.5, "practice set A root bound (92+66+48+40+65)/2");
  for (const p of rand) {
    const want = optimum(p);
    for (const order of ["dfs", "best"]) eq(run("tsp-branch-and-bound", p, { order, maxNodes: 2000 }).cost, want, `B&B (${order}) = exhaustive search on ${p.id}`);
  }
  ok(run("tsp-branch-and-bound", six).pruned > 0, "B&B prunes some nodes on six cities");
  eq(run("tsp-branch-and-bound", six, { ub: 225 }).cost, 224, "a starting bound above the optimum still finds it");
  eq(run("tsp-branch-and-bound", six, { ub: 224 }).tour, null, "a starting bound equal to the optimum prunes everything");

  // ================= 3. stochastic hill climbing
  const sh = Studio.run(Studio.get("tsp-stochastic-hc"), six, { T: 10, tableT: "5,10,20" });
  const sig = sh.steps[0].table;
  eq(sig.columns, ["ΔE", "T=5", "T=10", "T=20"], "sigmoid table columns");
  const zero = sig.rows.find(r => r[0] === 0);
  eq(zero.slice(1), [0.5, 0.5, 0.5], "ΔE = 0 gives P = 0.5 at every T");
  const at5 = sig.rows.find(r => r[0] === 5), at10 = sig.rows.find(r => r[0] === 10);
  eq(at5, [5, 0.731, 0.622, 0.562], "P(ΔE=5) for T = 5, 10, 20 (1/(1+e^-1) = 0.731, 1/(1+e^-0.5) = 0.622, 1/(1+e^-0.25) = 0.562)");
  eq(at10[1], 0.881, "P(ΔE=10, T=5) = 1/(1+e^-2)");
  eq(sig.rows.find(r => r[0] === -10)[1], 0.119, "P(ΔE=-10, T=5) = 1 - P(ΔE=10)");
  ok(sh.steps[0].chart && sh.steps[0].chart.series.length > 3, "sigmoid chart present");
  const s1 = run("tsp-stochastic-hc", six, { seed: 9 }), s2 = run("tsp-stochastic-hc", six, { seed: 9 });
  eq(s1, s2, "stochastic HC is repeatable with the same seed");
  // very cold: behaves like hill climbing, never accepts a worse move
  const cold = Studio.run(Studio.get("tsp-stochastic-hc"), six, { T: 0.01, start: "greedy", steps: 40, seed: 3 });
  const rows = cold.steps[cold.steps.length - 1].table.rows;
  ok(rows.every(r => r[7] !== "accept (worse)"), "T -> 0 never accepts a worse move");
  ok(cold.result.cost <= 238, "cold stochastic HC from greedy (238) is no worse than the start");
  // very hot: ~coin flip, so some worse moves are accepted
  const hot = Studio.run(Studio.get("tsp-stochastic-hc"), six, { T: 1e6, start: "greedy", steps: 40, seed: 3 });
  ok(hot.steps[hot.steps.length - 1].table.rows.some(r => r[7] === "accept (worse)"), "T -> infinity accepts worse moves");
  ok(Math.abs(hot.result.accepted / 40 - 0.5) < 0.25, "T -> infinity accepts about half of the proposals");

  // ================= 4. best neighbour for a fixed number of moves
  const bn = run("tsp-best-neighbour-moves", six, { start: "A,C,D,F,B,E", moves: 8, movegen: "2-city" });
  // independent 2-city exchange, best neighbour (ties: lower tour string), no memory
  const P6 = Studio.prepare(six); let cur = "A,C,D,F,B,E".split(","); const want = [P6.cost(cur)];
  for (let i = 0; i < 8; i++) {
    let bestN = null;
    for (let x = 0; x < 6; x++) for (let y = x + 1; y < 6; y++) { const u = cur.slice(); [u[x], u[y]] = [u[y], u[x]]; const c = P6.cost(u); if (!bestN || c < bestN.c || (c === bestN.c && u.join() < bestN.u.join())) bestN = { u, c }; }
    cur = bestN.u; want.push(bestN.c);
  }
  eq(bn.costs, want, "best-neighbour cost sequence agrees with an independent 2-city implementation");
  eq(bn.costs[0], 238, "greedy start costs 238");
  ok(bn.cycled && bn.cycleLength >= 1, "best neighbour for k moves cycles");
  const trap = run("tsp-best-neighbour-moves", six, { moves: 8 });
  eq(trap.costs, [229, 229, 224, 229, 224, 229, 224, 229, 224], "from the 2-city local optimum (229) the walk bounces 229 / 224");
  eq([trap.cycleStart, trap.cycleLength], [1, 2], "cycle of length 2 detected");
  eq(trap.cost, 224, "bestSeen is the best tour on the walk");
};
