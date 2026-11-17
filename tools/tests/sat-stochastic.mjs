// Stochastic SAT methods (iterated HC, random walk, stochastic HC, SA, GA) and SAT as a CSP (DPLL). Loaded by tools/test.mjs.
// Known answers: course notes Week 4 (example 3a, four variables a b c d, unique solution 1101).
// Validated independently by throwaway scripts: HC outcome of all 16 starts (only 0001 0100 0101 0111 1001 1100 1111 reach 1101
// besides 1101 itself) and a truth-table scan of every random instance (not the tracer).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const T = Studio.types.sat, four = ex("sat-four-var"), unsat = ex("sat-unsat"), P4 = Studio.prepare(four), A = id => Studio.get(id);
  const bf = p => run("sat-brute-force", p);

  // ---- iterated hill climbing: 5 starts, only 0101 reaches 1101
  const ihc = run("sat-ihc", four, { starts: "0000,1011,0101,1110,0010" });
  eq(ihc.reaching, ["0101"], "IHC: only start 0101 reaches 1101"); eq(ihc.bits, "1101", "IHC best is 1101"); eq(ihc.ends, ["1000", "1011", "1101", "1010", "1010"], "IHC local maxima of the five starts");
  eq(run("sat-ihc", four, { starts: "0101" }).bits, "1101", "HC from 0101 reaches 1101");
  eq(run("sat-ihc", four, { starts: "0000" }).bits, "1000", "HC from 0000 stops at 1000");
  eq(run("sat-ihc", four, { starts: "0000,1011,0101,1110,0010", stop: "yes" }).starts.length, 5, "IHC stop=yes keeps the list of starts");
  eq(run("sat-ihc", four, { starts: "random", restarts: 6, seed: 4 }).starts, run("sat-ihc", four, { starts: "random", restarts: 6, seed: 4 }).starts, "IHC random starts repeat per seed");
  eq(run("sat-ihc", four, { starts: "random", restarts: 6, seed: 4 }).starts.length, 6, "IHC draws r random starts");

  // ---- random walk, stochastic HC, SA: reproducible per seed, results consistent with h
  for (const id of ["sat-random-walk", "sat-stochastic-hc", "sat-sa"]) {
    const a = run(id, four, { seed: 5 }), b = run(id, four, { seed: 5 });
    eq(a, b, `${id}: same seed, same result`);
    eq(P4.h(a.bits), a.h, `${id}: reported h is the recomputed h`);
    ok([1, 2, 3, 4, 5, 6, 7, 8].some(s => run(id, four, { seed: s }).visited.join() !== a.visited.join()), `${id}: different seeds give different walks`);
  }
  eq(run("sat-random-walk", four, { seed: 4 }).bits, "1101", "random walk seed 4 finds 1101");
  eq(run("sat-sa", four, { seed: 1 }).bits, "1101", "SA seed 1 finds 1101"); eq(run("sat-sa", four, { seed: 1 }).solved, true, "SA seed 1 solved");
  eq(run("sat-stochastic-hc", four, { seed: 3, T: 1 }).bits, "1101", "stochastic HC seed 3, T 1 finds 1101");
  const lin = run("sat-sa", four, { seed: 1, schedule: "linear", T0: 2, Tend: 0.1, steps: 20 }); eq(P4.h(lin.bits), lin.h, "SA linear schedule runs");
  const shcSteps = Studio.run(A("sat-stochastic-hc"), four, { T: 1, tableT: "1,2" }).steps;
  eq(shcSteps[0].table.rows.find(r => r[0] === 0), [0, 0.5, 0.5], "sigmoid table: ΔE = 0 gives P = 0.5 for every T");
  eq(shcSteps[0].table.rows.find(r => r[0] === 1), [1, 0.731, 0.622], "sigmoid table: ΔE = 1 gives 1/(1+e^-1) = 0.731 at T 1 and 0.622 at T 2");
  let threw = false; try { Studio.run(A("sat-sa"), four, { T0: 0 }); } catch (e) { threw = true; } ok(threw, "SA rejects T0 ≤ 0");
  // acceptance probabilities shown in the SA trace match the formula
  const saTbl = Studio.run(A("sat-sa"), four, { seed: 1, steps: 6 }).steps.filter(s => s.table && s.table.columns.length === 9).pop().table;
  for (const r of saTbl.rows) ok(Math.abs(r[6] - 1 / (1 + Math.exp(-r[5] / r[1]))) < 0.002, `SA row ${r[0]}: P = 1/(1+e^(−ΔE/T))`);

  // ---- genetic algorithm: one generation from an explicit population produces 1101 by mutation
  const ga = run("sat-ga", four, { pop: "1000,0110,0011,1100", gens: 1, pm: 0.5, seed: 9 });
  eq(ga.bits, "1101", "GA generation 1 contains 1101"); eq(ga.solvedAt, 1, "GA solution first seen in generation 1"); eq(ga.mutated, ["1101"], "GA: 1101 was produced by mutation");
  eq(run("sat-ga", four, { pop: "1000,0110,0011,1100", gens: 1, pm: 0.5, seed: 9 }), ga, "GA is reproducible per seed");
  eq(run("sat-ga", four, { pop: "1000,0110,0011,1100", gens: 1, pm: 0, seed: 9 }).mutated, [], "GA with pm = 0 never mutates");
  const gaSteps = Studio.run(A("sat-ga"), four, { pop: "1000,0110,0011,1100", gens: 1, seed: 9 }).steps;
  eq(gaSteps[1].table.rows.map(r => [r[1], r[2], r[3]]), [["1000", 5, 0.294], ["0110", 3, 0.176], ["0011", 4, 0.235], ["1100", 5, 0.294]], "GA population table: fitness h and p = h/Σh (5, 3, 4, 5 of Σ 17)");
  eq(gaSteps[3].table.rows[1].slice(2), ["child 2", "1100", "mutate bit d", "1101", 6], "GA: child 1100 mutated at d gives 1101");
  ok(run("sat-ga", four, { pop: "random", N: 6, gens: 5, seed: 2 }).h <= 6, "GA random population runs");
  eq(run("sat-ga", four, { pop: "random", N: 6, gens: 3, seed: 2 }).population.length, 6, "GA keeps the population size");

  // ---- DPLL / SAT as a CSP
  const d = run("sat-dpll", four);
  eq(d.satisfiable, true, "DPLL: course example is satisfiable"); eq(d.bits, "1101", "DPLL finds 1101"); eq(P4.h(d.bits), 6, "DPLL result has h = m");
  eq(run("sat-dpll", four, { order: "FT" }).bits, "1101", "DPLL with F first also finds the unique solution");
  eq(run("sat-dpll", four, { pure: "no" }).bits, "1101", "DPLL without pure literals finds 1101");
  const du = run("sat-dpll", unsat); eq(du.satisfiable, false, "DPLL reports UNSAT on sat-unsat"); ok(du.backtracks > 0, "DPLL backtracks on the unsatisfiable example"); eq(bf(unsat).solved, false, "brute force agrees: sat-unsat has no solution");
  eq(run("sat-dpll", unsat, { pure: "no" }).satisfiable, false, "UNSAT also without the pure literal rule");
  const dc = Studio.run(A("sat-dpll"), four).steps.map(s => s.caption).join("\n");
  ok(/Unit propagation/.test(dc), "DPLL trace shows unit propagation"); ok(/Pure literal|Decision/.test(dc), "DPLL trace shows decisions or pure literals");
  eq(Studio.run(A("sat-dpll"), unsat).steps.map(s => s.caption).join("\n").includes("empty clause"), true, "DPLL trace shows an empty clause");
  eq(Studio.run(A("sat-dpll"), unsat).steps.pop().caption.startsWith("UNSATISFIABLE"), true, "DPLL final caption says UNSATISFIABLE");
  // agreement with the truth table on random 3-SAT, n ≤ 6, many seeds and clause counts
  let n = 0, unsatSeen = 0, satSeen = 0;
  for (const nv of [3, 4, 5, 6]) for (const m of [4, 8, 14, 20, 26, 34]) for (let seed = 1; seed <= 12; seed++) {
    const p = T.generator.make({ n: nv, m, seed }), truth = bf(p).solved, r = run("sat-dpll", p), Pp = Studio.prepare(p);
    eq(r.satisfiable, truth, `DPLL agrees with brute force on ${p.id}`); n++; truth ? satSeen++ : unsatSeen++;
    if (r.satisfiable) ok(Pp.solved(r.bits), `DPLL assignment satisfies ${p.id}`);
    if (seed <= 2) checkRun(A("sat-dpll"), p, {});
  }
  ok(unsatSeen > 5 && satSeen > 5, `random sweep covers both outcomes (${satSeen} sat, ${unsatSeen} unsat of ${n})`);

  // ---- every new algorithm passes checkRun on generated problems (also bigger ones)
  for (const p of [T.generator.make({ n: 5, m: 12, seed: 2 }), T.generator.make({ n: 8, m: 30, seed: 3 }), T.generator.make({ n: 12, m: 50, seed: 4 }), unsat]) {
    for (const id of ["sat-ihc", "sat-random-walk", "sat-stochastic-hc", "sat-sa", "sat-ga", "sat-dpll"]) {
      checkRun(A(id), p, {}); checkRun(A(id), p, { seed: 17 });
    }
  }
};
