/* Or-opt (move a city), applied by steepest-descent hill climbing. */
Studio.register({
  id: "tsp-or-opt",
  name: "Or-opt (move a city)",
  family: "TSP · perturbation",
  week: 3,
  problem: "tsp",
  order: 55,
  summary: "Take one city out and insert it between two other neighbours: a special 3-edge exchange.",
  pseudocode: `node ← start tour
loop
    neighbours ← MoveGen(node)          # remove a city, reinsert it elsewhere
    best ← cheapest neighbour
    if cost(best) ≥ cost(node): return node   (local optimum)
    node ← best`,
  complexity: "≈ n² neighbours per step",
  learn: {
    "intro": "Perturbative methods start from a complete tour and improve it by small changes. Or-opt is one such change: move one city to another place in the tour. Repeating the best improving change until none helps is hill climbing, and where it stops is a local optimum.",
    "definition": "MoveGen(Or-opt) lists every tour reachable by one Or-opt move (about n² neighbours). Steepest-descent hill climbing moves to the best neighbour while it is strictly better than the current tour.",
    "steps": [
      [
        "node ← start tour",
        "Usually a constructive tour (Greedy, NN) or a random one."
      ],
      [
        "neighbours ← MoveGen(node)",
        "All tours one Or-opt move away: about n² of them."
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
        "f": "Δ = C(p,q) − C(p,c) − C(c,q) + C(x,c) + C(c,y) − C(x,y)",
        "read": "take c out from between p and q, put it between x and y",
        "why": "Moving one city removes three edges and adds three, so Or-opt moves are a subset of 3-edge exchanges."
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
      "time": "about n² evaluations per step",
      "space": "O(n)"
    }
  },
  params: [Studio.tsp.startParam, Studio.seedParam(1)],
  run(P, { start, seed }) {
    const t = Studio.tsp.startTour(P, start, seed);
    const r = Studio.tspSteps.hillClimb(P, t, "or-opt", "Or-opt (move a city)");
    return { steps: r.steps, result: { tour: r.tour, cost: r.cost } };
  },
});
