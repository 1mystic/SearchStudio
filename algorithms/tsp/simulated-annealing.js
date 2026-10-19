/* Simulated annealing with the course's sigmoid acceptance rule. */
Studio.register({
  id: "tsp-sa",
  name: "Simulated annealing",
  family: "TSP · local search",
  week: 3,
  problem: "tsp",
  order: 120,
  summary: "Pick a random neighbour and move to it with probability P = 1/(1 + e^(−ΔE/T)), ΔE = cost(current) − cost(next). T falls geometrically: high T ≈ coin flip, T → 0 ≈ hill climbing.",
  pseudocode: `N ← start;  bestSeen ← N;  T ← T0
repeat k times
    X ← random neighbour of N
    ΔE ← cost(N) − cost(X)            # positive = improvement
    P ← 1 / (1 + e^(−ΔE / T))
    if random u < P: N ← X
    if N better than bestSeen: bestSeen ← N
    T ← α · T
return bestSeen`,
  complexity: "k neighbour samples",
  learn: {
    "intro": "Simulated annealing borrows from metalworking: hot metal moves freely, then settles into a strong structure as it cools. The search accepts worse moves often while the 'temperature' is high, and becomes stricter as it cools.",
    "definition": "Pick a random neighbour X of the current tour N. Compute ΔE = cost(N) − cost(X) (positive means X is better) and move with probability P = 1/(1 + e^(−ΔE/T)). Lower T after each step.",
    "steps": [
      [
        "X ← random neighbour of N",
        "Random, not best: SA samples the neighbourhood."
      ],
      [
        "ΔE ← cost(N) − cost(X)",
        "Positive ΔE = improvement (TSP minimises cost)."
      ],
      [
        "P ← 1 / (1 + e^(−ΔE/T))",
        "The course's sigmoid acceptance rule."
      ],
      [
        "if u < P: N ← X",
        "u is a uniform random number in [0,1)."
      ],
      [
        "T ← α·T",
        "Geometric cooling, α slightly below 1."
      ]
    ],
    "formulas": [
      {
        "f": "P = 1 / (1 + e^(−ΔE/T))",
        "read": "a sigmoid of ΔE scaled by temperature",
        "why": "ΔE > 0 gives P > ½, ΔE < 0 gives P < ½; larger |ΔE| pushes P toward 1 or 0."
      },
      {
        "f": "T → ∞: P → ½;   T → 0: P → 1 if ΔE > 0, 0 if ΔE < 0",
        "read": "hot = coin flip, cold = hill climbing",
        "why": "Temperature controls the balance between exploration and exploitation."
      },
      {
        "f": "Tₖ = T₀ · αᵏ",
        "read": "temperature after k steps",
        "why": "Slow cooling (α close to 1) gives more time to escape local optima."
      }
    ],
    "why": "Accepting some worse moves lets SA leave local optima; cooling makes it settle. With this sigmoid rule even a better move can be rejected (P < 1), so always keep the best tour seen.",
    "traps": [
      "ΔE sign: define it so that positive means better for the problem at hand.",
      "With the sigmoid rule, P(better move) < 1 at finite T.",
      "Return bestSeen: the current tour can wander off the best one."
    ],
    "props": {
      "complete": "no",
      "optimal": "only with impractically slow cooling",
      "time": "k samples",
      "space": "O(n)"
    }
  },
  params: [
    { key: "start", label: "Start tour", type: "select", default: "trap", options: [["trap", "Hill-climbing local optimum of the Greedy tour"], ["greedy", "Greedy tour"], ["nn", "Nearest-neighbour tour"], ["random", "Random (uses seed)"]], allowText: true },
    { key: "T0", label: "Start temperature T0", type: "number", default: 30 },
    { key: "alpha", label: "Cooling factor α", type: "number", default: 0.85 },
    { key: "steps", label: "Steps k", type: "int", default: 12, min: 1, max: 300 },
    Studio.tsp.mgParam("2-city"), Studio.seedParam(91),
  ],
  run(P, { start, T0, alpha, steps: k, movegen, seed }) {
    const Tz = Studio.tsp, rng = Studio.rng(seed), steps = [];
    let cur = start === "trap" ? Tz.hillClimb(P, Tz.startTour(P, "greedy"), movegen).pop().tour : Tz.startTour(P, start, seed);
    let best = cur, T = T0;
    const rows = [], states = [], series = [{ x: 0, y: P.cost(cur), best: P.cost(best), T }];
    const push = (cap, extra = {}) => steps.push(Object.assign({ caption: cap, nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, cur),
      table: { columns: ["k", "T", "cur", "move", "next", "ΔE", "P", "u", ""], rows: rows.slice(-14), rowStates: states.slice(-14) },
      chart: { kind: "walk", series: series.slice(), yLabel: "current cost", showT: true },
      stats: [{ label: "T", value: Math.round(T * 100) / 100 }, { label: "current", value: P.cost(cur) }, { label: "bestSeen", value: P.cost(best), state: "ok" }] }, extra));
    push(`Start ${cur.join(",")} = ${P.cost(cur)}, T0 = ${T0}`);
    for (let i = 1; i <= k; i++) {
      const nb = Tz.moveGens[movegen].fn(P, cur);
      const r = nb[rng.int(nb.length)];
      const dE = P.cost(cur) - r.cost;
      const p = 1 / (1 + Math.exp(-dE / T));
      const u = rng.r3();
      const acc = u < p;
      const pr = Math.round(p * 1000) / 1000;
      const verdict = acc ? (dE < 0 ? "accept (worse)" : "accept") : (dE > 0 ? "reject (better!)" : "reject");
      rows.push([i, Math.round(T * 100) / 100, P.cost(cur), r.move, r.cost, dE, pr, u, verdict]);
      states.push(acc ? (dE < 0 ? "warn" : "ok") : (dE > 0 ? "warn" : "bad"));
      if (acc) { cur = r.tour; if (P.cost(cur) < P.cost(best)) best = cur; }
      series.push({ x: i, y: P.cost(cur), best: P.cost(best), T, proposal: r.cost, accepted: acc });
      push(`k = ${i}, T = ${Math.round(T * 100) / 100}: ${r.move}, ΔE = ${dE}, P = ${pr}, u = ${u} → ${verdict}`);
      T *= alpha;
    }
    push(`bestSeen ${best.join(",")} = ${P.cost(best)}`, { nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, best, { state: "path" }) });
    return { steps, result: { tour: best, cost: P.cost(best) } };
  },
});
