/* Best-neighbour walk for a fixed number of moves: always move, even downhill. Shows cycling. */
Studio.register({
  id: "sat-best-neighbour",
  name: "Best neighbour, fixed moves",
  family: "SAT · local search",
  week: 3,
  problem: "sat",
  order: 50,
  summary: "Always move to the best one-flip neighbour, even if it is no better than the current string, for a fixed number of moves. With no memory it can walk in circles, which is the problem tabu search fixes.",
  pseudocode: `N ← start;  bestSeen ← N
repeat for a fixed number of moves
    B ← the N1 neighbour with the largest h (ties: lowest bit)
    N ← B                                   # even if h(B) ≤ h(N)
    if h(N) > h(bestSeen): bestSeen ← N
return bestSeen`,
  complexity: "moves × n neighbour evaluations",
  learn: {
    intro: "Hill climbing quits when no neighbour is better. A simple escape is to keep moving anyway: take the best neighbour even if it is worse or equal, for a fixed number of moves, and remember the best string seen. The trouble is that the best neighbour of a state is often the state we just left.",
    definition: "At each of the k moves, evaluate the N1 neighbours of the current string, move to the one with the highest h (ties to the lowest bit) regardless of whether h improves, and update the best string seen. Return the best string seen.",
    steps: [
      ["B ← best N1 neighbour", "The same choice as hill climbing."],
      ["N ← B even if not better", "This is what lets the walk leave a local maximum."],
      ["update bestSeen", "The walk may go down, so the final string is not necessarily the best."],
      ["stop after the fixed number of moves", "Or earlier when a solution is reached, if asked."],
    ],
    formulas: [
      { f: "N′ = argmax over N1(N) of h", read: "the best neighbour, uphill or not", why: "Flipping a variable back and forth keeps being the best choice, so the walk can cycle: x → y → x → y …" },
    ],
    why: "It shows why memory is needed. From the solution 1101 on the course example the best neighbour is 0101 (h 5) and from there the best neighbour is 1101 again: a cycle of length 2. Tabu search forbids the move back for a few iterations to break such cycles.",
    traps: [
      "The last string is not the answer; the best string seen is.",
      "A revisited string means a cycle: from then on the walk repeats forever.",
      "With a solution reached the walk would normally stop; turn the stop off to watch the cycling.",
    ],
    props: { complete: "no", optimal: "no", time: "moves × n × m", space: "O(n)" },
  },
  params: [Studio.satLib.startParam, { key: "moves", label: "Number of moves", type: "int", default: 8, min: 1, max: 60 },
    { key: "stop", label: "Stop when solved", type: "select", default: "no", options: [["no", "No: keep walking (shows cycling)"], ["yes", "Yes: stop at a solution"]] }],
  run(P, { start, moves, stop }) {
    const L = Studio.satLib, steps = [], first = new Map();
    let cur = L.startBits(P, start), best = cur, cycleAt = null; first.set(cur, 0);
    const rows = [[0, "start", cur, P.h(cur), P.h(best), ""]], states = [""];
    const tbl = () => ({ title: `${moves} moves`, columns: ["move", "flip", "string", "h", "best h", "note"], rows: rows.map(r => r.slice()), rowStates: states.map((s, i) => (i === states.length - 1 ? s || "cur" : s)) });
    steps.push(Object.assign({ caption: `Start at ${cur} (h ${P.h(cur)} of ${P.m}). We will make ${moves} moves, each to the best N1 neighbour whether or not it is an improvement.`, table: tbl(), stats: L.stats(P, cur) }, L.drawBits(P, cur)));
    for (let t = 1; t <= moves; t++) {
      if (stop === "yes" && P.solved(cur)) break;
      const nb = P.nbrs(cur, 1), b = L.best(nb), h0 = P.h(cur), tag = b.h > h0 ? "uphill" : b.h === h0 ? "sideways" : "downhill";
      const again = first.has(b.bits); if (again && cycleAt === null) cycleAt = t;
      const note = again ? `seen at move ${first.get(b.bits)}: cycle` : tag;
      if (!again) first.set(b.bits, t);
      const prevBest = best; if (b.h > P.h(best)) best = b.bits;
      rows.push([t, b.move, b.bits, b.h, P.h(best), note]); states.push(again ? "warn" : b.h > P.h(prevBest) ? "ok" : b.h < h0 ? "bad" : "");
      steps.push(Object.assign({ caption: `Move ${t}: the best neighbour of ${cur} is ${b.bits} (flip ${b.move}, h ${b.h}). That is a ${tag} move (current h ${h0}), taken anyway.${again ? ` ${b.bits} was already visited at move ${first.get(b.bits)}, so the walk is cycling.` : ""}`,
        table: tbl(), stats: L.stats(P, b.bits, [{ label: "bestSeen h", value: P.h(best), state: "ok" }, { label: "move", value: t }]) }, L.drawNeighbourhood(P, cur, nb, { chosen: b.bits })));
      cur = b.bits;
    }
    steps.push(Object.assign({ caption: `Best string seen: ${best} with h = ${P.h(best)} of ${P.m}${P.solved(best) ? " (a solution)" : ""}.${cycleAt !== null ? ` The walk started repeating itself at move ${cycleAt}.` : " No string was visited twice."}`,
      table: Object.assign(tbl(), { rowStates: states.slice() }), stats: L.stats(P, best, [{ label: "cycled", value: cycleAt === null ? "no" : "at move " + cycleAt, state: cycleAt === null ? "" : "warn" }]) }, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved: P.solved(best), last: cur, cycled: cycleAt !== null, cycleAt, visited: rows.map(r => r[2]) } };
  },
});
