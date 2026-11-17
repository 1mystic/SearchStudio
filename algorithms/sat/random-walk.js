/* Random walk on SAT: flip a randomly chosen bit every step, accept always. */
Studio.register({
  id: "sat-random-walk",
  name: "Random walk",
  family: "SAT · stochastic",
  week: 3,
  problem: "sat",
  order: 80,
  summary: "At every step flip one randomly chosen variable and accept the result whatever its h. Remember the best string seen. It never gets stuck, but it does not use h to steer either.",
  pseudocode: `N ← start;  bestSeen ← N
repeat k times
    i ← random bit index
    N ← N with bit i flipped            # always accepted
    if h(N) > h(bestSeen): bestSeen ← N
return bestSeen`,
  complexity: "k steps, one h evaluation each",
  learn: {
    intro: "Hill climbing is trapped by local maxima; the opposite extreme is a walk that ignores h entirely. A random walk picks a neighbour uniformly at random and always moves there. It explores everything eventually, but only by luck does it hit a solution.",
    definition: "From the current string choose one of the n one-flip neighbours uniformly at random (using the seeded generator) and move to it. Keep a record of the best string met on the way.",
    steps: [
      ["i ← random bit index", "Uniform over the n variables; the same seed always gives the same walk."],
      ["N ← flip(N, i)", "Accepted unconditionally, uphill, sideways or downhill."],
      ["track bestSeen", "The walk itself may leave a good string at once, so the best one seen is what we return."],
    ],
    formulas: [
      { f: "P(pick bit i) = 1/n", read: "every neighbour equally likely", why: "That is what 'uniformly at random' means; h plays no part in the choice." },
    ],
    why: "It is the baseline against which the other stochastic methods are judged: stochastic hill climbing and simulated annealing keep the randomness but let h bias the acceptance.",
    traps: [
      "Different seeds give different walks; compare methods over several seeds.",
      "It may step straight off a solution; return bestSeen, not the last string.",
      "It can revisit the same strings: the walk has no memory (tabu search adds one).",
    ],
    props: { complete: "no", optimal: "no", time: "k steps", space: "O(n)" },
  },
  params: [Studio.satLib.startParam, { key: "steps", label: "Steps k", type: "int", default: 10, min: 1, max: 300 },
    { key: "stop", label: "Stop when solved", type: "select", default: "no", options: [["no", "No: walk all k steps"], ["yes", "Yes: stop at a solution"]] }, Studio.seedParam(3)],
  run(P, { start, steps: k, stop, seed }) {
    const L = Studio.satLib, rng = Studio.rng(seed), steps = [];
    let cur = L.startBits(P, start), best = cur;
    const rows = [[0, "start", cur, P.h(cur), P.h(best)]], states = [""], series = [{ x: 0, y: P.h(cur), best: P.h(best) }];
    const tbl = () => ({ title: "the walk", columns: ["step", "flip", "string", "h", "best h"], rows: rows.slice(-14).map(r => r.slice()), rowStates: states.slice(-14).map((s, i, a) => (i === a.length - 1 ? s || "cur" : s)) });
    const chart = () => ({ kind: "walk", series: series.slice(), yLabel: "h (clauses satisfied)" });
    steps.push(Object.assign({ caption: `Start at ${cur} (h ${P.h(cur)} of ${P.m}). Each step flips one random bit and always accepts it.`, table: tbl(), chart: chart(), stats: L.stats(P, cur) }, L.drawBits(P, cur)));
    for (let t = 1; t <= k; t++) {
      if (stop === "yes" && P.solved(cur)) break;
      const i = rng.int(P.n), nxt = P.flip(cur, i), h0 = P.h(cur), h1 = P.h(nxt), tag = h1 > h0 ? "uphill" : h1 === h0 ? "sideways" : "downhill";
      const nbest = h1 > P.h(best); if (nbest) best = nxt;
      rows.push([t, P.vars[i], nxt, h1, P.h(best)]); states.push(nbest ? "ok" : h1 < h0 ? "bad" : "");
      series.push({ x: t, y: h1, best: P.h(best) });
      steps.push(Object.assign({ caption: `Step ${t}: random bit ${P.vars[i]} chosen, ${cur} → ${nxt}: h ${h0} → ${h1} (${tag}), accepted regardless.${nbest ? " New best seen." : ""}`, table: tbl(), chart: chart(), stats: L.stats(P, nxt, [{ label: "bestSeen h", value: P.h(best), state: "ok" }]) }, L.drawBits(P, nxt, { flipped: [i] })));
      cur = nxt;
    }
    steps.push(Object.assign({ caption: `Best string seen: ${best}, h = ${P.h(best)} of ${P.m}${P.solved(best) ? " (a solution)" : ""}. The walk ended at ${cur}.`, table: tbl(), chart: chart(), stats: L.stats(P, best, [{ label: "last", value: cur }]) }, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved: P.solved(best), last: cur, visited: rows.map(r => r[2]) } };
  },
});
