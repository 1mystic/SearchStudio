/* 3-edge exchange, applied by steepest-descent hill climbing. */
Studio.register({
  id: "tsp-three-edge-exchange",
  name: "3-edge exchange",
  family: "TSP · perturbation",
  week: 3,
  problem: "tsp",
  order: 60,
  summary: "Remove three edges and reconnect the three segments in a new way (pure 3-opt moves).",
  pseudocode: `node ← start tour
loop
    neighbours ← MoveGen(node)          # remove three edges, reconnect segments
    best ← cheapest neighbour
    if cost(best) ≥ cost(node): return node   (local optimum)
    node ← best`,
  complexity: "O(n³) neighbours per step",
  learn: {
    "intro": "Perturbative methods start from a complete tour and improve it by small changes. 3-edge exchange is one such change: remove three edges and reconnect the segments. Repeating the best improving change until none helps is hill climbing, and where it stops is a local optimum.",
    "definition": "MoveGen(3-edge exchange) lists every tour reachable by one 3-edge exchange move (O(n³) neighbours). Steepest-descent hill climbing moves to the best neighbour while it is strictly better than the current tour.",
    "steps": [
      [
        "node ← start tour",
        "Usually a constructive tour (Greedy, NN) or a random one."
      ],
      [
        "neighbours ← MoveGen(node)",
        "All tours one 3-edge exchange move away: O(n³) of them."
      ],
      [
        "best ← cheapest neighbour",
        "Ties: the alphabetically smaller tour."
      ],
      [
        "if cost(best) ≥ cost(node): return node",
        "No neighbour is strictly better: a local optimum for this neighbourhood."
      ],
      [
        "node ← best",
        "Move and repeat."
      ]
    ],
    "formulas": [
      {
        "f": "|N₃e| = O(n³)",
        "read": "choose three edges, then a reconnection",
        "why": "Denser than 2-edge exchange: fewer local optima, more work per step."
      }
    ],
    "why": "Hill climbing is fast and always improves until it stops, but it stops at the first tour with no better neighbour. A denser neighbourhood has fewer such traps but costs more per step.",
    "traps": [
      "Hill climbing stops when no neighbour is strictly better, even if equal-cost neighbours exist (a plateau).",
      "Count neighbours with the right formula for the operator.",
      "In an asymmetric TSP a 2-edge move reverses a block, so many edge costs change."
    ],
    "props": {
      "complete": "no",
      "optimal": "no (local optimum)",
      "time": "O(n³) evaluations per step",
      "space": "O(n)"
    }
  },
  params: [Studio.tsp.startParam, Studio.seedParam(1)],
  run(P, { start, seed }) {
    const t = Studio.tsp.startTour(P, start, seed);
    const r = Studio.tspSteps.hillClimb(P, t, "3-edge", "3-edge exchange");
    return { steps: r.steps, result: { tour: r.tour, cost: r.cost } };
  },
});
