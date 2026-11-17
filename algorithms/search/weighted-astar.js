/* Weighted A*: f = g + w·h as its own entry, with the w-suboptimality bound checked at the end. */
Studio.register({
  id: "search-weighted-astar",
  name: "Weighted A*",
  family: "Graph search · optimal",
  week: 5,
  problem: "graph",
  order: 61,
  defaultExample: "graph-dijkstra",
  summary: "A* with f = g + w·h, w ≥ 1. Trusting h more makes the search greedier and usually faster. With an admissible h the path cost is at most w times the optimum C*.",
  pseudocode: `OPEN ← [(S, nil, g=0)] ordered by f = g + w·h
while OPEN not empty
    N ← node with least f;  remove it
    if GoalTest(N): return the path               # cost ≤ w · C*  (admissible h)
    move N to CLOSED
    for each child C with g' = g(N) + k(N,C)
        new: add to OPEN
        cheaper than its pair on OPEN/CLOSED: update parent and g (reopen if CLOSED)`,
  complexity: "Usually far fewer expansions than A*; bound cost ≤ w·C*",
  learn: {
    "intro": "Weighted A* multiplies the heuristic by a factor w ≥ 1. With w = 1 it is A*; with a large w it behaves like Best First Search. You trade optimality for speed, and the trade is controlled: the path is never worse than w times the best one.",
    "definition": "OPEN is ordered on f(N) = g(N) + w·h(N). Everything else is as in A*: a goal test when a node is picked, and cheaper paths update the pair (node, parent, g). If h is admissible (h ≤ h*), the cost of the path returned satisfies cost ≤ w · C*, where C* is the optimal cost. The tracer computes C* with a separate Uniform Cost Search and checks the bound at the end.",
    "steps": [
      ["f(N) = g(N) + w·h(N)", "w = 1 is A*; w > 1 favours nodes that look close to the goal."],
      ["N ← least-f node", "Ties alphabetical."],
      ["if GoalTest(N): return", "Not guaranteed optimal when w > 1."],
      ["update cheaper paths", "Reopen CLOSED nodes if needed."],
      ["check cost ≤ w · C*", "Holds when h is admissible."]
    ],
    "formulas": [
      { "f": "f(N) = g(N) + w·h(N)", "read": "cost so far plus w times the estimate", "why": "w > 1 inflates h, which pulls the search toward the goal." },
      { "f": "cost(path) ≤ w · C*   (h admissible, w ≥ 1)", "read": "at most w times the optimum", "why": "w·h(N) ≤ w·h*(N), so w·h is within a factor w of an admissible estimate, and the first goal picked can be only that much worse than the best." }
    ],
    "why": "Fewer expansions than A* on many graphs, at the price of a controlled loss of optimality. It is a good compromise when A* is too slow. The bound is a guarantee, not a prediction: the actual path is often optimal.",
    "traps": [
      "The bound needs an admissible h. With an inadmissible h there is no guarantee at all (try the inadmissible example).",
      "w = 1 gives plain A*; w < 1 is not weighted A* (it drifts toward UCS and loses the bound meaning).",
      "A larger w does not always expand fewer nodes on every graph; it usually does.",
      "The trade in numbers: on the 'Dijkstra demo' graph w = 2 returns S–C–G at cost 9 (optimum 8, bound 2 × 8 = 16) after 3 expansions instead of A*'s 5; on the 4×5 grid w = 2 expands 8 nodes instead of 20 and still finds cost 7. Set w = 1 to get A* back."
    ],
    "props": { "complete": "yes", "optimal": "no: within w · C* with admissible h", "time": "often much less than A*", "space": "same as A*" }
  },
  params: [
    { key: "weight", label: "Weight w on h", type: "number", default: 2, min: 1, max: 20 },
    { key: "tie", label: "Ties", type: "select", default: "alpha", options: [["alpha", "alphabetical"], ["fifo", "first in, first out"], ["lifo", "last in, first out"]] },
  ],
  run(P, { weight, tie }) {
    const w = weight == null || weight < 1 ? 1 : weight, F = Studio.fmt;
    const r = Studio.search.run(P, "astar", { weight: w, tie });
    const opt = Studio.search.run(P, "ucs", {}).result;
    const hs = Studio.gs.hstar(P, P.goal);
    const admissible = P.ids.every(i => P.h[i] <= hs[i] + 1e-9);
    const last = r.steps[r.steps.length - 1];
    if (r.result.found && opt.found) {
      const limit = w * opt.cost, within = r.result.cost <= limit + 1e-9;
      const note = admissible
        ? ` Bound check: C* = ${F(opt.cost)} (from UCS), w·C* = ${F(w)} × ${F(opt.cost)} = ${F(limit)}; cost ${F(r.result.cost)} ≤ ${F(limit)} ${within ? "holds" : "FAILS"}.`
        : ` h is not admissible here, so the bound w·C* = ${F(limit)} is not guaranteed (cost ${F(r.result.cost)}, C* = ${F(opt.cost)}).`;
      last.caption += note;
      last.stats = (last.stats || []).concat([{ label: "C* (UCS)", value: F(opt.cost) }, { label: "w·C*", value: F(limit), state: within ? "ok" : "bad" }]);
      Object.assign(r.result, { optimal: opt.cost, bound: limit, withinBound: within, admissible, weight: w });
    }
    return r;
  },
});
