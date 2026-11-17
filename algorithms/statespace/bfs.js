/* Breadth First Search on an implicit state space (MoveGen in code), with node pairs and CLOSED. */
Studio.register({
  id: "statespace-bfs",
  name: "BFS on a state space",
  family: "Graph search · uninformed",
  week: 2,
  problem: "statespace",
  order: 110,
  summary: "OPEN is a queue of node pairs (state, parent, depth). The graph is never listed: MoveGen produces each state's neighbours on demand, and only the explored part is drawn. Finds a solution with the fewest moves.",
  pseudocode: `OPEN ← [(S, nil, 0)];  CLOSED ← [ ]
while OPEN not empty
    (N, parent, d) ← head(OPEN);  remove it
    if GoalTest(N): return the path via parent pointers
    CLOSED ← (N, parent, d) : CLOSED
    children ← MoveGen(N) minus states on OPEN or CLOSED
    OPEN ← OPEN ++ [(C, N, d+1) for C in children]     # append = queue
return failure`,
  complexity: "Time and space O(b^d); here b = moves per state, d = fewest moves to the goal",
  learn: {
    intro: "Water jugs, the 8-puzzle and missionaries-and-cannibals all have a start state, a goal test and a rule for the legal moves. Nobody draws their graph: MoveGen writes the neighbours of a state when asked. Breadth First Search explores in rings, so the first goal it picks is a solution with the fewest moves.",
    definition: "A state-space problem is (S, GoalTest, MoveGen). OPEN holds node pairs (state, parent, depth) that have been generated but not expanded; CLOSED holds those already expanded. BFS keeps OPEN as a queue. The goal test is applied when a node is picked from OPEN. A child that is already on OPEN or CLOSED is not added again, which is what makes this graph search rather than tree search. The parent in each pair lets us read the solution back.",
    steps: [
      ["OPEN ← [(S, nil, 0)]", "The start state has no parent."],
      ["(N, parent, d) ← head(OPEN)", "Oldest pair first (queue), so shallow states go before deep ones."],
      ["if GoalTest(N): return path", "Tested on picking, not on generating."],
      ["children ← MoveGen(N) minus seen states", "Discard states already on OPEN or CLOSED."],
      ["OPEN ← OPEN ++ children", "Append: new states wait behind older ones."],
    ],
    formulas: [
      { f: "nodes ≤ 1 + b + b² + … + b^d", read: "at most b^d states in the last ring", why: "Every state in ring k has up to b children, so rings grow geometrically; CLOSED stops repeats from adding more." },
      { f: "solution length = depth of the first goal picked", read: "fewest moves", why: "All states at depth k are picked before any at depth k + 1." },
    ],
    why: "The water-jug problem (8, 5, 3 litres, aim for 4) has only 16 reachable states, so BFS finishes quickly and the answer, 7 pourings, is the shortest. On the 8-puzzle the rings grow fast, which is why informed search (A*) matters.",
    traps: [
      "Without CLOSED the same state is generated again and again (pour A→B then B→A). Graph search cuts these cycles.",
      "The goal test is on picking from OPEN, not on generating, so the last ring is generated before the search stops.",
      "Ties and the order of children follow MoveGen's order. A different order gives a different but equally short solution.",
    ],
    props: { complete: "yes (finite state space)", optimal: "yes, fewest moves (unit move cost)", time: "O(b^d)", space: "O(b^d)" },
  },
  params: [
    { key: "maxExpand", label: "Expansion cap", type: "number", default: 400 },
  ],
  run(P, { maxExpand }) { return Studio.statespace.search(P, "bfs", { maxExpand }); },
});
