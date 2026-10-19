/* 2-edge exchange (2-opt), applied by steepest-descent hill climbing. */
Studio.register({
  id: "tsp-two-edge-exchange",
  name: "2-edge exchange (2-opt)",
  family: "TSP · perturbation",
  week: 3,
  problem: "tsp",
  order: 50,
  summary: "Remove two non-adjacent edges and reconnect the other way, which reverses the block between them: n(n−3)/2 neighbours.",
  pseudocode: `node ← start tour
loop
    neighbours ← MoveGen(node)          # remove (a,b),(c,d); add (a,c),(b,d); reverse the block
    best ← cheapest neighbour
    if cost(best) ≥ cost(node): return node   (local optimum)
    node ← best`,
  complexity: "n(n−3)/2 neighbours per step",
  learn: {
    "intro": "Perturbative methods start from a complete tour and improve it by small changes. 2-edge exchange is one such change: remove two non-adjacent edges and reconnect. Repeating the best improving change until none helps is hill climbing, and where it stops is a local optimum.",
    "definition": "MoveGen(2-edge exchange) lists every tour reachable by one 2-edge exchange move (n(n−3)/2 neighbours). Steepest-descent hill climbing moves to the best neighbour while it is strictly better than the current tour.",
    "steps": [
      [
        "node ← start tour",
        "Usually a constructive tour (Greedy, NN) or a random one."
      ],
      [
        "neighbours ← MoveGen(node)",
        "All tours one 2-edge exchange move away: n(n−3)/2 of them."
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
        "f": "|N₂e| = n(n−3)/2",
        "read": "pairs of edges that do not share a city",
        "why": "Each of n edges can pair with n−3 non-adjacent edges; each pair is counted twice."
      },
      {
        "f": "Δ = C(a,c) + C(b,d) − C(a,b) − C(c,d)",
        "read": "new edges minus removed edges",
        "why": "Only four edges change, so a move is evaluated in O(1) without recomputing the whole tour."
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
      "time": "n(n−3)/2 evaluations per step",
      "space": "O(n)"
    }
  },
  params: [Studio.tsp.startParam, Studio.seedParam(1)],
  run(P, { start, seed }) {
    const t = Studio.tsp.startTour(P, start, seed);
    const r = Studio.tspSteps.hillClimb(P, t, "2-edge", "2-edge exchange (2-opt)");
    return { steps: r.steps, result: { tour: r.tour, cost: r.cost } };
  },
});
