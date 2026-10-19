/* 2-city exchange, applied by steepest-descent hill climbing. */
Studio.register({
  id: "tsp-two-city-exchange",
  name: "2-city exchange",
  family: "TSP · perturbation",
  week: 3,
  problem: "tsp",
  order: 40,
  summary: "Swap the positions of any two cities: n(n−1)/2 neighbours. Steepest-descent hill climbing until no swap helps.",
  pseudocode: `node ← start tour
loop
    neighbours ← MoveGen(node)          # swap two cities (4 edges change; 2 if adjacent)
    best ← cheapest neighbour
    if cost(best) ≥ cost(node): return node   (local optimum)
    node ← best`,
  complexity: "n(n−1)/2 neighbours per step, O(1) Δ each",
  learn: {
    "intro": "Perturbative methods start from a complete tour and improve it by small changes. 2-city exchange is one such change: swap the positions of two cities. Repeating the best improving change until none helps is hill climbing, and where it stops is a local optimum.",
    "definition": "MoveGen(2-city exchange) lists every tour reachable by one 2-city exchange move (n(n−1)/2 neighbours). Steepest-descent hill climbing moves to the best neighbour while it is strictly better than the current tour.",
    "steps": [
      [
        "node ← start tour",
        "Usually a constructive tour (Greedy, NN) or a random one."
      ],
      [
        "neighbours ← MoveGen(node)",
        "All tours one 2-city exchange move away: n(n−1)/2 of them."
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
        "f": "|N₂c| = n(n−1)/2",
        "read": "choose any two positions to swap",
        "why": "Swapping cities i and j changes up to 4 edges; if they are adjacent only 2 change."
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
      "time": "n(n−1)/2 evaluations per step",
      "space": "O(n)"
    }
  },
  params: [Studio.tsp.startParam, Studio.seedParam(1)],
  run(P, { start, seed }) {
    const t = Studio.tsp.startTour(P, start, seed);
    const r = Studio.tspSteps.hillClimb(P, t, "2-city", "2-city exchange");
    return { steps: r.steps, result: { tour: r.tour, cost: r.cost } };
  },
});
