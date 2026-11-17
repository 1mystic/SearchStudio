/* Depth First Search on an implicit state space, with node pairs and CLOSED. */
Studio.register({
  id: "statespace-dfs",
  name: "DFS on a state space",
  family: "Graph search · uninformed",
  week: 2,
  problem: "statespace",
  order: 120,
  summary: "OPEN is a stack of node pairs (state, parent, depth): the newest children are picked first, so the search dives deep before it backs up. Finds a solution, usually not the shortest.",
  pseudocode: `OPEN ← [(S, nil, 0)];  CLOSED ← [ ]
while OPEN not empty
    (N, parent, d) ← head(OPEN);  remove it
    if GoalTest(N): return the path via parent pointers
    CLOSED ← (N, parent, d) : CLOSED
    if depth bound reached: continue
    children ← MoveGen(N) minus states on OPEN or CLOSED
    OPEN ← [(C, N, d+1) for C in children] ++ OPEN     # prepend = stack
return failure`,
  complexity: "Time O(b^m), space O(b·m) on a tree; with CLOSED the space is the number of states seen",
  learn: {
    intro: "Depth First Search follows one line of moves as far as it goes, and only when it hits a dead end (or a state it has seen) does it return to the most recent choice. On a state space with MoveGen in code this finds a solution fast, but not necessarily a short one.",
    definition: "The same node pairs (state, parent, depth) and the same OPEN/CLOSED lists as BFS, but OPEN is a stack: the children of the picked node are put at the front in MoveGen order, so the first child is picked next. The goal test is on picking. A child already on OPEN or CLOSED is not added again. An optional depth bound stops the dive.",
    steps: [
      ["OPEN ← [(S, nil, 0)]", ""],
      ["(N, parent, d) ← head(OPEN)", "Newest pair first (stack)."],
      ["if GoalTest(N): return path", "Tested on picking."],
      ["children ← MoveGen(N) minus seen states", "Graph search: no repeats."],
      ["OPEN ← children ++ OPEN", "Prepend: the first child is expanded next."],
    ],
    formulas: [
      { f: "solution depth ≥ shortest depth d", read: "a goal is found, maybe deep", why: "DFS commits to the first child each time, so the first goal it reaches lies on whatever branch it dived into." },
    ],
    why: "On the water-jug problem DFS reaches a state with 4 litres but often by a longer pouring sequence than BFS. On the 8-puzzle without a bound it can wander through thousands of states, which is why the studio has an expansion cap and an optional depth bound.",
    traps: [
      "DFS is not optimal: compare its solution length with BFS on the same problem.",
      "Without CLOSED, DFS can loop forever on a state space with cycles (pour back and forth). CLOSED fixes that.",
      "With a depth bound and CLOSED, a state first reached by a deep path is closed and not retried by a shorter one, so the search can miss a solution within the bound (supplementary note).",
      "The order of children is MoveGen's order; a different order sends the dive down another branch.",
    ],
    props: { complete: "yes on a finite space with CLOSED", optimal: "no", time: "O(b^m)", space: "linear on a tree; with CLOSED, all states seen" },
  },
  params: [
    { key: "depthBound", label: "Depth bound (0 = none)", type: "number", default: 0 },
    { key: "maxExpand", label: "Expansion cap", type: "number", default: 400 },
  ],
  run(P, { depthBound, maxExpand }) { return Studio.statespace.search(P, "dfs", { depthBound, maxExpand }); },
});
