/* Iterated hill climbing on SAT: N1 hill climbing from several starts (given or seeded random), keep the best. */
Studio.register({
  id: "sat-ihc",
  name: "Iterated hill climbing",
  family: "SAT · stochastic",
  week: 4,
  problem: "sat",
  order: 70,
  summary: "Hill climbing gets stuck on plateaus and local maxima, so restart it from several different assignments and keep the best result. Starts can be typed in or drawn from a seeded random generator.",
  pseudocode: `best ← none
for each start S (given, or r random bit strings)
    N ← HillClimbing_N1(S)
    if h(N) > h(best): best ← N
    if h(best) = m: stop (solved)
return best`,
  complexity: "r runs of hill climbing, each at most m improving moves of n evaluations",
  learn: {
    intro: "One hill climb ends at the first local maximum it meets, and which one it meets depends on where it started. Iterated hill climbing runs the same N1 hill climb from several starting assignments and keeps the best. It is the simplest way of adding randomness to local search.",
    definition: "Choose r starting bit strings (random, or listed explicitly). From each run strict N1 hill climbing (best one-flip neighbour, ties to the lowest bit, move only if h strictly increases). Remember the string with the largest h. Stop early if some run reaches h = m.",
    steps: [
      ["for each start S", "Starts come from the 'starts' parameter if it is filled in, otherwise from the seeded random generator, so a run can be repeated exactly."],
      ["N ← HillClimbing_N1(S)", "Exactly the deterministic hill climbing of week 3, run to its end."],
      ["if h(N) > h(best): best ← N", "Only strictly better results replace the best; ties keep the earlier one."],
      ["stop when h = m", "A solution cannot be improved, so further restarts are pointless."],
    ],
    formulas: [
      { f: "P(at least one start reaches the solution) = 1 − (1 − q)^r", read: "q = fraction of starts whose hill climb ends at the solution", why: "Starts are independent, so all r fail with probability (1 − q)^r. **Supplementary** (not in the course notes)." },
    ],
    why: "On the four-variable course example hill climbing from 0000 stops at 1000 (h 5). Among five starts only 0101 climbs on to 1101 (h 6). More starts means more chances, but each start is a fresh gamble: nothing learned in one run is used in the next.",
    traps: [
      "Restarts are independent: iterated hill climbing does not remember where earlier runs failed.",
      "Two different starts can end in the same local maximum, so r starts do not give r different answers.",
      "Failing on all r starts does not prove the formula unsatisfiable.",
    ],
    props: { complete: "no", optimal: "no", time: "r hill climbs", space: "O(n)" },
  },
  params: [
    { key: "starts", label: "Starts (bit strings, comma separated)", type: "text", default: P => (P.n === 4 ? "0000,1011,0101,1110,0010" : ""), help: "Type random (or any non-bit text) to draw random starts from the seed. Course example: five starts of which only 0101 reaches 1101." },
    { key: "restarts", label: "Random starts r (when starts is random)", type: "int", default: 5, min: 1, max: 40 },
    { key: "stop", label: "Stop when solved", type: "select", default: "no", options: [["no", "No: try every start"], ["yes", "Yes: stop at the first solution"]] },
    Studio.seedParam(7),
  ],
  run(P, { starts, restarts, stop, seed }) {
    const L = Studio.satLib, rng = Studio.rng(seed), steps = [], rows = [], states = [], series = [];
    let list = String(starts || "").split(/[\s,;]+/).filter(s => /^[01]+$/.test(s) && s.length === P.n);
    const given = list.length > 0;
    if (!given) list = Array.from({ length: restarts }, () => Array.from({ length: P.n }, () => (rng() < 0.5 ? "1" : "0")).join(""));
    const climb = s => { const path = [s]; let cur = s; while (!P.solved(cur)) { const b = L.best(P.nbrs(cur, 1)); if (b.h > P.h(cur)) { cur = b.bits; path.push(cur); } else break; } return path; };
    let best = null; const runs = [];
    const tbl = () => ({ title: "restarts", columns: ["#", "start", "h", "climbs to", "h", "path"], rows: rows.map(r => r.slice()), rowStates: states.slice() });
    steps.push(Object.assign({ caption: `${list.length} start${list.length === 1 ? "" : "s"} ${given ? "given" : `drawn at random (seed ${seed})`}: ${list.join(", ")}. Each one is hill-climbed (N1, strict improvement) and the best result is kept.`, stats: [{ label: "starts", value: list.length }] }, L.drawBits(P, list[0])));
    for (let k = 0; k < list.length; k++) {
      const path = climb(list[k]), lo = path[path.length - 1], nb = !best || P.h(lo) > P.h(best);
      if (nb) best = lo;
      runs.push({ start: list[k], end: lo, path });
      rows.push([k + 1, list[k], P.h(list[k]), lo, P.h(lo), path.join(" → ")]); states.push(P.solved(lo) ? "ok" : nb ? "cur" : "");
      series.push({ x: k + 1, from: P.h(list[k]), to: P.h(lo) });
      steps.push(Object.assign({ caption: `Start ${k + 1} = ${list[k]} (h ${P.h(list[k])}): hill climbing ${path.length > 1 ? `follows ${path.join(" → ")}` : "cannot improve at all"} and stops at ${lo} with h = ${P.h(lo)}${P.solved(lo) ? ", a solution" : ""}. ${nb ? "This is the best so far." : `Not better than the best (${best}, h ${P.h(best)}).`}`,
        table: tbl(), chart: { kind: "drops", series: series.slice(), yLabel: "h (clauses satisfied)" }, stats: L.stats(P, lo, [{ label: "best h", value: P.h(best), state: "ok" }]) }, L.drawBits(P, lo, { state: P.solved(lo) ? "goal" : undefined })));
      if (stop === "yes" && P.solved(lo) && k < list.length - 1) { steps.push(Object.assign({ caption: `${lo} satisfies all clauses, so the remaining ${list.length - k - 1} start${list.length - k - 1 === 1 ? "" : "s"} are not needed.`, table: tbl(), stats: L.stats(P, lo) }, L.drawBits(P, lo, { state: "goal" }))); break; }
    }
    const reached = runs.filter(r => P.solved(r.end)).map(r => r.start);
    steps.push(Object.assign({ caption: `Best result ${best} with h = ${P.h(best)} of ${P.m}${P.solved(best) ? "" : " (no start reached a solution)"}. ${reached.length ? `Starts that reach a solution: ${reached.join(", ")}.` : ""}`,
      table: tbl(), chart: { kind: "drops", series, yLabel: "h (clauses satisfied)" }, stats: L.stats(P, best, [{ label: "solved", value: P.solved(best) ? "yes" : "no", state: P.solved(best) ? "ok" : "bad" }]) }, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved: P.solved(best), starts: list, ends: runs.map(r => r.end), reaching: reached } };
  },
});
