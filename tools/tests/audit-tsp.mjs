// Audit of the TSP area: every property the course teaches is shown by a shipped example, with a known answer.
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const six = ex("tsp-six-cities"), pa = ex("tsp-pyq-five-a"), pb = ex("tsp-pyq-five-b"), asp = ex("tsp-tabu-aspiration"), gap = ex("tsp-ga-premature");
  const caps = (id, p, q) => Studio.run(Studio.get(id), p, q).steps.map(s => s.caption);
  const tspAlgos = Studio.algorithms.filter(a => a.problem === "tsp");

  // ---- the new examples run through every TSP algorithm
  for (const a of tspAlgos) for (const p of [asp, gap]) checkRun(a, p);
  for (const a of ["tsp-tabu", "tsp-representation-lab"]) ok(Studio.examples.some(e => e.id === Studio.get(a).defaultExample), `${a} defaultExample exists`);

  // ---- exact optimum helper (Held-Karp) agrees with brute force
  for (const p of [six, pa, pb, asp, gap].concat([Studio.generators.tsp({ n: 7, seed: 3 }), Studio.generators.tsp({ n: 8, seed: 5 })])) {
    const P = Studio.prepare(p);
    if (P.n <= 9) eq(Studio.tspSteps.optimum(P), run("tsp-brute-force", p).cost, `exact optimum on ${p.id}`);
  }
  eq(Studio.tspSteps.optimum(Studio.prepare(Studio.examples.find(e => e.id === "tsp-thirteen-cities"))), null, "no exact optimum above 10 cities");
  eq([Studio.tspSteps.optimum(Studio.prepare(six)), Studio.tspSteps.optimum(Studio.prepare(asp)), Studio.tspSteps.optimum(Studio.prepare(gap))], [224, 241, 255], "optima of six / aspiration / GA examples");

  // ---- Nearest neighbour depends on the start city
  eq(Studio.prepare(six).ids.map(s => run("tsp-nearest-neighbour", six, { start: s }).cost), [264, 238, 240, 240, 238, 238], "NN cost from each start (six cities)");
  eq(Studio.prepare(pa).ids.map(s => run("tsp-nearest-neighbour", pa, { start: s }).cost), [177, 199, 251, 177, 199], "NN cost from each start (practice A)");
  ok(/return leg is the longest edge/.test(caps("tsp-nearest-neighbour", six, { start: "A" }).pop()), "NN from A: return leg flagged as longest edge");

  // ---- Greedy refuses premature cycles and degree-3 cities
  const g = caps("tsp-greedy", six);
  ok(g.some(c => /^CE = 31: reject, premature cycle/.test(c)), "greedy refuses CE as a premature cycle");
  ok(g.some(c => /^CF = 37: reject, degree\(C\) is already 2/.test(c)), "greedy refuses CF (degree 3)");
  ok(g.some(c => /^BE = 101: accept \(closes the tour\)/.test(c)), "greedy: only the last edge may close the cycle");
  eq(run("tsp-greedy", six).cost, 238, "greedy 238 is not optimal");

  // ---- Savings refusals: same sub-tour and interior city, and base dependence
  const sa = caps("tsp-savings", six, { base: "A" });
  ok(sa.some(c => /^DF .* same sub-tour/.test(c)), "savings base A refuses DF (same sub-tour)");
  ok(!sa.some(c => /interior/.test(c)), "savings base A has no interior refusal");
  const sE = caps("tsp-savings", six, { base: "E" });
  ok(sE.some(c => /^AD \(S = 42\): no merge, D is interior/.test(c)), "savings base E refuses AD because D is interior");
  eq([run("tsp-savings", six, { base: "A" }).cost, run("tsp-savings", six, { base: "E" }).cost], [224, 229], "savings depends on the base city");
  eq(Studio.prepare(pb).ids.map(b => run("tsp-savings", pb, { base: b }).cost), [247, 250, 247, 247, 247], "savings bases (practice B)");

  // ---- 2-opt reaches a local optimum that is not global; VND / 3-edge / Or-opt escape
  const two = Studio.run(Studio.get("tsp-two-edge-exchange"), six, { start: "greedy" });
  eq(two.result.cost, 229, "2-opt from greedy stops at 229");
  ok(/only a LOCAL optimum: the global optimum is 224/.test(two.steps[two.steps.length - 1].caption), "2-opt caption says local, not global, with the true optimum");
  const nnTwo = Studio.run(Studio.get("tsp-two-edge-exchange"), six, { start: "nn" });
  ok(/also the global optimum \(224/.test(nnTwo.steps[nnTwo.steps.length - 1].caption), "2-opt from NN: caption says it is the global optimum");
  const v = Studio.run(Studio.get("tsp-vnd"), six, { start: "greedy" });
  ok(/\(238→229, 229→229, 229→224\)/.test(v.steps[v.steps.length - 1].caption), "VND phases 238→229→229→224");
  eq(v.result.cost, 224, "VND escapes the 2-opt local optimum");
  eq(run("tsp-vnd", six, { start: "greedy", order: "2-edge,or-opt,3-edge" }).cost, 224, "VND with Or-opt phase");
  eq(run("tsp-or-opt", six, { start: "greedy" }).cost, 224, "Or-opt from greedy reaches 224");
  eq([run("tsp-three-edge-exchange", six, { start: "nn" }).cost, run("tsp-two-edge-exchange", six, { start: "nn" }).cost], [229, 224], "pure 3-edge from NN is stuck at 229 while 2-edge reaches 224");
  // from the 2-opt optimum a 3-edge move improves it
  const t3 = Studio.tsp.moveGens["3-edge"].fn(Studio.prepare(six), run("tsp-two-edge-exchange", six, { start: "greedy" }).tour);
  ok(Math.min(...t3.map(r => r.cost)) === 224, "a 3-edge neighbour of the 2-opt optimum costs 224");
  const t2 = Studio.tsp.moveGens["2-edge"].fn(Studio.prepare(six), run("tsp-two-edge-exchange", six, { start: "greedy" }).tour);
  ok(Math.min(...t2.map(r => r.cost)) >= 229, "no 2-edge neighbour of that tour is better");

  // ---- Beam width
  eq([1, 2, 3].map(w => run("tsp-beam", six, { start: "greedy", w }).cost), [229, 229, 224], "beam width 1, 2, 3");

  // ---- Tabu: aspiration overrides the tenure
  const ta = Studio.run(Studio.get("tsp-tabu"), asp, {});
  const tc = ta.steps.map(s => s.caption);
  ok(/^Start G,B,C,A,D,F,E = 254/.test(tc[0]), "tabu default start on the aspiration example is the 254 trap");
  ok(/^Iteration 4: swap D↔F → 241 — tabu, allowed by aspiration/.test(tc[4]), "iteration 4: tabu swap D↔F allowed by aspiration");
  eq(ta.result.cost, 241, "tabu with aspiration reaches the optimum 241");
  const tn = Studio.run(Studio.get("tsp-tabu"), asp, { aspiration: "no" });
  eq(tn.result.cost, 249, "without aspiration the best is only 249");
  ok(!tn.steps.some(s => /aspiration/.test(s.caption)), "aspiration off: never used");
  ok(/skipped tabu swap D↔F \(249\)|skipped tabu swap D↔F \(241\)|skipped tabu swap D↔F/.test(tn.steps[4].caption) || /skipped tabu/.test(tn.steps[4].caption), "aspiration off: the tabu move is skipped");
  ok(tn.steps[4].caption.includes("skipped tabu swap D↔F (241)"), "aspiration off: the refused move would have given 241");
  // six cities: tenure changes how often the walk revisits tours
  const rev = t => caps("tsp-tabu", six, { tenure: t }).filter(c => /seen before/.test(c)).length;
  eq([rev(2), rev(3)], [5, 3], "tabu on six cities: tenure 2 revisits tours 5 times, tenure 3 only 3");

  // ---- Best neighbour for k moves cycles; period stays 2
  const bn = caps("tsp-best-neighbour-moves", six);
  ok(bn.filter(c => /going round a cycle of length/.test(c)).every(c => /length 2,/.test(c)), "best neighbour: reported cycle length stays 2");

  // ---- SA: worse moves early, settles late, temperature effect
  const sd = Studio.run(Studio.get("tsp-sa"), six, {});
  const sc = sd.steps.map(s => s.caption);
  ok(/^k = 1, T = 30: .*accept \(worse\)/.test(sc[1]), "SA accepts a worse move at k = 1 (T = 30)");
  ok(sc.slice(8, 13).every(c => !/accept \(worse\)/.test(c)), "SA accepts no worse move in the last steps (T low)");
  eq(sd.result.cost, 224, "SA default escapes the 229 trap");
  ok(/Worse moves accepted: 1 in the hot first half .*1 in the cool second half/.test(sc[sc.length - 1]), "SA final caption counts worse moves per half");
  const cold = Studio.run(Studio.get("tsp-sa"), six, { T0: 1 });
  eq([cold.result.cost, cold.result.worseEarly + cold.result.worseLate], [229, 0], "SA at T0 = 1 never accepts a worse move: stuck at 229");
  const hotLong = Studio.run(Studio.get("tsp-sa"), six, { T0: 1000, steps: 80, alpha: 1 });
  ok(hotLong.result.worseEarly + hotLong.result.worseLate >= 10, "SA at constant very high T accepts many worse moves (random walk)");
  const longRun = Studio.run(Studio.get("tsp-sa"), six, { T0: 30, steps: 120, alpha: 0.9 });
  ok(longRun.result.worseEarly > longRun.result.worseLate, `SA worse moves fall as T falls (${longRun.result.worseEarly} vs ${longRun.result.worseLate})`);

  // ---- Random walk never converges
  const rw = Studio.run(Studio.get("tsp-random-walk"), six, { steps: 60 });
  ok(rw.result.high - rw.result.low >= 100, `random walk range is wide (${rw.result.low}..${rw.result.high})`);
  ok(rw.result.tailMean > Studio.prepare(six).cost(rw.result.tour) + 40, "random walk second half stays far above the best tour seen");
  ok(/never converges/.test(rw.steps[rw.steps.length - 1].caption), "random walk final caption states it");

  // ---- GA: premature convergence without mutation
  const gp = (pm) => Studio.run(Studio.get("tsp-ga"), gap, { N: 6, gens: 30, k: 3, op: "pmx", pm, seed: 15 });
  const g0 = gp(0), g9 = gp(0.9);
  eq([g0.result.cost, g0.result.distinct], [329, 1], "GA pm = 0: population collapses to one tour costing 329");
  eq([g9.result.cost], [255], "GA pm = 0.9 finds the optimum 255");
  ok(/premature convergence/.test(g0.steps[g0.steps.length - 1].caption), "GA final caption names premature convergence");
  ok(g0.steps.some(s => /population has converged/.test(s.caption)), "GA announces the generation where the population converged");
  ok(!/premature convergence/.test(g9.steps[g9.steps.length - 1].caption), "GA with mutation does not claim convergence");
  for (const op of ["pmx", "ox", "cx", "aex", "hx"]) {
    let low = 0; for (let seed = 1; seed <= 4; seed++) { const a = Studio.run(Studio.get("tsp-ga"), gap, { N: 6, gens: 30, k: 3, op, pm: 0, seed }).result; if (a.distinct === 1) low++; }
    eq(low, 4, `GA without mutation always collapses (${op})`);
  }

  // ---- ACO: pheromone reinforcement
  for (const seed of [1, 2, 3]) {
    const r = run("tsp-aco", six, { seed, iters: 8 }), sh = r.shares;
    ok(sh.length === 8 && sh[sh.length - 1] > sh[0] && sh[sh.length - 1] > 0.6, `ACO strongest-edge pheromone share rises above 60% (seed ${seed}: ${sh.map(x => Math.round(x * 100)).join(" ")})`);
  }
  const ac = Studio.run(Studio.get("tsp-aco"), six, {});
  ok(ac.steps.some(s => /strongest edges hold/.test(s.caption)), "ACO update steps report the pheromone concentration");

  // ---- Branch and bound pruning
  const bb = (q) => run("tsp-branch-and-bound", six, q);
  eq([bb({}).nodes, bb({}).pruned, bb({}).leaves, bb({}).cost], [68, 24, 5, 224], "B&B depth-first on six cities");
  eq([bb({ order: "best" }).nodes, bb({ order: "best" }).pruned, bb({ order: "best" }).leaves], [49, 23, 1], "B&B best-first on six cities");
  eq([bb({ ub: 229 }).nodes, bb({ ub: 229 }).cost], [55, 224], "B&B with initial best 229");
  eq(bb({ ub: 224 }).cost, null, "B&B with initial best = optimum finds nothing below it");
  ok(Studio.run(Studio.get("tsp-branch-and-bound"), six, {}).steps.some(s => /prune, every tour below it costs at least/.test(s.caption)), "B&B shows prune steps");

  // ---- the four-step Held-Karp caption reaches the learner for the other climbers too
  for (const id of ["tsp-two-city-exchange", "tsp-or-opt", "tsp-three-edge-exchange"]) {
    const r = Studio.run(Studio.get(id), six, { start: "greedy" });
    ok(/global optimum|LOCAL optimum/.test(r.steps[r.steps.length - 1].caption), `${id} final caption states local or global`);
  }
};
