/* Greedy best-first search on h(N). */
Studio.register({
  id: "search-best-first",
  name: "Best First Search",
  family: "Graph search · informed",
  week: 3,
  problem: "graph",
  order: 50,
  summary: "OPEN is a priority queue on h(N), the heuristic estimate of distance to the goal. Fast when h is good, not optimal.",
  pseudocode: `OPEN ← [(S, nil, h(S))] ordered by h
while OPEN not empty
    N ← node with least h;  remove it
    if GoalTest(N): return the path
    move N to CLOSED
    add children not on OPEN or CLOSED, ordered by h`,
  complexity: "Worst case O(b^m)",
  learn: {
    "intro": "Best First Search uses a heuristic h(N), a guess of the distance from N to the goal, and always expands the node that looks closest to the goal.",
    "definition": "A state-space search problem has a start node S, a goal test, and a MoveGen function that lists the neighbours of a node. The search keeps two lists: OPEN (nodes generated but not yet expanded) and CLOSED (nodes already expanded). Each entry is a node pair (node, parent, value) so the path can be read back through parents. OPEN is ordered by h(N).",
    "steps": [
      [
        "OPEN ordered by h",
        "h is domain knowledge, e.g. straight-line distance."
      ],
      [
        "N ← least-h node",
        "Ignores the cost already paid."
      ],
      [
        "add unseen children",
        ""
      ]
    ],
    "formulas": [
      {
        "f": "pick argmin h on OPEN",
        "read": "most promising-looking node first",
        "why": "Fast when h is accurate, but it ignores g, so the path found can be expensive."
      }
    ],
    "why": "Often reaches the goal quickly, but is not optimal and can be misled by a poor heuristic.",
    "traps": [
      "Best First ignores g; A* adds it.",
      "Ties in h decide the path: state your tie-breaking."
    ],
    "props": {
      "complete": "finite graphs",
      "optimal": "no",
      "time": "O(b^m) worst case",
      "space": "O(b^m)"
    }
  },
  params: [{ key: "tie", label: "Ties", type: "select", default: "alpha", options: [["alpha", "alphabetical"], ["fifo", "first in, first out"], ["lifo", "last in, first out"]] }],
  run(P, { tie }) { return Studio.search.run(P, "best", { tie }); },
});
