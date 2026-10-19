/* Iterated hill climbing: hill climb from several random starts, keep the best. */
Studio.register({
  id: "tsp-ihc",
  name: "Iterated hill climbing",
  family: "TSP · local search",
  week: 3,
  problem: "tsp",
  order: 100,
  summary: "Repeat: random start tour, steepest-descent hill climbing to a local optimum. Return the best local optimum found.",
  pseudocode: `best ← none
repeat r times
    N ← random tour
    N ← HillClimbing(N)
    if N better than best: best ← N
return best`,
  complexity: "r × cost of one hill climb",
  learn: {
    "intro": "If one hill climb gets stuck, start again from somewhere else. Iterated hill climbing repeats hill climbing from random starting tours and keeps the best local optimum found.",
    "definition": "Repeat r times: generate a random tour, hill climb to a local optimum, remember it if it is the best so far.",
    "steps": [
      [
        "repeat r times",
        ""
      ],
      [
        "N ← random tour",
        "Exploration: a fresh starting point."
      ],
      [
        "N ← HillClimbing(N)",
        "Exploitation: climb to the local optimum of that basin."
      ],
      [
        "keep the best",
        ""
      ]
    ],
    "formulas": [
      {
        "f": "P(success) ≈ 1 − (1 − p)^r",
        "read": "with r restarts, each landing in the optimum's basin with probability p",
        "why": "More restarts make it more likely that at least one starts in the right basin."
      }
    ],
    "why": "Simple and effective when local optima are many but hill climbing is cheap. It wastes effort if most random starts lead to the same poor basin.",
    "traps": [
      "Each restart is independent: nothing is learned between restarts.",
      "Random starts are usually much worse than constructive tours."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "r × hill climb",
      "space": "O(n)"
    }
  },
  params: [{ key: "restarts", label: "Restarts r", type: "int", default: 5, min: 1, max: 40 }, Studio.tsp.mgParam("2-city"), Studio.seedParam(9)],
  run(P, { restarts, movegen, seed }) {
    const T = Studio.tsp, rng = Studio.rng(seed), steps = [], rows = [], states = [];
    let best = null;
    const series = [];
    for (let k = 1; k <= restarts; k++) {
      const s = [P.ids[0]].concat(rng.shuffle(P.ids.slice(1)));
      const hc = T.hillClimb(P, s, movegen);
      const lo = hc[hc.length - 1];
      const nb = !best || lo.cost < best.cost;
      if (nb) best = { tour: lo.tour, cost: lo.cost };
      rows.push([k, s.join(","), P.cost(s), T.canon(lo.tour, P.ids[0]).join(","), lo.cost, hc.length - 2]);
      states.push(nb ? "ok" : "");
      series.push({ x: k, from: P.cost(s), to: lo.cost });
      steps.push({ caption: `Restart ${k}: start ${P.cost(s)} → local optimum ${lo.cost} in ${hc.length - 2} moves${nb ? " — new best" : ""}`,
        nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, lo.tour),
        table: { columns: ["#", "random start", "cost", "local optimum", "cost", "moves"], rows: rows.slice(), rowStates: states.slice() },
        chart: { kind: "drops", series: series.slice(), yLabel: "tour cost", ref: null },
        stats: [{ label: "best", value: best.cost, state: "ok" }] });
    }
    steps.push({ caption: `Best of ${restarts} restarts: ${best.tour.join(",")} = ${best.cost}`, nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, best.tour, { state: "path" }),
      table: { columns: ["#", "random start", "cost", "local optimum", "cost", "moves"], rows, rowStates: states }, chart: { kind: "drops", series, yLabel: "tour cost" },
      stats: [{ label: "best", value: best.cost, state: "ok" }] });
    return { steps, result: best };
  },
});
