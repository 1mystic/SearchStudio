/* Depth-bounded DFS as a standalone algorithm (the engine already supports depthBound). */
Studio.register({
  id: "search-dfs-bounded",
  name: "Depth-Bounded DFS",
  family: "Graph search · uninformed",
  week: 2,
  problem: "graph",
  order: 25,
  summary: "Depth First Search that refuses to generate children below a depth bound. Memory stays small and loops cannot run away, but a goal deeper than the bound is missed.",
  pseudocode: `OPEN ← [(S, nil, 0)];  CLOSED ← [ ]
while OPEN not empty
    (N, parent, d) ← head(OPEN);  remove it
    if GoalTest(N): return the path
    CLOSED ← (N, parent, d) : CLOSED
    if d < depthBound:
        children ← MoveGen(N) minus nodes on OPEN or CLOSED
        OPEN ← [(C, N, d+1) for C in children] ++ OPEN     # stack
return failure   (no goal within the bound)`,
  complexity: "Time O(b^bound), space O(b·bound)",
  learn: {
    "intro": "Depth-bounded DFS is plain Depth First Search with a ceiling on depth. A node at the bound is tested but never expanded, so the search cannot dive forever down one branch.",
    "definition": "OPEN is a stack of node pairs (N, parent, depth). The start node has depth 0 and a child has depth(parent)+1. When the node taken from OPEN has depth equal to the bound, it is goal-tested but no children are generated. If OPEN empties without reaching the goal, there is no goal within the bound (the search is incomplete: a deeper goal is not ruled out).",
    "steps": [
      ["OPEN ← [(S, nil, 0)]", "The start node has depth 0."],
      ["(N, parent, d) ← head(OPEN)", "Newest entry first (stack)."],
      ["if GoalTest(N): return", "The goal test happens when a node is picked."],
      ["if d < depthBound: expand", "Nodes at the bound are not expanded."],
      ["children get depth d + 1", "They go to the front of OPEN."]
    ],
    "formulas": [
      { "f": "depth(C) = depth(N) + 1", "read": "a child is one level deeper", "why": "Depth is what the bound limits." },
      { "f": "expand N only if depth(N) < bound", "read": "stop generating at the ceiling", "why": "This guarantees every branch has finite length, so the search terminates." }
    ],
    "why": "It is the building block of DFID: run it with bound 0, 1, 2, … to get the completeness of BFS with the memory of DFS. On its own it is incomplete, and the path it finds is not guaranteed to be shortest.",
    "traps": [
      "A bound that is too small fails even though a goal exists: failure only means no goal within the bound (graph-dfs-deep: bound 2 fails, bound 3 finds the goal at depth 3).",
      "Even a bound that is large enough can fail with a CLOSED list: a node first reached by a long route is closed at the bound and a later short route to it is skipped (graph-dfid-closed, bound 3 fails; DFID succeeds there because it reopens such nodes).",
      "A bound that is too large behaves like plain DFS and can find a long, winding path.",
      "The goal test applies to nodes at the bound too; only their expansion is skipped."
    ],
    "props": { "complete": "no (only if the goal is within the bound)", "optimal": "no", "time": "O(b^bound)", "space": "O(b·bound)" }
  },
  defaultExample: "graph-dfs-deep",
  params: [{ key: "depthBound", label: "Depth bound", type: "int", default: 3, min: 0, max: 40 }],
  run(P, { depthBound }) { return Studio.search.run(P, "dfs", { depthBound: depthBound == null ? 3 : depthBound }); },
});
