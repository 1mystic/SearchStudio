/* Breadth First Search (graph search: seen nodes are not reopened). */
Studio.register({
  id: "search-bfs",
  name: "Breadth First Search",
  family: "Graph search · uninformed",
  week: 2,
  problem: "graph",
  order: 10,
  summary: "OPEN is a queue: new children are appended, so the shallowest node is expanded first. Finds a path with the fewest edges.",
  pseudocode: `OPEN ← [(S, nil, 0)];  CLOSED ← [ ]
while OPEN not empty
    (N, parent, d) ← head(OPEN);  remove it
    if GoalTest(N): return the path via parent pointers
    CLOSED ← (N, parent, d) : CLOSED
    children ← MoveGen(N) minus nodes on OPEN or CLOSED
    OPEN ← OPEN ++ [(C, N, d+1) for C in children]     # append = queue
return failure`,
  complexity: "Time and space O(b^d)",
  learn: {
    "intro": "Breadth First Search explores in rings: first everything one step from the start, then two steps, and so on. It finds the path with the fewest edges.",
    "definition": "A state-space search problem has a start node S, a goal test, and a MoveGen function that lists the neighbours of a node. The search keeps two lists: OPEN (nodes generated but not yet expanded) and CLOSED (nodes already expanded). Each entry is a node pair (node, parent, value) so the path can be read back through parents. BFS treats OPEN as a queue: new children go to the back.",
    "steps": [
      [
        "OPEN ← [(S, nil, 0)]",
        ""
      ],
      [
        "(N, parent, d) ← head(OPEN)",
        "Oldest entry first (queue)."
      ],
      [
        "if GoalTest(N): return path",
        "The goal test is applied when a node is picked from OPEN, as in the course."
      ],
      [
        "CLOSED ← (N, parent, d) : CLOSED",
        ""
      ],
      [
        "children not on OPEN or CLOSED",
        "Graph search: seen nodes are not added again."
      ],
      [
        "OPEN ← OPEN ++ children",
        "Append = queue = breadth first."
      ]
    ],
    "formulas": [
      {
        "f": "nodes ≈ b^d",
        "read": "branching factor to the power of the goal depth",
        "why": "BFS must hold an entire level of the tree in OPEN: memory, not time, is its bottleneck."
      }
    ],
    "why": "Complete on finite graphs and optimal when every edge costs the same. Uses a lot of memory.",
    "traps": [
      "Optimal in number of edges, not in total cost when edge costs differ.",
      "Children are added in MoveGen order (alphabetical here)."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes for unit costs",
      "time": "O(b^d)",
      "space": "O(b^d)"
    }
  },
  params: [],
  run(P) { return Studio.search.run(P, "bfs"); },
});
