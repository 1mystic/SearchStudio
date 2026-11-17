// Audit of the SAT area: every taught behaviour is pinned to a shipped example. Hand-checked against truth tables.
// sat-local-trap: h over 0000..1111 = 6 7 6 8 7 6 6 8 6 6 6 7 6 5 5 7 (solutions 0011, 0111; 0100 is a strict local maximum).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const trap = ex("sat-local-trap"), four = ex("sat-four-var"), chain = ex("sat-implication-chain"), ten = ex("sat-ten-var"), unsat = ex("sat-unsat");
  const A = id => Studio.get(id), P = Studio.prepare(trap);

  // ---- local maximum vs plateau
  eq(["0000", "0100", "0011", "0111"].map(b => P.h(b)), [6, 7, 8, 8], "trap: h values");
  const hc = run("sat-hill-climbing", trap);
  eq(hc.path, ["0000", "0100"], "trap: HC path"); eq(hc.stuckOn, "local maximum", "trap: HC stops on a strict local maximum");
  ok(P.nbrs("0100", 1).every(x => x.h === 6), "trap: all neighbours of 0100 are worse");
  eq(run("sat-hill-climbing", four).stuckOn, "plateau", "four-var: HC stops on a plateau");
  ok(/local maximum \(every neighbour is worse\)/.test(Studio.run(A("sat-hill-climbing"), trap, {}).steps.map(s => s.caption).join("\n")), "caption names the local maximum");

  // ---- beam width
  eq(run("sat-beam", trap, { w: 1 }).solved, false, "trap: beam w=1 = HC fails"); eq(run("sat-beam", trap, { w: 1 }).bits, "0100", "w=1 ends at 0100");
  eq(run("sat-beam", trap, { w: 2 }).bits, "0011", "trap: beam w=2 reaches 0011");
  for (const w of [1, 2, 3, 4]) eq(run("sat-beam", four, { w }).bits, "1000", `four-var: beam w=${w} stops on the plateau`);

  // ---- VND, best neighbour
  eq(run("sat-vnd", trap), { bits: "0111", h: 8, solved: true, path: ["0000", "0100", "0111"], moves: 2, maxK: 2 }, "trap: VND escapes with N1–2");
  eq(run("sat-vnd", trap, { kmax: 1 }).solved, false, "trap: VND limited to N1 is hill climbing");
  eq([1, 2, 3, 4].map(k => Studio.satLib.choose(4, k)), [4, 6, 4, 1], "C(4,k)"); eq([1, 2, 3, 4, 5, 6].map(k => Studio.satLib.choose(6, k)), [6, 15, 20, 15, 6, 1], "C(6,k)");
  ok(/C\(6,1\) = 6, C\(6,2\) = 15, C\(6,3\) = 20/.test(Studio.run(A("sat-vnd"), ex("sat-random-3sat"), {}).steps[0].caption), "VND lists neighbourhood sizes");
  const bn = run("sat-best-neighbour", trap, { moves: 8, stop: "no" });
  eq(bn.visited.slice(0, 5), ["0000", "0100", "1100", "0100", "1100"], "trap: best-neighbour cycles 0100 <-> 1100"); eq(bn.cycleAt, 3, "cycle detected at move 3"); eq(bn.solved, false, "trap: cycling never solves");

  // ---- tabu tenure and aspiration
  const t1 = run("sat-tabu", trap, { tenure: 1, iters: 10 });
  eq(t1.solved, false, "tenure 1 cycles"); eq(t1.path.slice(0, 5), ["0000", "0100", "1100", "1000", "0000"], "tenure 1 returns to 0000"); ok(t1.revisits > 0, "tenure 1 revisits strings");
  const t2 = run("sat-tabu", trap, { tenure: 2, iters: 10 });
  eq(t2.path, ["0000", "0100", "1100", "1110", "1111", "0111"], "tenure 2 path"); eq(t2.flips, ["b", "a", "c", "d", "a"], "tenure 2 flips"); eq(t2.solved, true, "tenure 2 solves");
  const noAsp = run("sat-tabu", trap, { tenure: 4, iters: 10, aspiration: "no" });
  eq(noAsp.solved, false, "tenure 4, aspiration off: fails"); eq(noAsp.stopped, true, "stops because every flip is tabu"); eq(noAsp.path[noAsp.path.length - 1], "1111", "stops at 1111");
  const asp = run("sat-tabu", trap, { tenure: 4, iters: 10, aspiration: "yes" });
  eq(asp.solved, true, "tenure 4, aspiration on: solves"); eq(asp.path[asp.path.length - 1], "0111", "aspiration allows the tabu flip of a");
  ok(/aspiration allows/.test(Studio.run(A("sat-tabu"), trap, { tenure: 4, iters: 10 }).steps.map(s => s.caption).join("\n")), "aspiration caption");

  // ---- IHC restarts (course example) keep their known answer
  eq(run("sat-ihc", four, { starts: "0000,1011,0101,1110,0010" }).reaching, ["0101"], "IHC: only 0101 reaches 1101");
  eq(run("sat-ihc", four, { starts: "1110,0010" }).ends, ["1010", "1010"], "IHC: two starts, same local maximum");

  // ---- SA vs random walk on the ten-variable example (seed 2, 30 steps)
  eq(run("sat-hill-climbing", ten).bits, "1000000000", "ten-var: HC stops at 1000000000"); eq(run("sat-hill-climbing", ten).stuckOn, "plateau", "ten-var: HC plateau");
  eq(run("sat-sa", ten, { seed: 2, steps: 30 }).solved, true, "seed 2: SA solves ten-var");
  const rw = run("sat-random-walk", ten, { seed: 2, steps: 30 }); eq(rw.solved, false, "seed 2: random walk does not"); eq(rw.h, 46, "random walk best h 46 of 48");
  let sa = 0, rwc = 0; for (let seed = 1; seed <= 100; seed++) { if (run("sat-sa", ten, { seed, steps: 30 }).solved) sa++; if (run("sat-random-walk", ten, { seed, steps: 30 }).solved) rwc++; }
  eq([sa, rwc], [51, 7], "SA 51 of 100 seeds vs random walk 7 of 100");

  // ---- GA: crossover alone vs mutation needed
  const pop = "1000,0110,0011,1100";
  const gx = run("sat-ga", four, { pop, gens: 1, pm: 0, seed: 1 });
  eq(gx.bits, "1101", "GA pm=0 seed 1: crossover alone makes 1101"); eq(gx.mutated, [], "no mutation happened");
  eq(run("sat-ga", four, { pop, gens: 1, pm: 0.5, seed: 9 }).mutated, ["1101"], "GA pm=0.5 seed 9: mutation makes 1101");
  let created = 0; for (let seed = 1; seed <= 10; seed++) { const r = run("sat-ga", four, { pop: "1000,0110,1100,0100", gens: 20, pm: 0, seed }); if (r.solved || r.population.some(b => b[3] === "1")) created++; }
  eq(created, 0, "crossover alone never creates d = 1 when no parent has it");
  eq(run("sat-ga", four, { pop: "1000,0110,1100,0100", gens: 30, pm: 0.5, seed: 1 }).solved, true, "mutation can create it (seed 1)");

  // ---- DPLL
  const d = run("sat-dpll", chain);
  eq([d.satisfiable, d.bits, d.decisions, d.backtracks, d.propagations, d.pureLiterals, d.conflicts], [true, "1110111", 2, 1, 6, 1, 1], "chain: DPLL counts");
  const cap = Studio.run(A("sat-dpll"), chain, {}).steps.map(s => s.caption);
  eq(cap.slice(1, 4).map(c => c.slice(0, 15)), ["Unit propagatio", "Unit propagatio", "Unit propagatio"], "chain: unit propagation chain a, b, c before any decision");
  ok(/^Pure literal: g/.test(cap[4]), "chain: pure literal g"); ok(/^Decision 1/.test(cap[5]), "chain: decision follows"); ok(cap.some(c => /empty clause/.test(c)) && cap.some(c => /^Backtrack/.test(c)), "chain: conflict and backtrack");
  const f = run("sat-dpll", chain, { order: "FT" }); eq([f.decisions, f.backtracks], [1, 0], "chain: F first avoids the backtrack");
  const np = run("sat-dpll", chain, { pure: "no" }); eq([np.pureLiterals, np.bits], [0, "1110111"], "chain: no pure literal rule, same answer");
  eq(run("sat-hill-climbing", chain).bits, "0001000", "chain: HC stuck at 0001000");
  const du = run("sat-dpll", unsat); eq(du.satisfiable, false, "unsat: DPLL proves UNSAT"); eq(run("sat-brute-force", unsat).h, 4, "unsat: best h = 4 of 5");
  eq(run("sat-dpll", ten).bits, "0010001100", "ten-var: DPLL solution");

  // ---- structure
  for (const a of Studio.algorithms.filter(x => x.problem === "sat")) ok(a.defaultExample && Studio.examples.some(e => e.id === a.defaultExample), `${a.id} has a valid defaultExample`);
  for (const p of [trap, chain, ten]) for (const a of Studio.algorithms.filter(x => x.problem === "sat")) checkRun(a, p, {});
};
