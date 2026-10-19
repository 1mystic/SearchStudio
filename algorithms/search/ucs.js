/* Uniform cost search / Dijkstra-style branch & bound on g. */
Studio.register({
  id: "search-ucs",
  name: "Uniform Cost Search",
  family: "Graph search · optimal",
  week: 5,
  problem: "graph",
  order: 40,
  summary: "OPEN is a priority queue on g(N), the cost so far. A cheaper path to a node on OPEN or CLOSED updates its parent. Optimal for non-negative costs.",
  pseudocode: `OPEN ← [(S, nil, 0)] ordered by g
while OPEN not empty
    N ← node with least g;  remove it
    if GoalTest(N): return the path
    move N to CLOSED
    for each child C of N with g' = g(N) + k(N,C)
        new: add (C, N, g') to OPEN
        on OPEN/CLOSED with larger g: update parent and g (reopen if on CLOSED)`,
  complexity: "O(b^(1+C*/ε))",
  learn: {
    "intro": "Uniform Cost Search always expands the cheapest path found so far. With different edge costs it finds the cheapest route, not just the one with the fewest steps.",
    "definition": "A state-space search problem has a start node S, a goal test, and a MoveGen function that lists the neighbours of a node. The search keeps two lists: OPEN (nodes generated but not yet expanded) and CLOSED (nodes already expanded). Each entry is a node pair (node, parent, value) so the path can be read back through parents. OPEN is ordered by g(N), the cost from S to N. If a cheaper path to a node already seen is found, its parent and g are updated.",
    "steps": [
      [
        "OPEN ordered by g",
        "g(N) = cost of the best known path from S to N."
      ],
      [
        "N ← least-g node",
        ""
      ],
      [
        "if GoalTest(N): return",
        "When the goal is picked, no cheaper path to it can exist."
      ],
      [
        "g' = g(N) + k(N, C)",
        "k is the edge cost."
      ],
      [
        "update a node if g' is smaller",
        "Reopen it if it was on CLOSED."
      ]
    ],
    "formulas": [
      {
        "f": "g(C) = g(N) + k(N, C)",
        "read": "cost so far plus the edge",
        "why": "Paths are extended one edge at a time."
      },
      {
        "f": "pick argmin g on OPEN",
        "read": "cheapest frontier node first",
        "why": "With non-negative costs this expands nodes in order of their true distance from S."
      }
    ],
    "why": "Optimal for non-negative edge costs; it is Dijkstra's algorithm stopped at the goal. It explores in all directions because it has no idea where the goal is.",
    "traps": [
      "Apply the goal test when the goal is removed from OPEN, not when it is generated.",
      "Remember to update g and the parent on cheaper paths."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes",
      "time": "O(b^(1+C*/ε))",
      "space": "same"
    }
  },
  params: [{ key: "tie", label: "Ties", type: "select", default: "alpha", options: [["alpha", "alphabetical"], ["fifo", "first in, first out"], ["lifo", "last in, first out"]] }],
  run(P, { tie }) { return Studio.search.run(P, "ucs", { tie }); },
});
