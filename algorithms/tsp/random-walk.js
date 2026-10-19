/* Random walk: move to a random neighbour every step, remember the best seen. */
Studio.register({
  id: "tsp-random-walk",
  name: "Random walk",
  family: "TSP · local search",
  week: 3,
  problem: "tsp",
  order: 110,
  summary: "Pure exploration: ignore the evaluation function and step to a random neighbour each time, remembering the best tour seen.",
  pseudocode: `N ← start;  bestSeen ← N
repeat k times
    N ← random neighbour of N
    if N better than bestSeen: bestSeen ← N
return bestSeen`,
  complexity: "k neighbour samples",
  learn: {
    "intro": "A random walk is the opposite extreme of hill climbing: it ignores costs entirely and steps to a random neighbour each time. It is a baseline that shows how much the evaluation function helps.",
    "definition": "From the current tour move to a uniformly random neighbour; record the best tour seen.",
    "steps": [
      [
        "N ← start",
        ""
      ],
      [
        "N ← random neighbour of N",
        "No comparison with the current cost."
      ],
      [
        "update bestSeen",
        "The only use of the cost function."
      ]
    ],
    "formulas": [
      {
        "f": "P(next = X) = 1 / |N(current)|",
        "read": "every neighbour is equally likely",
        "why": "No bias toward better tours, so the walk drifts toward wherever most tours are: mostly bad ones."
      }
    ],
    "why": "Pure exploration can in principle reach anything, but without guidance it rarely finds good tours in reasonable time.",
    "traps": [
      "Simulated annealing at very high temperature behaves almost like this (a coin flip per move)."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "k samples",
      "space": "O(n)"
    }
  },
  params: [Studio.tsp.startParam, { key: "steps", label: "Steps k", type: "int", default: 10, min: 1, max: 200 }, Studio.tsp.mgParam("2-city"), Studio.seedParam(3)],
  run(P, { start, steps: k, movegen, seed }) {
    const T = Studio.tsp, rng = Studio.rng(seed), steps = [];
    let cur = T.startTour(P, start, seed), best = cur;
    const rows = [[0, "start", T.canon(cur, P.ids[0]).join(","), P.cost(cur), P.cost(best)]], series = [{ x: 0, y: P.cost(cur), best: P.cost(best) }];
    const push = cap => steps.push({ caption: cap, nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, cur),
      table: { columns: ["step", "move", "tour", "cost", "best"], rows: rows.slice(-14), rowStates: rows.slice(-14).map((r, i, a) => (i === a.length - 1 ? "cur" : "")) },
      chart: { kind: "walk", series: series.slice(), yLabel: "tour cost" }, stats: [{ label: "current", value: P.cost(cur) }, { label: "bestSeen", value: P.cost(best), state: "ok" }] });
    push(`Start ${cur.join(",")} = ${P.cost(cur)}`);
    for (let i = 1; i <= k; i++) {
      const nb = T.moveGens[movegen].fn(P, cur);
      const r = nb[rng.int(nb.length)];
      cur = r.tour; if (P.cost(cur) < P.cost(best)) best = cur;
      rows.push([i, r.move, T.canon(cur, P.ids[0]).join(","), P.cost(cur), P.cost(best)]);
      series.push({ x: i, y: P.cost(cur), best: P.cost(best) });
      push(`Step ${i}: random ${r.move} → ${P.cost(cur)}`);
    }
    steps.push({ caption: `bestSeen ${best.join(",")} = ${P.cost(best)}`, nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, best, { state: "path" }),
      chart: { kind: "walk", series, yLabel: "tour cost" }, table: { columns: ["step", "move", "tour", "cost", "best"], rows: rows.slice(-14) }, stats: [{ label: "bestSeen", value: P.cost(best), state: "ok" }] });
    return { steps, result: { tour: best, cost: P.cost(best) } };
  },
});
