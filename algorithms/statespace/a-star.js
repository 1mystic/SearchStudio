/* A* on an implicit state space with a selectable 8-puzzle heuristic. */
Studio.register({
  id: "statespace-astar",
  name: "A* on a state space",
  family: "Graph search · informed",
  week: 5,
  problem: "statespace",
  order: 150,
  summary: "OPEN is ordered by f = g + h. With an admissible h (tiles out of place or Manhattan, for the 8-puzzle) the first goal picked is a shortest solution; the sharper h expands fewer states.",
  pseudocode: `OPEN ← [(S, nil, g=0)] ordered by f = g + h
while OPEN not empty
    N ← the pair with the least f;  remove it       # ties: alphabetical
    if GoalTest(N): return the path
    CLOSED ← N : CLOSED
    for each child C of MoveGen(N) with g' = g(N) + 1
        new: add (C, N, g') to OPEN
        cheaper than its pair on OPEN or CLOSED: update parent and g (reopen if CLOSED)`,
  complexity: "Exponential in general; the number of expansions falls as h improves",
  learn: {
    intro: "A* adds the cost paid so far to the heuristic estimate of what remains. On the 8-puzzle, with h = tiles out of place or Manhattan distance, it finds a shortest solution while expanding far fewer boards than breadth-first search.",
    definition: "Node pairs are (state, parent, g) with f = g + h. Every move costs 1, so g is the depth along the current best path. OPEN is ordered by f with alphabetical ties, the goal test is on picking, and a cheaper path to a known state updates its parent. If h never overestimates the true remaining moves (admissible) the first goal picked is optimal.",
    steps: [
      ["N ← least-f pair on OPEN", "f = g + h."],
      ["if GoalTest(N): return path", "With admissible h this is a shortest solution."],
      ["children: g' = g(N) + 1", "Unit cost per move."],
      ["cheaper path found: update", "Change the parent and g; reopen if CLOSED."],
    ],
    formulas: [
      { f: "f(N) = g(N) + h(N)", read: "paid plus estimated remainder", why: "An estimate of the cheapest solution through N." },
      { f: "h₁ ≤ h₂ ≤ h*", read: "tiles out of place ≤ Manhattan ≤ true moves left", why: "Each misplaced tile needs ≥ 1 move and each needs ≥ its Manhattan distance, so both are admissible and h₂ dominates h₁: A* with h₂ expands no more states than with h₁." },
      { f: "missionaries: h = 2·⌈(n − k)/(k − 1)⌉ + 1", read: "n people on the left bank, boat holds k (**supplementary**)", why: "Each round trip moves at most k − 1 people across net, and the last trip moves k; ignoring the safety rule only lowers the bound, so it is admissible." },
    ],
    why: "A better (larger, still admissible) h prunes more of the search. Run example space-8-puzzle-12 with each heuristic and compare the 'expanded' count: both return the same 12-move solution, Manhattan after 16 expansions, tiles out of place after 79, and h = 0 does not finish within the 400-expansion cap. (On the easy five-move board space-8-puzzle the two tie at 6.)",
    traps: [
      "Admissible is not enough to compare: the larger of two admissible heuristics is better informed.",
      "The blank is never counted in either heuristic; counting it can overestimate.",
      "With h = 0 (water jugs have no good h) A* degenerates to Uniform Cost Search, here the same as BFS.",
    ],
    props: { complete: "yes", optimal: "yes with admissible h", time: "exponential in general", space: "exponential in general" },
  },
  defaultExample: "space-8-puzzle-12",
  params: [
    { key: "h", label: "Heuristic (8-puzzle)", type: "select", default: "manhattan", options: [["manhattan", "Manhattan distance"], ["misplaced", "tiles out of place"], ["none", "none (h = 0)"]] },
    { key: "tie", label: "Ties", type: "select", default: "alpha", options: [["alpha", "alphabetical"], ["fifo", "first in, first out"], ["lifo", "last in, first out"]] },
    { key: "maxExpand", label: "Expansion cap", type: "number", default: 400 },
  ],
  run(P, { h, tie, maxExpand }) { return Studio.statespace.search(P, "astar", { h, tie, maxExpand }); },
});
