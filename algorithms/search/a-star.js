/* A* (and weighted A*) on f = g + w·h. */
Studio.register({
  id: "search-astar",
  name: "A*",
  family: "Graph search · optimal",
  week: 5,
  problem: "graph",
  order: 60,
  summary: "OPEN is a priority queue on f(N) = g(N) + w·h(N). With w = 1 and an admissible h (h ≤ h*) the first goal picked is optimal. w > 1 is weighted A*: faster, not guaranteed optimal.",
  pseudocode: `OPEN ← [(S, nil, g=0)] ordered by f = g + w·h
while OPEN not empty
    N ← node with least f;  remove it
    if GoalTest(N): return the path
    move N to CLOSED
    for each child C with g' = g(N) + k(N,C)
        new: add to OPEN
        cheaper than its pair on OPEN/CLOSED: update parent and g (reopen if CLOSED)`,
  complexity: "Exponential in general; linear with a perfect h",
  learn: {
    "intro": "A* combines the cost already paid with an estimate of the cost remaining. With an estimate that never overestimates, it finds the cheapest path and usually expands far fewer nodes than Uniform Cost Search.",
    "definition": "A state-space search problem has a start node S, a goal test, and a MoveGen function that lists the neighbours of a node. The search keeps two lists: OPEN (nodes generated but not yet expanded) and CLOSED (nodes already expanded). Each entry is a node pair (node, parent, value) so the path can be read back through parents. OPEN is ordered by f(N) = g(N) + w·h(N). With w = 1 and an admissible h this is A*; with w > 1 it is weighted A*.",
    "steps": [
      [
        "f(N) = g(N) + h(N)",
        "Estimated cost of the cheapest solution through N."
      ],
      [
        "N ← least-f node",
        ""
      ],
      [
        "if GoalTest(N): return",
        "With admissible h the first goal picked is optimal."
      ],
      [
        "update cheaper paths",
        "Change parent and g; reopen CLOSED nodes if needed."
      ]
    ],
    "formulas": [
      {
        "f": "f(N) = g(N) + h(N)",
        "read": "paid so far plus estimated remainder",
        "why": "Balances progress (g) against promise (h)."
      },
      {
        "f": "admissible: h(N) ≤ h*(N) for all N",
        "read": "never overestimate the true remaining cost",
        "why": "Then f never overestimates the true cost of a path through N, so the optimal path is never skipped."
      },
      {
        "f": "consistent: h(N) ≤ k(N,M) + h(M)",
        "read": "the triangle inequality for h",
        "why": "Then f never decreases along a path and closed nodes never need reopening."
      },
      {
        "f": "weighted A*: f = g + w·h, w > 1",
        "read": "trust the heuristic more",
        "why": "Faster, but the path can be up to w times the optimum."
      }
    ],
    "why": "A* is optimal with an admissible h and is as efficient as any algorithm using the same h. Overestimating h (inadmissible) can make it return a worse path: try the 'inadmissible' example.",
    "traps": [
      "Admissible ≠ consistent: consistency implies admissibility, not the reverse.",
      "h = 0 makes A* behave like UCS.",
      "With an inadmissible h the first goal found may not be optimal."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes with admissible h",
      "time": "exponential in general",
      "space": "same"
    }
  },
  params: [
    { key: "weight", label: "Weight w on h", type: "number", default: 1 },
    { key: "tie", label: "Ties", type: "select", default: "alpha", options: [["alpha", "alphabetical"], ["fifo", "first in, first out"], ["lifo", "last in, first out"]] },
  ],
  run(P, { weight, tie }) { return Studio.search.run(P, "astar", { weight, tie }); },
});
