/* Best First Search on an implicit state space: OPEN ordered by h alone. */
Studio.register({
  id: "statespace-best-first",
  name: "Best First on a state space",
  family: "Graph search · informed",
  week: 3,
  problem: "statespace",
  order: 140,
  summary: "OPEN is ordered by the heuristic h alone: the state that looks closest to the goal is expanded next. Often fast, never guaranteed to give the shortest solution.",
  pseudocode: `OPEN ← [(S, nil, h(S))];  CLOSED ← [ ]
while OPEN not empty
    N ← the pair with the least h;  remove it      # ties: alphabetical
    if GoalTest(N): return the path
    CLOSED ← N : CLOSED
    children ← MoveGen(N) minus states on OPEN or CLOSED
    OPEN ← OPEN ++ children, sorted by h`,
  complexity: "Exponential worst case; very fast with a good h",
  learn: {
    intro: "Best First Search trusts the heuristic completely. In the 8-puzzle, h counts tiles out of place or their Manhattan distance to the goal squares; the board that looks nearest to the goal is expanded first.",
    definition: "OPEN holds node pairs (state, parent, h) ordered by h. The goal test is on picking from OPEN, ties break alphabetically (by state), and a state already on OPEN or CLOSED is not added again. Unlike A*, the cost already paid is ignored.",
    steps: [
      ["N ← least-h pair on OPEN", "Greedy: only the estimate counts."],
      ["if GoalTest(N): return path", "Tested on picking."],
      ["children ← MoveGen(N) minus seen", ""],
      ["sort OPEN by h", "Ties alphabetical."],
    ],
    formulas: [
      { f: "tiles out of place: h₁ = number of tiles not on their goal square", read: "blank not counted", why: "Each such tile needs at least one move." },
      { f: "Manhattan: h₂ = Σ |row − goal row| + |col − goal col|", read: "sum of tile distances", why: "A tile moves one square per move, so it needs at least its Manhattan distance; h₂ ≥ h₁." },
    ],
    why: "Both heuristics are admissible for the 8-puzzle, but Best First ignores g, so it may take a long way round. Compare the length of its solution with A*'s on the same board.",
    traps: [
      "Best First is not optimal even with an admissible h.",
      "A heuristic that is 0 everywhere turns the order into ties, i.e. alphabetical order of states.",
      "For water jugs there is no useful h (it is 0); for missionaries and cannibals the studio uses the full-boat crossing bound.",
    ],
    props: { complete: "yes on a finite space with CLOSED", optimal: "no", time: "exponential worst case", space: "exponential worst case" },
  },
  params: [
    { key: "h", label: "Heuristic (8-puzzle)", type: "select", default: "manhattan", options: [["manhattan", "Manhattan distance"], ["misplaced", "tiles out of place"], ["none", "none (h = 0)"]] },
    { key: "tie", label: "Ties", type: "select", default: "alpha", options: [["alpha", "alphabetical"], ["fifo", "first in, first out"], ["lifo", "last in, first out"]] },
    { key: "maxExpand", label: "Expansion cap", type: "number", default: 400 },
  ],
  run(P, { h, tie, maxExpand }) { return Studio.statespace.search(P, "best", { h, tie, maxExpand }); },
});
