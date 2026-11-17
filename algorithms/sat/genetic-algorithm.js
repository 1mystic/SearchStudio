/* Genetic algorithm on SAT bit strings: roulette-wheel selection (fitness = h), one-point crossover, bit mutation. */
Studio.register({
  id: "sat-ga",
  name: "Genetic algorithm",
  family: "SAT · genetic",
  week: 4,
  problem: "sat",
  order: 110,
  summary: "A population of bit strings. Fitness = h (clauses satisfied); roulette-wheel selection picks parents with probability h / Σh, one-point crossover builds two children per pair, and mutation flips a random bit with probability pm.",
  pseudocode: `Pop ← N bit strings (given, or random)
repeat for g generations
    fitness(x) ← h(x);   p(x) ← h(x) / Σ h
    pool ← N strings drawn by roulette-wheel (spin u, take the first x with cumulative p ≥ u)
    for each consecutive pair (a, b) of the pool
        cut ← random point in 1..n−1;   children ← a[0..cut)+b[cut..), b[0..cut)+a[cut..)
        with probability pm flip one random bit of each child
    Pop ← the children
return the best string ever seen`,
  complexity: "N·g fitness evaluations",
  learn: {
    intro: "A genetic algorithm keeps a whole population of candidate assignments instead of a single one. Fitter strings (more clauses satisfied) are more likely to become parents; crossover mixes the bits of two parents and mutation occasionally flips a bit, which can create strings that neither parent could.",
    definition: "Fitness of a string is h, the number of satisfied clauses. Selection probability is p = h / Σh (roulette wheel: the cumulative probabilities partition [0, 1) and a uniform u picks the interval it falls in). Pairs of selected parents are crossed at a random one-point cut, and each child is mutated with probability pm by flipping one random bit.",
    steps: [
      ["fitness(x) ← h(x)", "The population table shows h and the selection probability of each member."],
      ["spin the wheel N times", "Each spin draws u from the seeded generator and picks the member whose cumulative interval contains u: fit members can be picked several times, weak ones not at all."],
      ["one-point crossover", "Pick a cut between two bits; each child takes the left part of one parent and the right part of the other."],
      ["mutation with probability pm", "A random bit of the child is flipped. This is how new bit values can appear that the population does not contain."],
      ["Pop ← children", "A complete replacement of the generation (no elitism); the best string ever seen is tracked separately."],
    ],
    formulas: [
      { f: "p(xᵢ) = h(xᵢ) / Σⱼ h(xⱼ)", read: "selection probability proportional to fitness", why: "The probabilities sum to 1, and a string with twice the fitness gets twice the share of the wheel." },
      { f: "cumulative cᵢ = p(x₁) + … + p(xᵢ)", read: "the wheel's boundaries", why: "u falls in the interval (cᵢ₋₁, cᵢ] of exactly one member, so the draw has the right probabilities." },
    ],
    why: "Crossover recombines good partial assignments, mutation keeps diversity. On the course example a single generation can produce the solution 1101 when mutation flips the right bit of a child that is one flip away from it. The method is incomplete: with few generations or a tiny population it may never find a solution.",
    traps: [
      "Fitness-proportional selection is weak when all h values are close: the probabilities are then almost equal.",
      "If every h is 0 the wheel would divide by zero; the trace falls back to uniform probabilities.",
      "A solution found in a child must be recorded when it appears: the next generation may lose it.",
      "Results depend on the seed and on the initial population; the same inputs repeat the run exactly.",
    ],
    props: { complete: "no", optimal: "no", time: "N·g evaluations", space: "O(N·n)" },
  },
  params: [
    { key: "pop", label: "Initial population (bit strings, comma separated)", type: "text", default: P => (P.n === 4 ? "1000,0110,0011,1100" : ""), help: "Type random (or leave non-bit text) for a random population of N strings from the seed." },
    { key: "N", label: "Population size N (random population; even)", type: "int", default: 6, min: 2, max: 40 },
    { key: "gens", label: "Generations", type: "int", default: 1, min: 1, max: 40 },
    { key: "pm", label: "Mutation probability per child pm", type: "number", default: 0.5 },
    Studio.seedParam(9),
  ],
  run(P, { pop: popText, N, gens, pm, seed }) {
    const L = Studio.satLib, rng = Studio.rng(seed), steps = [];
    let pop = String(popText || "").split(/[\s,;]+/).filter(s => /^[01]+$/.test(s) && s.length === P.n);
    const given = pop.length > 0;
    if (!given) { N = Math.max(2, N); pop = Array.from({ length: N }, () => Array.from({ length: P.n }, () => (rng() < 0.5 ? "1" : "0")).join("")); }
    if (pop.length % 2) pop = pop.concat([pop[pop.length - 1]]);
    N = pop.length;
    const r3 = x => Math.round(x * 1000) / 1000, bestOf = arr => L.best(arr.map(b => ({ bits: b, h: P.h(b) }))).bits;
    let best = bestOf(pop), solvedAt = P.solved(best) ? 0 : null, mutated = [];
    const series = [];
    const popTable = (list, title, wheel) => {
      const fit = list.map(b => P.h(b)), tot = fit.reduce((a, b) => a + b, 0); let cum = 0;
      const pr = fit.map(f => (tot ? f / tot : 1 / list.length));
      return { table: { title, columns: ["#", "string", "fitness h", "p = h/Σh", "cumulative"].slice(0, wheel ? 5 : 3), rows: list.map((b, i) => { const lo = cum; cum += pr[i]; return ["P" + (i + 1), b, fit[i], r3(pr[i]), `${r3(lo)}–${r3(cum)}`].slice(0, wheel ? 5 : 3); }), rowStates: list.map(b => (P.solved(b) ? "ok" : "")) }, pr, fit, tot };
    };
    const avg = list => list.reduce((s, b) => s + P.h(b), 0) / list.length;
    steps.push(Object.assign({ caption: `Initial population of ${N} strings ${given ? "(given)" : `(random, seed ${seed})`}: ${pop.join(", ")}.`, stats: L.stats(P, best, [{ label: "population", value: N }]) }, { table: popTable(pop, "generation 0", true).table }, L.drawBits(P, best)));
    for (let g = 1; g <= gens; g++) {
      const t = popTable(pop, `generation ${g}: roulette wheel`, true), cums = []; let c = 0; t.pr.forEach(p => { c += p; cums.push(c); });
      series.push({ x: g - 1, y: P.h(bestOf(pop)), avg: avg(pop) });
      steps.push(Object.assign({ caption: `Generation ${g}: fitness h = ${t.fit.join(", ")}, total ${t.tot}. Selection probabilities p = h/Σh = ${t.pr.map(r3).join(", ")}.${t.tot ? "" : " All fitnesses are 0, so the wheel is uniform."}`,
        chart: { kind: "pie", slices: t.pr, labels: pop.map((_, i) => "P" + (i + 1)) }, stats: L.stats(P, bestOf(pop), [{ label: "mean h", value: r3(avg(pop)) }]) }, { table: t.table }, L.drawBits(P, bestOf(pop))));
      const picks = []; for (let s = 0; s < N; s++) { const u = rng.r3(), i = cums.findIndex(x => u <= x); picks.push({ u, i: i < 0 ? N - 1 : i }); }
      steps.push(Object.assign({ caption: `Roulette spins: ${picks.map(p => `u = ${p.u} → P${p.i + 1} (${pop[p.i]})`).join(", ")}. The mating pool is ${picks.map(p => pop[p.i]).join(", ")}.`,
        chart: { kind: "pie", slices: t.pr, labels: pop.map((_, i) => "P" + (i + 1)), marks: picks.map(p => p.u) }, lists: [{ label: "MATING POOL", items: picks.map(p => ({ text: `P${p.i + 1} ${pop[p.i]}`, state: "open" })) }] }, { table: t.table }, L.drawBits(P, bestOf(pop))));
      const kids = [], xrows = [], states = []; mutated = [];
      for (let s = 0; s + 1 < N; s += 2) {
        const a = pop[picks[s].i], b = pop[picks[s + 1].i], cut = P.n > 1 ? 1 + rng.int(P.n - 1) : 0;
        for (const [x, y, name] of [[a, b, "child 1"], [b, a, "child 2"]]) {
          const child = x.slice(0, cut) + y.slice(cut); let out = child, note = "–";
          if (rng() < pm) { const i = rng.int(P.n); out = P.flip(child, i); note = `mutate bit ${P.vars[i]}`; mutated.push(out); }
          kids.push(out);
          xrows.push([`${a} × ${b}`, cut, name, child, note, out, P.h(out)]); states.push(P.solved(out) ? "ok" : note !== "–" ? "warn" : "");
        }
      }
      for (const k of kids) if (P.h(k) > P.h(best)) { best = k; if (solvedAt === null && P.solved(k)) solvedAt = g; }
      steps.push(Object.assign({ caption: `One-point crossover and mutation (probability ${pm} per child): ${xrows.filter(r => r[4] !== "–").length} of ${kids.length} children mutated${kids.some(k => P.solved(k)) ? `; the solution ${kids.find(k => P.solved(k))} appears` : ""}.`,
        table: { title: `generation ${g}: offspring`, columns: ["parents", "cut", "child", "crossover", "mutation", "offspring", "h"], rows: xrows, rowStates: states }, stats: L.stats(P, best, [{ label: "best so far", value: best }]) }, L.drawBits(P, bestOf(kids))));
      pop = kids;
      const nt = popTable(pop, `after generation ${g}`, false);
      steps.push(Object.assign({ caption: `Generation ${g} replaces the population with its ${N} children: ${pop.join(", ")}. Best string ever seen: ${best} (h ${P.h(best)}).`,
        chart: { kind: "walk", series: series.concat([{ x: g, y: P.h(bestOf(pop)), avg: avg(pop) }]), yLabel: "best (line) and mean h" }, stats: L.stats(P, best) }, { table: nt.table }, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    }
    steps.push(Object.assign({ caption: `Best string after ${gens} generation${gens === 1 ? "" : "s"}: ${best} with h = ${P.h(best)} of ${P.m}${P.solved(best) ? ` (a solution, first seen in generation ${solvedAt})` : ""}.`, stats: L.stats(P, best, [{ label: "solved", value: P.solved(best) ? "yes" : "no", state: P.solved(best) ? "ok" : "bad" }]) }, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved: P.solved(best), solvedAt, population: pop, mutated, ...(gens === 1 ? { children: pop } : {}) } };
  },
});
