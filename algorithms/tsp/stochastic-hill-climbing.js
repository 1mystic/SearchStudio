/* Stochastic hill climbing: random neighbour, sigmoid acceptance at a fixed temperature. */
Studio.register({
  id: "tsp-stochastic-hc",
  name: "Stochastic hill climbing",
  family: "TSP · local search",
  week: 4,
  problem: "tsp",
  order: 115,
  summary: "Pick a random neighbour and move to it with probability P = 1/(1 + e^(−ΔE/T)), ΔE = cost(current) − cost(next), at a fixed temperature T. The first step shows the sigmoid for several T (ΔE = 0 gives P = ½).",
  pseudocode: `N ← start;  bestSeen ← N
repeat k times
    X ← random neighbour of N
    ΔE ← cost(N) − cost(X)            # positive = improvement
    P ← 1 / (1 + e^(−ΔE / T))         # T is fixed
    if random u < P: N ← X
    if N better than bestSeen: bestSeen ← N
return bestSeen`,
  complexity: "k neighbour samples",
  learn: {
    intro: "Ordinary hill climbing only ever accepts improvements and so gets stuck at the first local optimum. Stochastic hill climbing keeps the 'look at one random neighbour' step but accepts it with a probability that depends on how much better or worse it is, so it can sometimes walk downhill and escape.",
    definition: "At a fixed temperature T, move from N to a random neighbour X with probability P = 1/(1 + e^(−ΔE/T)), where ΔE = cost(N) − cost(X) (positive means X is shorter). Unlike simulated annealing, T never changes.",
    steps: [
      ["X ← random neighbour of N", "One random neighbour is examined, not the whole neighbourhood."],
      ["ΔE ← cost(N) − cost(X)", "Positive ΔE is an improvement because the TSP minimises cost."],
      ["P ← 1 / (1 + e^(−ΔE/T))", "The sigmoid: ΔE = 0 gives exactly ½; larger |ΔE| pushes P towards 1 or 0."],
      ["if u < P: N ← X", "u is a uniform random number in [0,1), drawn from the seeded generator."],
    ],
    formulas: [
      { f: "P = 1 / (1 + e^(−ΔE/T))", read: "sigmoid of ΔE/T", why: "ΔE > 0 gives P > ½, ΔE < 0 gives P < ½, ΔE = 0 gives P = ½ whatever T is." },
      { f: "T large: P → ½;   T small: P → 1 (ΔE>0) or 0 (ΔE<0)", read: "hot is a coin flip, cold is hill climbing", why: "T scales ΔE: dividing by a big T squashes all differences; a small T amplifies them." },
    ],
    why: "A fixed T is a fixed compromise: too hot and the search wanders at random, too cold and it behaves like plain hill climbing and stalls in a local optimum. Annealing resolves this by lowering T over time.",
    traps: [
      "ΔE is cost(current) − cost(next): improvement positive, the opposite of some textbooks.",
      "Even an improving move is only accepted with probability P < 1 at finite T, so keep the best tour seen.",
      "The same seed gives the same run; change the seed, not the code, to see a different one.",
    ],
    props: { complete: "no", optimal: "no", time: "k samples", space: "O(n)" },
  },
  params: [
    { key: "start", label: "Start tour", type: "select", default: "trap", options: [["trap", "Hill-climbing local optimum of the Greedy tour"], ["greedy", "Greedy tour"], ["nn", "Nearest-neighbour tour"], ["random", "Random (uses seed)"]], allowText: true },
    { key: "T", label: "Temperature T (fixed)", type: "number", default: 10 },
    { key: "steps", label: "Steps k", type: "int", default: 15, min: 1, max: 300 },
    { key: "tableT", label: "Temperatures in the sigmoid table", type: "text", default: "2,5,10,30", help: "comma-separated; the chart draws the first three" },
    Studio.tsp.mgParam("2-city"), Studio.seedParam(5),
  ],
  run(P, { start, T, steps: k, tableT, movegen, seed }) {
    const Tz = Studio.tsp, rng = Studio.rng(seed), steps = [];
    if (!(T > 0)) throw new Error("Temperature T must be positive");
    let cur = start === "trap" ? Tz.hillClimb(P, Tz.startTour(P, "greedy"), movegen).pop().tour : Tz.startTour(P, start, seed);
    let best = cur;
    const sig = (dE, t) => 1 / (1 + Math.exp(-dE / t));
    const r3 = x => Math.round(x * 1000) / 1000;
    const Ts = String(tableT).split(/[\s,;]+/).map(Number).filter(x => x > 0).slice(0, 6);
    if (!Ts.length) Ts.push(T);
    const dEs = [-40, -20, -10, -5, 0, 5, 10, 20, 40];

    /* sigmoid table and chart for several temperatures */
    const grid = []; for (let d = -40; d <= 40; d += 4) grid.push(d);
    const series = grid.map(d => { const p = { x: d, y: Math.round(sig(d, Ts[0]) * 100) }; if (Ts[1]) p.best = Math.round(sig(d, Ts[1]) * 100); if (Ts[2]) p.avg = Math.round(sig(d, Ts[2]) * 100); return p; });
    steps.push({ caption: `The acceptance rule P = 1/(1+e^(−ΔE/T)) for T = ${Ts.join(", ")}: ΔE = 0 gives P = 0.5 at every T; a small T makes the curve steep (almost hill climbing), a large T flattens it towards a coin flip. The search below uses T = ${T}`,
      nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, cur),
      table: { title: "P(accept) by ΔE and T", columns: ["ΔE"].concat(Ts.map(t => "T=" + t)), rows: dEs.map(d => [d].concat(Ts.map(t => r3(sig(d, t))))), rowStates: dEs.map(d => (d === 0 ? "cur" : "")) },
      chart: { kind: "walk", series, yLabel: `P(accept) % vs ΔE; lines T=${Ts.slice(0, 3).join(", ")}` },
      stats: [{ label: "P at ΔE=0", value: 0.5, state: "ok" }, { label: "T", value: T }] });

    const rows = [], states = [], walk = [{ x: 0, y: P.cost(cur), best: P.cost(best) }];
    const push = (cap, extra = {}) => steps.push(Object.assign({ caption: cap, nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, cur),
      table: { columns: ["k", "cur", "move", "next", "ΔE", "P", "u", ""], rows: rows.slice(-14), rowStates: states.slice(-14) },
      chart: { kind: "walk", series: walk.slice(), yLabel: "current cost" },
      stats: [{ label: "T", value: T }, { label: "current", value: P.cost(cur) }, { label: "bestSeen", value: P.cost(best), state: "ok" }] }, extra));
    push(`Start ${cur.join(",")} = ${P.cost(cur)}, fixed T = ${T}`);
    let accepted = 0;
    for (let i = 1; i <= k; i++) {
      const nb = Tz.moveGens[movegen].fn(P, cur), r = nb[rng.int(nb.length)];
      const dE = P.cost(cur) - r.cost, p = r3(sig(dE, T)), u = rng.r3(), acc = u < sig(dE, T);
      const verdict = acc ? (dE < 0 ? "accept (worse)" : "accept") : (dE > 0 ? "reject (better!)" : "reject");
      rows.push([i, P.cost(cur), r.move, r.cost, dE, p, u, verdict]);
      states.push(acc ? (dE < 0 ? "warn" : "ok") : (dE > 0 ? "warn" : "bad"));
      if (acc) { cur = r.tour; accepted++; if (P.cost(cur) < P.cost(best)) best = cur; }
      walk.push({ x: i, y: P.cost(cur), best: P.cost(best), proposal: r.cost, accepted: acc });
      push(`k = ${i}: ${r.move}, ΔE = ${dE}, P = ${p}, u = ${u} → ${verdict}${acc ? "" : `; stay at ${P.cost(cur)}`}`);
    }
    const opt = Studio.tspSteps.optimum(P);
    push(`bestSeen ${best.join(",")} = ${P.cost(best)}${opt != null ? (P.cost(best) === opt ? ", the optimum" : `, ${P.cost(best) - opt} above the optimum ${opt}`) : ""} after ${k} samples, ${accepted} accepted at the fixed T = ${T}. The final tour costs ${P.cost(cur)}: with T fixed the walk neither freezes nor stops wandering, so keep the best tour seen`, { nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, best, { state: "path" }) });
    return { steps, result: { tour: best, cost: P.cost(best), accepted, final: cur, finalCost: P.cost(cur) } };
  },
});
