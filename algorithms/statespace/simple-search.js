/* Simple search without node pairs: OPEN and CLOSED hold bare states. */
Studio.register({
  id: "statespace-simple",
  name: "Simple search (no node pairs)",
  family: "Graph search · uninformed",
  week: 2,
  problem: "statespace",
  order: 130,
  summary: "OPEN and CLOSED hold only states. The search can say that a goal is reachable, but it cannot say how: with no parent stored, the path is lost. A demonstration of why the course keeps node pairs.",
  pseudocode: `OPEN ← [S];  CLOSED ← [ ]
while OPEN not empty
    N ← head(OPEN);  remove it
    if GoalTest(N): return "goal reached"        # but by which moves?
    CLOSED ← N : CLOSED
    children ← MoveGen(N) minus states on OPEN or CLOSED
    OPEN ← OPEN ++ children  (queue)  or  children ++ OPEN  (stack)
return failure`,
  complexity: "Same as BFS or DFS; only the bookkeeping is smaller",
  learn: {
    intro: "The first search procedures in the course keep only states on OPEN. They answer 'is a goal reachable?' but not 'how do I get there?'. This tracer runs that version on a state space so you can see the answer arrive without a path.",
    definition: "OPEN is a list of states, CLOSED a list of states. Each loop picks the head of OPEN, tests it, moves it to CLOSED and adds its unseen children. Nothing records which state generated which, so when the goal is picked there is no chain of parents to follow. Replacing each state by a node pair (state, parent, depth) fixes that.",
    steps: [
      ["N ← head(OPEN)", "A queue gives BFS order, a stack gives DFS order."],
      ["if GoalTest(N): return", "Reached, but only the fact is known."],
      ["CLOSED ← N : CLOSED", "Remember N is expanded."],
      ["children ← MoveGen(N) minus seen", "Without CLOSED, cycles can loop forever."],
    ],
    formulas: [
      { f: "path recovery needs one pointer per state", read: "parent(N)", why: "The path is the chain goal, parent(goal), parent(parent(goal)), … back to the start; with no pointers there is no chain." },
    ],
    why: "This is the motivation for node pairs: one extra field per entry turns 'a goal exists' into 'here is a solution'.",
    traps: [
      "Reaching the goal is not the same as having the solution. For puzzles the moves are the answer: run this on space-water-jug and the last step says the path is lost, while BFS on the same problem prints the 7 pourings.",
      "Switching OPEN between queue and stack changes how many states are expanded (15 for the queue, 9 for the stack on space-water-jug) but never recovers the path.",
      "Without CLOSED (not offered here) the procedure may never stop on a cyclic state space.",
    ],
    props: { complete: "yes (finite space, with CLOSED)", optimal: "n/a: no path is returned", time: "as BFS / DFS", space: "as BFS / DFS" },
  },
  defaultExample: "space-water-jug",
  params: [
    { key: "open", label: "OPEN is a", type: "select", default: "queue", options: [["queue", "queue (BFS order)"], ["stack", "stack (DFS order)"]] },
    { key: "maxExpand", label: "Expansion cap", type: "number", default: 400 },
  ],
  run(P, { open, maxExpand }) { return Studio.statespace.search(P, open === "stack" ? "dfs" : "bfs", { pairs: false, maxExpand }); },
});
