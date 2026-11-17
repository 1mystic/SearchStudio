/* Stochastic hill climbing on SAT at a fixed temperature: sigmoid acceptance of a random neighbour. */
Studio.register({
  id: "sat-stochastic-hc",
  name: "Stochastic hill climbing (fixed T)",
  family: "SAT · stochastic",
  week: 4,
  problem: "sat",
  order: 90,
  summary: "Pick a random one-flip neighbour and move to it with probability P = 1/(1 + e^(−ΔE/T)), ΔE = h(new) − h(current), at a constant temperature T. Better moves are likely, worse moves are possible.",
  pseudocode: `N ← start;  bestSeen ← N
repeat k times
    X ← random neighbour of N (flip a random bit)
    ΔE ← h(X) − h(N)                  # positive = improvement (we maximise h)
    P ← 1 / (1 + e^(−ΔE / T))
    if random u < P: N ← X
    if h(N) > h(bestSeen): bestSeen ← N
return bestSeen`,
  complexity: "k neighbour samples",
  learn: {
    intro: "Stochastic hill climbing keeps the idea of preferring uphill moves but replaces the hard rule 'only if better' by a probability. A better neighbour is accepted with probability above one half, a worse one with probability below one half, and the temperature T decides how sharp that preference is. T stays fixed; simulated annealing is the version that lowers it.",
    definition: "Choose a random neighbour X of N. Let ΔE = h(X) − h(N); for SAT we maximise h, so ΔE > 0 is an improvement. Accept X with probability P = 1/(1 + e^(−ΔE/T)); draw u uniformly in [0, 1) and move if u < P.",
    steps: [
      ["X ← random neighbour of N", "Flip one randomly chosen bit (seeded generator)."],
      ["ΔE ← h(X) − h(N)", "Positive ΔE means more clauses satisfied. Note the sign: the TSP version uses cost(N) − cost(X) because it minimises."],
      ["P ← 1 / (1 + e^(−ΔE/T))", "The course's sigmoid acceptance rule."],
      ["if u < P: N ← X", "u is the random number shown in the trace."],
    ],
    formulas: [
      { f: "P = 1 / (1 + e^(−ΔE/T))", read: "a sigmoid in ΔE/T", why: "ΔE = 0 gives exactly ½; ΔE > 0 gives more than ½ and ΔE < 0 less than ½, approaching 1 and 0 as |ΔE|/T grows." },
      { f: "T → 0: hill climbing;   T → ∞: random walk", read: "the two extremes", why: "Small T makes the sigmoid a step at ΔE = 0 (only improving moves); large T flattens it to ½ (a coin flip, i.e. random walk)." },
    ],
    why: "A worse neighbour can still be accepted, so the search can walk down off a local maximum such as 1000 (h 5) towards 1101 (h 6). Because T never falls, it keeps wandering even after it has found a good string, which is why we report bestSeen.",
    traps: [
      "With the sigmoid rule even an improving move can be rejected (P < 1 at finite T).",
      "ΔE is h(new) − h(current) here: do not copy the TSP sign.",
      "Fixed T is a compromise: too hot is a random walk, too cold is hill climbing. Annealing varies it.",
    ],
    props: { complete: "no", optimal: "no", time: "k samples", space: "O(n)" },
  },
  params: [Studio.satLib.startParam, { key: "T", label: "Temperature T (fixed)", type: "number", default: 1 },
    { key: "steps", label: "Steps k", type: "int", default: 15, min: 1, max: 300 },
    { key: "tableT", label: "Temperatures in the sigmoid table", type: "text", default: "0.5,1,2,5", help: "comma-separated; the chart draws the first three" },
    { key: "stop", label: "Stop when solved", type: "select", default: "no", options: [["no", "No: sample all k times"], ["yes", "Yes: stop at a solution"]] }, Studio.seedParam(5)],
  run(P, { start, T, steps: k, tableT, stop, seed }) {
    const L = Studio.satLib, rng = Studio.rng(seed), steps = [];
    if (!(T > 0)) throw new Error("Temperature T must be positive");
    let cur = L.startBits(P, start), best = cur, accepted = 0;
    const sig = (dE, t) => 1 / (1 + Math.exp(-dE / t)), r3 = x => Math.round(x * 1000) / 1000;
    const Ts = String(tableT).split(/[\s,;]+/).map(Number).filter(x => x > 0).slice(0, 6); if (!Ts.length) Ts.push(T);
    const dEs = [-4, -3, -2, -1, 0, 1, 2, 3, 4], grid = []; for (let d = -4; d <= 4; d += 0.5) grid.push(d);
    const sg = grid.map(d => { const p = { x: d, y: Math.round(sig(d, Ts[0]) * 100) }; if (Ts[1]) p.best = Math.round(sig(d, Ts[1]) * 100); if (Ts[2]) p.avg = Math.round(sig(d, Ts[2]) * 100); return p; });
    steps.push(Object.assign({ caption: `The acceptance rule P = 1/(1 + e^(−ΔE/T)) for T = ${Ts.join(", ")}. ΔE = 0 gives P = 0.5 at every T; small T makes the curve steep (almost hill climbing), large T flattens it towards a coin flip. The search below uses T = ${T}.`,
      table: { title: "P(accept) by ΔE and T", columns: ["ΔE"].concat(Ts.map(t => "T=" + t)), rows: dEs.map(d => [d].concat(Ts.map(t => r3(sig(d, t))))), rowStates: dEs.map(d => (d === 0 ? "cur" : "")) },
      chart: { kind: "walk", series: sg, yLabel: `P(accept) % vs ΔE; lines T=${Ts.slice(0, 3).join(", ")}` }, stats: [{ label: "P at ΔE=0", value: 0.5, state: "ok" }, { label: "T", value: T }] }, L.drawBits(P, cur)));
    const rows = [], states = [], walk = [{ x: 0, y: P.h(cur), best: P.h(best) }];
    const frag = (cap, extra) => Object.assign({ caption: cap, table: { columns: ["k", "cur", "flip", "next", "ΔE", "P", "u", ""], rows: rows.slice(-14), rowStates: states.slice(-14) },
      chart: { kind: "walk", series: walk.slice(), yLabel: "current h" }, stats: L.stats(P, cur, [{ label: "T", value: T }, { label: "bestSeen h", value: P.h(best), state: "ok" }]) }, extra);
    steps.push(frag(`Start at ${cur} (h ${P.h(cur)} of ${P.m}), fixed T = ${T}.`, L.drawBits(P, cur)));
    for (let i = 1; i <= k; i++) {
      if (stop === "yes" && P.solved(cur)) break;
      const b = rng.int(P.n), nxt = P.flip(cur, b), dE = P.h(nxt) - P.h(cur), pr = sig(dE, T), u = rng.r3(), acc = u < pr;
      const verdict = acc ? (dE < 0 ? "accept (worse)" : "accept") : (dE > 0 ? "reject (better!)" : "reject");
      rows.push([i, cur, P.vars[b], nxt, dE, r3(pr), u, verdict]); states.push(acc ? (dE < 0 ? "warn" : "ok") : (dE > 0 ? "warn" : "bad"));
      const from = cur; if (acc) { cur = nxt; accepted++; if (P.h(cur) > P.h(best)) best = cur; }
      walk.push({ x: i, y: P.h(cur), best: P.h(best), proposal: P.h(nxt), accepted: acc });
      steps.push(frag(`k = ${i}: random flip ${P.vars[b]} proposes ${nxt} (h ${P.h(nxt)}), ΔE = ${P.h(nxt)} − ${P.h(from)} = ${dE}, P = ${r3(pr)}, u = ${u} → ${verdict}${acc ? "" : `; stay at ${cur}`}.`, L.drawBits(P, cur, { flipped: acc ? [b] : [] })));
    }
    steps.push(frag(`bestSeen ${best} with h = ${P.h(best)} of ${P.m}${P.solved(best) ? " (a solution)" : ""}; ${accepted} of ${rows.length} proposals accepted at T = ${T}.`, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved: P.solved(best), accepted, last: cur, visited: rows.map(r => r[3]) } };
  },
});
