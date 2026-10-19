/* Tabu search: best non-tabu neighbour, tabu tenure on the moved pair, aspiration criterion. */
Studio.register({
  id: "tsp-tabu",
  name: "Tabu search",
  family: "TSP · local search",
  week: 3,
  problem: "tsp",
  order: 90,
  summary: "Always move to the best neighbour that is not tabu, even if it is worse. A move's key (the swapped pair / removed edges) stays tabu for tt iterations; aspiration allows a tabu move that beats bestSeen.",
  pseudocode: `N ← start;  bestSeen ← N
repeat for k iterations
    candidates ← MoveGen(N), best first
    pick the first candidate that is not tabu,
         or is tabu but better than bestSeen (aspiration)
    make its key tabu for tt iterations
    N ← candidate;  if N better than bestSeen: bestSeen ← N
return bestSeen`,
  complexity: "k × |neighbourhood| evaluations; memory O(tt)",
  learn: {
    "intro": "Tabu search always moves, even downhill, to escape local optima. To avoid simply stepping back to where it came from, it keeps a short-term memory of recent moves that are forbidden (tabu) for a few iterations.",
    "definition": "At each iteration, move to the best neighbour whose move is not tabu. Mark that move tabu for tt iterations (the tenure). A tabu move is allowed anyway if it gives a tour better than any seen (aspiration). Return the best tour seen.",
    "steps": [
      [
        "N ← start;  bestSeen ← N",
        ""
      ],
      [
        "candidates ← MoveGen(N), best first",
        ""
      ],
      [
        "first candidate that is not tabu (or beats bestSeen)",
        "This can be worse than N: that is how tabu escapes local optima."
      ],
      [
        "make its key tabu for tt iterations",
        "Here the key is the swapped pair of cities."
      ],
      [
        "N ← candidate; update bestSeen",
        "Return bestSeen at the end."
      ]
    ],
    "formulas": [
      {
        "f": "tabu(m) ⇔ t < expiry(m),  expiry(m) = t(used) + tt",
        "read": "a move stays forbidden for tt iterations",
        "why": "Short tenure risks cycling; long tenure can block good moves."
      },
      {
        "f": "aspiration: allow m if cost(m(N)) < cost(bestSeen)",
        "read": "a forbidden move is fine if it finds a new best",
        "why": "Tabu exists to stop cycling, not to block real improvements."
      }
    ],
    "why": "Memory turns a greedy walk into a systematic one. On small instances a short tenure leads to cycles; a frequency memory (prefer rarely-used moves) further diversifies the search.",
    "traps": [
      "Tabu takes the best non-tabu move even if it is worse than the current tour.",
      "Apply aspiration before rejecting a tabu move.",
      "Return bestSeen, not the final current tour."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "iterations × |N|",
      "space": "O(tt)"
    }
  },
  params: [
    { key: "start", label: "Start tour", type: "select", default: "trap", options: [["trap", "Hill-climbing local optimum of the Greedy tour"], ["greedy", "Greedy tour"], ["nn", "Nearest-neighbour tour"], ["alphabetical", "A, B, C, … in order"], ["random", "Random (uses seed)"]], allowText: true },
    { key: "tenure", label: "Tabu tenure tt", type: "int", default: 2, min: 1, max: 20 },
    { key: "iters", label: "Iterations", type: "int", default: 8, min: 1, max: 60 },
    Studio.tsp.mgParam("2-city"), Studio.seedParam(1),
  ],
  run(P, { start, tenure, iters, movegen, seed }) {
    const T = Studio.tsp, steps = [];
    let cur = start === "trap" ? Studio.tsp.hillClimb(P, T.startTour(P, "greedy"), movegen).pop().tour : T.startTour(P, start, seed);
    let best = cur;
    const tabu = new Map(), rows = [[0, "start", T.canon(cur, P.ids[0]).join(","), P.cost(cur), "–", P.cost(best)]], states = [""];
    const snap = (cap, extra = {}) => steps.push(Object.assign({
      caption: cap, nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, cur),
      table: { title: `tenure ${tenure}`, columns: ["it", "move", "tour", "cost", "tabu", "best"], rows: rows.map(r => r.slice()), rowStates: states.map((s, i) => (i === states.length - 1 ? s || "cur" : s)) },
      lists: [{ label: "TABU", items: [...tabu.entries()].map(([k, v]) => ({ text: `${k} until ${v}`, state: "open" })) }],
      stats: [{ label: "current", value: P.cost(cur) }, { label: "bestSeen", value: P.cost(best), state: "ok" }],
    }, extra));
    snap(`Start ${cur.join(",")} = ${P.cost(cur)}`);
    const visited = new Map([[T.canon(cur).join(","), 0]]);
    for (let it = 1; it <= iters; it++) {
      const nb = T.moveGens[movegen].fn(P, cur).sort((a, b) => a.cost - b.cost || (a.tour.join() < b.tour.join() ? -1 : 1));
      let chosen = null, asp = false; const skipped = [];
      for (const r of nb) {
        const isTabu = (tabu.get(r.key) || 0) >= it;
        if (isTabu && r.cost < P.cost(best)) { chosen = r; asp = true; break; }
        if (isTabu) { skipped.push(`${r.move} (${r.cost})`); continue; }
        chosen = r; break;
      }
      if (!chosen) { snap(`Iteration ${it}: every neighbour is tabu — stop`); break; }
      const worse = chosen.cost > P.cost(cur);
      cur = chosen.tour;
      tabu.set(chosen.key, it + tenure);
      for (const [k, v] of tabu) if (v <= it) tabu.delete(k);
      const newBest = P.cost(cur) < P.cost(best);
      if (newBest) best = cur;
      const key = T.canon(cur).join(",");
      const again = visited.has(key);
      visited.set(key, it);
      rows.push([it, chosen.move, T.canon(cur, P.ids[0]).join(","), P.cost(cur), [...tabu.keys()].sort().join(",") || "–", P.cost(best)]);
      states.push(newBest ? "ok" : asp ? "warn" : again ? "warn" : worse ? "bad" : "");
      snap(`Iteration ${it}: ${chosen.move} → ${P.cost(cur)}${worse ? " (worse, taken anyway)" : ""}${asp ? " — tabu, allowed by aspiration" : ""}${skipped.length ? `; skipped tabu ${skipped.slice(0, 2).join(", ")}` : ""}${again ? "; this tour was seen before (cycle)" : ""}`);
    }
    steps.push({ caption: `bestSeen ${best.join(",")} = ${P.cost(best)}`, nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, best, { state: "path" }),
      table: { title: `tenure ${tenure}`, columns: ["it", "move", "tour", "cost", "tabu", "best"], rows, rowStates: states }, stats: [{ label: "bestSeen", value: P.cost(best), state: "ok" }] });
    return { steps, result: { tour: best, cost: P.cost(best) } };
  },
});
