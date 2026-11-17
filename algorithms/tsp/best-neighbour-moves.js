/* Always take the best neighbour for a fixed number of moves, even uphill: shows cycling. */
Studio.register({
  id: "tsp-best-neighbour-moves",
  name: "Best neighbour, k moves",
  family: "TSP · local search",
  week: 3,
  problem: "tsp",
  order: 105,
  summary: "From the start tour, move to the best neighbour every time for a fixed number of moves, even when it is worse than the current tour. At a local optimum the best neighbour is worse, and the next best neighbour is usually the tour we just left, so the search cycles.",
  pseudocode: `N ← start;  bestSeen ← N
repeat k moves
    N ← the best neighbour of N          # lowest cost, even if worse than N
    if N better than bestSeen: bestSeen ← N
    if N was visited before: report the cycle
return bestSeen`,
  complexity: "k full neighbourhood scans",
  learn: {
    intro: "Hill climbing stops when no neighbour is better. A tempting fix is to keep going: always move to the best neighbour, even if it is worse. With no memory, this does not escape for long. From a local optimum the best neighbour is worse, but from there the best neighbour is usually the local optimum again, so the search bounces back and forth.",
    definition: "Repeat a fixed number k of times: generate all neighbours of the current tour with the chosen MoveGen and move to the cheapest one (ties alphabetically by tour). There is no test for improvement and no memory of visited tours.",
    steps: [
      ["N ← best neighbour of N", "The best neighbour is taken even if it is more expensive than N."],
      ["track bestSeen", "The current tour may get worse, so remember the best tour met on the way."],
      ["N visited before → cycle", "The move is deterministic: once a tour repeats, the same sequence repeats for ever."],
    ],
    formulas: [
      { f: "cycle length = move now − move when this tour was first visited", read: "how many moves until the tour returns", why: "A deterministic rule applied to a state we already visited must reproduce the same path again." },
    ],
    why: "It shows why local search needs more than a greedy best-neighbour rule: tabu search adds a memory (forbidden moves) and simulated annealing adds randomness precisely to break this cycle.",
    traps: [
      "Reporting the final tour instead of the best tour seen.",
      "Thinking that moving uphill alone is enough to escape a local optimum: without memory or randomness it goes straight back.",
    ],
    props: { complete: "no", optimal: "no", time: "k scans of the neighbourhood", space: "O(n)" },
  },
  params: [
    { key: "start", label: "Start tour", type: "select", default: "trap", options: [["trap", "Hill-climbing local optimum of the Greedy tour"], ["greedy", "Greedy tour"], ["nn", "Nearest-neighbour tour"], ["random", "Random (uses seed)"]], allowText: true },
    { key: "moves", label: "Number of moves k", type: "int", default: 8, min: 1, max: 100 },
    Studio.tsp.mgParam("2-city"), Studio.seedParam(1),
  ],
  run(P, { start, moves, movegen, seed }) {
    const Tz = Studio.tsp, steps = [];
    let cur = start === "trap" ? Tz.hillClimb(P, Tz.startTour(P, "greedy"), movegen).pop().tour : Tz.startTour(P, start, seed);
    let best = cur;
    const key = t => Tz.canon(t).join(","), seen = new Map([[key(cur), 0]]);
    const rows = [], states = [], walk = [{ x: 0, y: P.cost(cur), best: P.cost(best) }], costs = [P.cost(cur)];
    let cycleStart = null, cycleLength = null;
    const snap = (cap, extra = {}) => steps.push(Object.assign({ caption: cap, nodes: Studio.tspSteps.nodes(P), edges: Studio.tspSteps.edges(P, cur),
      table: { title: "moves so far", columns: ["move", "step", "tour", "cost", "seen before"], rows: rows.slice(), rowStates: states.slice() },
      chart: { kind: "walk", series: walk.slice(), yLabel: "current cost" },
      stats: [{ label: "current", value: P.cost(cur) }, { label: "bestSeen", value: P.cost(best), state: "ok" }] }, extra));
    snap(`Start ${cur.join(",")} = ${P.cost(cur)}. Always take the best neighbour for ${moves} moves, uphill or not`);
    for (let i = 1; i <= moves; i++) {
      const nb = Tz.moveGens[movegen].fn(P, cur), b = Tz.best(nb);
      if (!b) break;
      const was = P.cost(cur), worse = b.cost > was;
      cur = b.tour; costs.push(b.cost);
      if (b.cost < P.cost(best)) best = cur;
      const k = key(cur), again = seen.get(k);
      if (again !== undefined && cycleStart === null) { cycleStart = again; cycleLength = i - again; }
      if (again === undefined) seen.set(k, i);
      rows.push([i, b.move, Tz.canon(cur, P.ids[0]).join(","), b.cost, again !== undefined ? `yes, move ${again}` : "no"]);
      states.push(again !== undefined ? "warn" : worse ? "bad" : "ok");
      walk.push({ x: i, y: b.cost, best: P.cost(best) });
      snap(`Move ${i}: best of ${nb.length} neighbours is ${b.move} = ${b.cost} (${worse ? `worse than ${was}, taken anyway` : b.cost < was ? `better than ${was}` : `equal to ${was}`})${again !== undefined ? `; this tour was already visited at move ${again}: a cycle of length ${i - again}, the same moves will repeat` : ""}`);
    }
    steps.push({ caption: cycleStart !== null ? `Finished ${moves} moves: cycle of length ${cycleLength} from move ${cycleStart}. bestSeen ${best.join(",")} = ${P.cost(best)}, the final tour costs ${P.cost(cur)}` : `Finished ${moves} moves without repeating a tour. bestSeen ${best.join(",")} = ${P.cost(best)}`,
      nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, best, { state: "path" }),
      table: { title: "moves", columns: ["move", "step", "tour", "cost", "seen before"], rows: rows.slice(), rowStates: states.slice() },
      chart: { kind: "walk", series: walk.slice(), yLabel: "current cost" },
      stats: [{ label: "bestSeen", value: P.cost(best), state: "ok" }, { label: "cycle length", value: cycleLength ?? "none", state: cycleStart !== null ? "bad" : "ok" }] });
    return { steps, result: { tour: best, cost: P.cost(best), costs, cycleStart, cycleLength, cycled: cycleStart !== null } };
  },
});
