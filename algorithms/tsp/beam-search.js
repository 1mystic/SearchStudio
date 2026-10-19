/* Beam search over complete tours (course pseudocode). */
Studio.register({
  id: "tsp-beam",
  name: "Beam search",
  family: "TSP · local search",
  week: 3,
  problem: "tsp",
  order: 80,
  summary: "Keep the w best neighbours of all beam members at every level; stop when the best of the level is no better than the best so far. w = 1 is hill climbing.",
  pseudocode: `OPEN ← [start];  N ← start
do
    bestEver ← N
    neighbours ← MoveGen(OPEN)        # of every node in OPEN, duplicates merged
    OPEN ← the w best of neighbours
    N ← head(OPEN)
while cost(N) < cost(bestEver)
return bestEver`,
  complexity: "Per level: w × |neighbourhood| evaluations; memory O(w)",
  learn: {
    "intro": "Hill climbing follows one path. Beam search keeps a few of the best candidates at each level, a beam of width w, so a slightly worse option that leads somewhere better is not thrown away immediately.",
    "definition": "OPEN holds w tours. Each level, generate the neighbours of all tours in OPEN, keep the w best as the new OPEN, and stop when the best of the level is no better than the best seen before.",
    "steps": [
      [
        "OPEN ← [start]",
        ""
      ],
      [
        "neighbours ← MoveGen(OPEN)",
        "Neighbours of every member, with duplicates merged."
      ],
      [
        "OPEN ← the w best of neighbours",
        "This is the beam."
      ],
      [
        "N ← head(OPEN)",
        "Best tour of the level."
      ],
      [
        "while cost(N) < cost(bestEver)",
        "Stop when the level brings no improvement."
      ]
    ],
    "formulas": [
      {
        "f": "memory = w, work per level ≈ w · |N|",
        "read": "width times neighbourhood size",
        "why": "Beam search trades memory for robustness; w = 1 is hill climbing, w = ∞ approaches breadth-first search."
      }
    ],
    "why": "Keeping alternatives lets the search survive one bad step. A narrow beam can still miss the path to the optimum; a wide one costs more.",
    "traps": [
      "w = 1 behaves exactly like hill climbing.",
      "Merge duplicate tours when generating neighbours of several beam members.",
      "Stopping is on the level's best, not on any member improving."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "w · |N| per level",
      "space": "O(w)"
    }
  },
  params: [Studio.tsp.startParam, { key: "w", label: "Beam width w", type: "int", default: 2, min: 1, max: 10 }, Studio.tsp.mgParam("2-city"), Studio.seedParam(1)],
  run(P, { start, w, movegen, seed }) {
    const T = Studio.tsp, steps = [];
    let OPEN = [T.startTour(P, start, seed)], N = OPEN[0], bestEver = N;
    const levels = [];
    const show = (cap, extra = {}) => steps.push(Object.assign({
      caption: cap, nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, N),
      lists: [{ label: "OPEN", items: OPEN.map((t, i) => ({ text: `${T.canon(t, P.ids[0]).join(",")} ${P.cost(t)}`, state: i === 0 ? "open" : "plain" })) }],
      table: { title: `levels (w = ${w})`, columns: ["level", "generated", "OPEN", "best"], rows: levels.map(l => l.slice()), rowStates: levels.map((_, i) => (i === levels.length - 1 ? "cur" : "")) },
      stats: [{ label: "bestEver", value: P.cost(bestEver) }],
    }, extra));
    levels.push([0, "start", `${N.join(",")} ${P.cost(N)}`, P.cost(N)]);
    show(`Level 0: OPEN = [${N.join(",")}] = ${P.cost(N)}`);
    for (let lv = 1; lv < 50; lv++) {
      bestEver = N;
      const seen = new Map();
      OPEN.forEach(t => T.moveGens[movegen].fn(P, t).forEach(r => { const k = T.canon(r.tour).join(","); if (!seen.has(k)) seen.set(k, r.tour); }));
      const ranked = [...seen.values()].sort((a, b) => P.cost(a) - P.cost(b) || (a.join() < b.join() ? -1 : 1));
      OPEN = ranked.slice(0, w); N = OPEN[0];
      levels.push([lv, seen.size, OPEN.map(t => `${T.canon(t, P.ids[0]).join(",")} ${P.cost(t)}`).join(" | "), P.cost(N)]);
      const improved = P.cost(N) < P.cost(bestEver);
      if (improved) bestEver = N;
      show(`Level ${lv}: ${seen.size} distinct neighbours, keep ${OPEN.length}. Head ${P.cost(N)} ${improved ? "<" : "≥"} bestEver ${improved ? "→ continue" : "→ stop"}`,
        improved ? {} : { nodes: Studio.tspSteps.nodes(P, "path") });
      if (!improved) break;
    }
    const best = bestEver;
    steps.push({ caption: `Beam search (w = ${w}) returns ${best.join(",")} = ${P.cost(best)}`, nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, best, { state: "path" }),
      table: { title: `levels (w = ${w})`, columns: ["level", "generated", "OPEN", "best"], rows: levels }, stats: [{ label: "result", value: P.cost(best), state: "ok" }] });
    return { steps, result: { tour: best, cost: P.cost(best) } };
  },
});
