/* Genetic algorithm with roulette-wheel selection, a TSP crossover and swap mutation. */
Studio.register({
  id: "tsp-ga",
  name: "Genetic algorithm",
  family: "TSP · genetic",
  week: 4,
  problem: "tsp",
  order: 130,
  summary: "Population of tours. Roulette-wheel selection (fitness = K / cost), pairwise crossover, swap mutation, then the weakest members are replaced by the strongest offspring.",
  pseudocode: `P ← N random tours
repeat for g generations
    fitness(x) ← K / cost(x)
    S ← N roulette-wheel spins over P         (probability ∝ fitness)
    pair S as (1,2), (3,4), …; crossover each pair → offspring
    with probability pm mutate an offspring (swap two cities)
    replace the k weakest of P with the k strongest offspring
return best member of P`,
  complexity: "Per generation O(N·n) plus selection O(N log N)",
  learn: {
    "intro": "A genetic algorithm evolves a population of tours. Better tours are more likely to be chosen as parents, parents are combined by crossover, children are occasionally mutated, and the population slowly improves.",
    "definition": "Repeat for g generations: compute fitness, select N parents by roulette wheel (probability proportional to fitness), cross pairs, mutate with a small probability, and replace the weakest members with the strongest offspring.",
    "steps": [
      [
        "fitness(x) ← K / cost(x)",
        "TSP minimises cost, so fitness must grow as cost falls."
      ],
      [
        "roulette wheel selection",
        "Spin N times: each spin picks member i with probability fᵢ / Σ f."
      ],
      [
        "crossover pairs",
        "Use a TSP-safe crossover so children are valid tours."
      ],
      [
        "mutation",
        "Swap two cities with a small probability to keep diversity."
      ],
      [
        "replace the k weakest",
        "Keeps the good members (elitism-like)."
      ]
    ],
    "formulas": [
      {
        "f": "pᵢ = fᵢ / Σⱼ fⱼ,   fᵢ = K / costᵢ",
        "read": "share of the wheel for member i",
        "why": "Fitter members get bigger slices, but every member keeps some chance."
      },
      {
        "f": "angleᵢ = 360° · pᵢ;   pick i if cumᵢ₋₁ < u ≤ cumᵢ",
        "read": "spin u in [0,1) and see which slice it lands in",
        "why": "This is how the course traces roulette selection by hand."
      }
    ],
    "why": "Selection pushes toward good tours, crossover mixes their good parts, and mutation keeps exploring. Too much selection pressure makes the population identical too soon (premature convergence).",
    "traps": [
      "Fitness must be inverted for a minimisation problem.",
      "If the population converges early: raise mutation, lower selection pressure, enlarge the population.",
      "Cumulative probabilities decide roulette picks; recompute them carefully."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "O(g · N · n)",
      "space": "O(N · n)"
    }
  },
  params: [
    { key: "N", label: "Population N", type: "int", default: 6, min: 2, max: 30 },
    { key: "gens", label: "Generations", type: "int", default: 4, min: 1, max: 60 },
    { key: "op", label: "Crossover", type: "select", default: "pmx", options: Object.entries(Studio.tsp.crossovers.names).filter(([k]) => k !== "onepoint") },
    { key: "pm", label: "Mutation probability", type: "number", default: 0.3 },
    { key: "k", label: "Replace k weakest", type: "int", default: 2 },
    { key: "K", label: "Fitness constant K", type: "number", default: 1000 },
    Studio.seedParam(15),
  ],
  run(P, { N, gens, op, pm, k, K, seed }) {
    const T = Studio.tsp, X = T.crossovers, rng = Studio.rng(seed), steps = [];
    N = Math.max(2, N - (N % 2)); k = Math.max(0, Math.min(N, k));
    let pop = Array.from({ length: N }, () => [P.ids[0]].concat(rng.shuffle(P.ids.slice(1))));
    const bestOf = arr => arr.slice().sort((a, b) => P.cost(a) - P.cost(b))[0];
    const series = [];
    const popTable = (rows, title) => ({ title, columns: ["#", "tour", "cost", "fitness", "p", "cumulative"], rows });
    for (let g = 1; g <= gens; g++) {
      const fit = pop.map(t => K / P.cost(t)), tot = fit.reduce((a, b) => a + b, 0);
      let cum = 0;
      const rows = pop.map((t, i) => { const lo = cum; cum += fit[i] / tot; return [`P${i + 1}`, t.join(","), P.cost(t), fit[i].toFixed(3), (fit[i] / tot).toFixed(3), `${lo.toFixed(3)}–${cum.toFixed(3)}`]; });
      const cums = []; cum = 0; fit.forEach(f => { cum += f / tot; cums.push(cum); });
      const best = bestOf(pop);
      series.push({ x: g - 1, y: P.cost(best), avg: pop.reduce((s, t) => s + P.cost(t), 0) / N });
      steps.push({ caption: `Generation ${g}: population costs ${pop.map(t => P.cost(t)).join(", ")}; best ${P.cost(best)}`,
        nodes: Studio.tspSteps.nodes(P), edges: Studio.draw.tour(best, "tour", P), table: popTable(rows, `generation ${g}: roulette wheel`),
        chart: { kind: "pie", slices: fit.map(f => f / tot), labels: pop.map((_, i) => "P" + (i + 1)) }, stats: [{ label: "best", value: P.cost(best), state: "ok" }] });
      const picks = [];
      for (let s = 0; s < N; s++) { const u = rng.r3(); const i = cums.findIndex(c => u <= c); picks.push({ u, i: i < 0 ? N - 1 : i }); }
      steps.push({ caption: `Roulette spins: ${picks.map(p => `u=${p.u}→P${p.i + 1}`).join(", ")}`, nodes: Studio.tspSteps.nodes(P), edges: Studio.draw.tour(best, "tour", P),
        table: popTable(rows, `generation ${g}: roulette wheel`), chart: { kind: "pie", slices: fit.map(f => f / tot), labels: pop.map((_, i) => "P" + (i + 1)), marks: picks.map(p => p.u) },
        lists: [{ label: "MATING POOL", items: picks.map(p => ({ text: `P${p.i + 1}`, state: "open" })) }] });
      const kids = [], xrows = [];
      for (let s = 0; s + 1 < N; s += 2) {
        const a = pop[picks[s].i], b = pop[picks[s + 1].i];
        const n = P.n, sa = 1 + rng.int(n - 1), sb = Math.min(n, sa + 1 + rng.int(2)), cut = 1 + rng.int(n - 1);
        const r = X.apply(P, op, a, b, { a: sa, b: sb, cut });
        let child = r.child, note = "";
        if (rng() < pm) { const i = 1 + rng.int(n - 1); let j = 1 + rng.int(n - 1); if (j === i) j = (i % (n - 1)) + 1; child = child.slice(); [child[i], child[j]] = [child[j], child[i]]; note = `mutate: swap positions ${i + 1},${j + 1}`; }
        kids.push(child);
        xrows.push([`P${picks[s].i + 1} × P${picks[s + 1].i + 1}`, r.child.join(","), P.cost(r.child), note || "–", child.join(","), P.cost(child)]);
        if (r.child2 && kids.length < N) { kids.push(r.child2); xrows.push([`(second child)`, r.child2.join(","), P.cost(r.child2), "–", r.child2.join(","), P.cost(r.child2)]); }
      }
      while (kids.length < N) { const t = pop[picks[kids.length % N].i]; kids.push(t.slice()); xrows.push(["copy", t.join(","), P.cost(t), "–", t.join(","), P.cost(t)]); }
      steps.push({ caption: `${X.names[op]} on each pair, then mutation with probability ${pm}`, nodes: Studio.tspSteps.nodes(P), edges: Studio.draw.tour(bestOf(kids), "tour", P),
        table: { title: `generation ${g}: offspring`, columns: ["parents", "child", "cost", "mutation", "offspring", "cost"], rows: xrows }, stats: [{ label: "best child", value: P.cost(bestOf(kids)) }] });
      const sortedPop = pop.map((t, i) => [t, i]).sort((x, y) => P.cost(y[0]) - P.cost(x[0]));
      const sortedKids = kids.slice().sort((x, y) => P.cost(x) - P.cost(y));
      const replaced = [];
      for (let r = 0; r < k; r++) { if (P.cost(sortedKids[r]) < P.cost(sortedPop[r][0])) { pop[sortedPop[r][1]] = sortedKids[r]; replaced.push(`P${sortedPop[r][1] + 1}: ${P.cost(sortedPop[r][0])} → ${P.cost(sortedKids[r])}`); } }
      steps.push({ caption: replaced.length ? `Replace weakest: ${replaced.join("; ")}` : `No offspring beat the ${k} weakest members: population unchanged`,
        nodes: Studio.tspSteps.nodes(P), edges: Studio.draw.tour(bestOf(pop), "tour", P),
        table: popTable(pop.map((t, i) => [`P${i + 1}`, t.join(","), P.cost(t), (K / P.cost(t)).toFixed(3), "", ""]), `after generation ${g}`),
        chart: { kind: "walk", series: series.concat([{ x: g, y: P.cost(bestOf(pop)), avg: pop.reduce((s, t) => s + P.cost(t), 0) / N }]), yLabel: "best (line) and mean cost" } });
    }
    const best = bestOf(pop);
    steps.push({ caption: `Best member after ${gens} generations: ${best.join(",")} = ${P.cost(best)}`, nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.draw.tour(best, "path", P), stats: [{ label: "best", value: P.cost(best), state: "ok" }] });
    return { steps, result: { tour: best, cost: P.cost(best) } };
  },
});
