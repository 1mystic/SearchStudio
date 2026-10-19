/* Depth First Search (graph search: seen nodes are not reopened). */
Studio.register({
  id: "search-dfs",
  name: "Depth First Search",
  family: "Graph search · uninformed",
  week: 2,
  problem: "graph",
  order: 20,
  summary: "OPEN is a stack: new children are prepended, so the deepest node is expanded first. Little memory, no optimality.",
  pseudocode: `OPEN ← [(S, nil, 0)];  CLOSED ← [ ]
while OPEN not empty
    (N, parent, d) ← head(OPEN);  remove it
    if GoalTest(N): return the path
    CLOSED ← (N, parent, d) : CLOSED
    children ← MoveGen(N) minus nodes on OPEN or CLOSED
    OPEN ← [(C, N, d+1) for C in children] ++ OPEN     # prepend = stack
return failure`,
  complexity: "Time O(b^m), space O(b·m)",
  learn: {
    "intro": "Depth First Search goes as deep as possible along one path before backing up. It needs little memory but can wander far from a nearby goal.",
    "definition": "A state-space search problem has a start node S, a goal test, and a MoveGen function that lists the neighbours of a node. The search keeps two lists: OPEN (nodes generated but not yet expanded) and CLOSED (nodes already expanded). Each entry is a node pair (node, parent, value) so the path can be read back through parents. DFS treats OPEN as a stack: new children go to the front.",
    "steps": [
      [
        "OPEN ← [(S, nil, 0)]",
        ""
      ],
      [
        "(N, parent, d) ← head(OPEN)",
        "Newest entry first (stack)."
      ],
      [
        "if GoalTest(N): return path",
        ""
      ],
      [
        "CLOSED ← (N, parent, d) : CLOSED",
        ""
      ],
      [
        "OPEN ← children ++ OPEN",
        "Prepend = stack = depth first."
      ]
    ],
    "formulas": [
      {
        "f": "space ≈ b · m",
        "read": "branching factor times maximum depth",
        "why": "Only the current path and the siblings along it are stored."
      }
    ],
    "why": "Memory-light, but neither optimal nor guaranteed to finish on infinite or very deep spaces.",
    "traps": [
      "The path found depends heavily on MoveGen order.",
      "Do not confuse the order children are pushed with the order they are expanded."
    ],
    "props": {
      "complete": "finite graphs only",
      "optimal": "no",
      "time": "O(b^m)",
      "space": "O(b·m)"
    }
  },
  params: [],
  run(P) { return Studio.search.run(P, "dfs"); },
});
