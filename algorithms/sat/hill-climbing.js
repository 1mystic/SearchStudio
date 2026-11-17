/* Hill climbing on SAT with the N1 (one-bit-flip) neighbourhood, strict improvement only. */
Studio.register({
  id: "sat-hill-climbing",
  name: "Hill climbing (N1)",
  family: "SAT · local search",
  week: 3,
  problem: "sat",
  order: 20,
  defaultExample: "sat-four-var",
  summary: "From a start assignment move to the best one-flip neighbour, but only if it satisfies strictly more clauses. It stops at a local maximum or a plateau, which may be below the solution.",
  pseudocode: `N ← start
loop
    if h(N) = m: return N                      # solved
    nbrs ← all strings obtained by flipping one bit of N     # N1
    B ← the neighbour with the largest h (ties: lowest bit)
    if h(B) > h(N): N ← B
    else: return N                             # local maximum or plateau`,
  complexity: "Each iteration evaluates n neighbours of m clauses; at most m improving moves",
  learn: {
    intro: "Local search treats the assignments as states and a flip of one variable as a move. The heuristic h counts satisfied clauses, so a solution is a state with h = m. Hill climbing walks uphill on h and never accepts a step that does not strictly improve it.",
    definition: "The neighbourhood N1 of a bit string is the n strings that differ from it in exactly one bit. Pick the neighbour with the highest h (ties go to the lowest bit, i.e. the alphabetically first variable). Move only if its h is strictly greater than the current h; otherwise stop.",
    steps: [
      ["N ← start", "A bit string, one bit per variable."],
      ["if h(N) = m: return N", "Goal test: all clauses are satisfied."],
      ["nbrs ← flip one bit of N", "The N1 neighbourhood has exactly n members."],
      ["B ← best neighbour", "Ties broken by the lowest bit index: flipping a is tried before b, and so on."],
      ["if h(B) > h(N): N ← B else stop", "Strict improvement. A neighbour with equal h is a sideways move that hill climbing refuses, so it stops on a plateau."],
    ],
    formulas: [
      { f: "|N1| = C(n,1) = n", read: "n neighbours per state", why: "Each iteration costs n evaluations of h." },
      { f: "move iff h(B) > h(N)", read: "strictly better only", why: "This rule is what makes the method stop on plateaus; tabu search and simulated annealing relax it." },
    ],
    why: "It is cheap and often gets close, but a state whose neighbours are all no better is a trap even when h < m. On the course example it climbs 0000 (h 4) → 1000 (h 5) and stops, although 1101 (h 6) is a solution two flips away.",
    traps: [
      "Stopping with h < m does not mean the formula is unsatisfiable, only that this start is stuck.",
      "Equal h is not an improvement: a plateau stops strict hill climbing.",
      "Ties between equally good neighbours go to the lowest bit; a different rule can give a different path.",
      "Two different traps: on a plateau some neighbour has equal h, at a strict local maximum every neighbour is worse. The captions say which one. Course example sat-four-var stops on a plateau (1000: three neighbours with h 5); the example 'Local-maximum trap' (sat-local-trap) stops at 0100, where all four neighbours have h 6.",
    ],
    props: { complete: "no", optimal: "no", time: "O(n · m) per move", space: "O(n)" },
  },
  params: [Studio.satLib.startParam],
  run(P, { start }) {
    const L = Studio.satLib, steps = [];
    let cur = L.startBits(P, start), kind = ""; const path = [cur], rows = [];
    steps.push(Object.assign({ caption: `Start at ${cur}: ${P.h(cur)} of ${P.m} clauses are satisfied.${P.solved(cur) ? " That is already a solution." : ` False clauses: ${L.unsatText(P, cur)}.`}`,
      table: L.clauseTable(P, cur), stats: L.stats(P, cur) }, L.drawBits(P, cur)));
    for (let it = 1; it <= 200 && !P.solved(cur); it++) {
      const nb = P.nbrs(cur, 1), b = L.best(nb), h0 = P.h(cur), hs = nb.map(x => x.h).join(", ");
      if (b.h > h0) {
        steps.push(Object.assign({ caption: `Iteration ${it}: the ${nb.length} neighbours of ${cur} have h = ${hs}. The best is ${b.bits} (flip ${b.move}, h ${b.h}) and ${b.h} > ${h0}, so move there${nb.filter(x => x.h === b.h).length > 1 ? " (tie: lowest bit)" : ""}.`,
          table: L.nbrTable(P, nb, cur, b.bits), stats: L.stats(P, cur, [{ label: "iteration", value: it }]) }, L.drawNeighbourhood(P, cur, nb, { chosen: b.bits })));
        rows.push([it, cur, b.move, b.bits, b.h]); cur = b.bits; path.push(cur);
      } else {
        const plateau = nb.some(x => x.h === h0); kind = plateau ? "plateau" : "local maximum";
        steps.push(Object.assign({ caption: `Iteration ${it}: the ${nb.length} neighbours of ${cur} have h = ${hs}. The best (${b.bits}, h ${b.h}) is not better than ${h0}, so hill climbing stops: ${plateau ? "a plateau (equal neighbours exist but a sideways move is not an improvement)" : "a local maximum (every neighbour is worse)"}.`,
          table: L.nbrTable(P, nb, cur, null), stats: L.stats(P, cur, [{ label: "iteration", value: it }]) }, L.drawNeighbourhood(P, cur, nb, {})));
        break;
      }
    }
    const solved = P.solved(cur);
    steps.push(Object.assign({ caption: solved ? `${cur} satisfies all ${P.m} clauses: solved after ${path.length - 1} move${path.length === 2 ? "" : "s"} (${path.join(" → ")}).` : `Stopped at ${cur} with h = ${P.h(cur)} < ${P.m} after ${path.length - 1} move${path.length === 2 ? "" : "s"} (${path.join(" → ")}), on ${kind === "plateau" ? "a plateau" : "a local maximum"}. Unsatisfied: ${L.unsatText(P, cur)}. This is a failure of the method, not a proof that the formula is unsatisfiable.`,
      table: L.clauseTable(P, cur), stats: L.stats(P, cur, [{ label: "result", value: solved ? "solved" : "stuck", state: solved ? "ok" : "bad" }]) }, L.drawBits(P, cur, { state: solved ? "goal" : "path" })));
    return { steps, result: { bits: cur, h: P.h(cur), solved, path, moves: path.length - 1, stuckOn: solved ? null : kind } };
  },
});
