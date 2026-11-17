/* Simulated annealing on SAT with the course's sigmoid acceptance rule and a cooling schedule. */
Studio.register({
  id: "sat-sa",
  name: "Simulated annealing",
  family: "SAT · stochastic",
  week: 4,
  problem: "sat",
  order: 100,
  defaultExample: "sat-four-var",
  summary: "Stochastic hill climbing whose temperature falls: pick a random bit flip, accept with P = 1/(1 + e^(−ΔE/T)), ΔE = h(new) − h(current), then cool. High T behaves like a random walk, T → 0 like hill climbing.",
  pseudocode: `N ← start;  bestSeen ← N;  T ← T0
repeat k times
    X ← N with a random bit flipped
    ΔE ← h(X) − h(N)                  # positive = improvement (we maximise h)
    P ← 1 / (1 + e^(−ΔE / T))
    if random u < P: N ← X
    if h(N) > h(bestSeen): bestSeen ← N
    T ← next temperature (geometric: α·T, or linear down to Tend)
return bestSeen`,
  complexity: "k neighbour samples",
  learn: {
    intro: "Simulated annealing borrows from metalworking: hot metal moves freely, then settles as it cools. The search accepts worse moves often while the temperature is high and becomes stricter as it cools, so it explores first and exploits later.",
    definition: "Pick a random one-flip neighbour X of N. Compute ΔE = h(X) − h(N) (positive means X satisfies more clauses) and move with probability P = 1/(1 + e^(−ΔE/T)). After every step lower T according to the cooling schedule. Return the best string seen.",
    steps: [
      ["X ← N with a random bit flipped", "Random, not best: annealing samples the neighbourhood."],
      ["ΔE ← h(X) − h(N)", "Positive = improvement because SAT maximises h."],
      ["P ← 1 / (1 + e^(−ΔE/T))", "The course's sigmoid acceptance rule."],
      ["if u < P: N ← X", "u is the random number shown in the trace."],
      ["T ← α·T", "Geometric cooling with α slightly below 1; a linear schedule is offered as well."],
    ],
    formulas: [
      { f: "P = 1 / (1 + e^(−ΔE/T))", read: "a sigmoid of ΔE scaled by temperature", why: "ΔE > 0 gives P > ½, ΔE < 0 gives P < ½; larger |ΔE|/T pushes P toward 1 or 0." },
      { f: "T → ∞: P → ½;   T → 0: P → 1 if ΔE > 0, 0 if ΔE < 0", read: "hot = coin flip, cold = hill climbing", why: "Temperature sets the balance between exploration and exploitation." },
      { f: "Tₖ = T₀ · αᵏ", read: "geometric cooling after k steps", why: "Slow cooling (α close to 1) leaves more time to escape local maxima." },
      { f: "Tₖ = T₀ − k · (T₀ − Tend)/steps", read: "linear cooling", why: "**Supplementary**: an alternative schedule, not in the course notes; it reaches Tend exactly at the last step." },
    ],
    why: "Accepting some worse moves lets the search leave a local maximum such as 1000 (h 5) and cooling makes it settle near a good string. With the sigmoid rule even an improving move can be rejected, so always keep bestSeen. Compare with the random walk, which ignores h: on sat-ten-var (10 variables, 3 solutions among 1024) 30 steps solve it for 51 of 100 seeds with annealing and 7 of 100 with the random walk; seed 2 shows it (annealing solves it, the walk reaches only h 46 of 48). Raise T0 a lot and annealing degrades towards the random walk, lower it and it behaves like hill climbing.",
    traps: [
      "ΔE sign: for SAT it is h(new) − h(current), the reverse of the TSP cost version.",
      "At finite T an improving move is still rejected with probability 1 − P.",
      "Return bestSeen: the current string may wander off the best one.",
      "Results depend on the seed; the same seed repeats the run exactly.",
    ],
    props: { complete: "no", optimal: "only with impractically slow cooling", time: "k samples", space: "O(n)" },
  },
  params: [Studio.satLib.startParam, { key: "T0", label: "Start temperature T0", type: "number", default: 2 },
    { key: "schedule", label: "Cooling schedule", type: "select", default: "geometric", options: [["geometric", "Geometric: T ← α·T"], ["linear", "Linear: down to Tend (supplementary)"]] },
    { key: "alpha", label: "Cooling factor α (geometric)", type: "number", default: 0.9 }, { key: "Tend", label: "Final temperature Tend (linear)", type: "number", default: 0.1 },
    { key: "steps", label: "Steps k", type: "int", default: 30, min: 1, max: 400 },
    { key: "stop", label: "Stop when solved", type: "select", default: "no", options: [["no", "No: sample all k times"], ["yes", "Yes: stop at a solution"]] }, Studio.seedParam(1)],
  run(P, { start, T0, schedule, alpha, Tend, steps: k, stop, seed }) {
    const L = Studio.satLib, rng = Studio.rng(seed), steps = [];
    if (!(T0 > 0)) throw new Error("Start temperature T0 must be positive");
    let cur = L.startBits(P, start), best = cur, T = T0, accepted = 0;
    const sig = (dE, t) => 1 / (1 + Math.exp(-dE / t)), r3 = x => Math.round(x * 1000) / 1000, rT = x => Math.round(x * 1000) / 1000;
    const cool = i => (schedule === "linear" ? Math.max(1e-9, T0 - (i * (T0 - Tend)) / k) : T * alpha);
    const rows = [], states = [], series = [{ x: 0, y: P.h(cur), best: P.h(best), T }];
    const frag = (cap, extra) => Object.assign({ caption: cap, table: { columns: ["k", "T", "cur", "flip", "next", "ΔE", "P", "u", ""], rows: rows.slice(-14), rowStates: states.slice(-14) },
      chart: { kind: "walk", series: series.slice(), yLabel: "current h", showT: true }, stats: L.stats(P, cur, [{ label: "T", value: rT(T) }, { label: "bestSeen h", value: P.h(best), state: "ok" }]) }, extra);
    steps.push(frag(`Start at ${cur} (h ${P.h(cur)} of ${P.m}), T0 = ${T0}, ${schedule === "linear" ? `linear cooling to ${Tend}` : `geometric cooling α = ${alpha}`}.`, L.drawBits(P, cur)));
    for (let i = 1; i <= k; i++) {
      if (stop === "yes" && P.solved(cur)) break;
      const b = rng.int(P.n), nxt = P.flip(cur, b), dE = P.h(nxt) - P.h(cur), pr = sig(dE, T), u = rng.r3(), acc = u < pr;
      const verdict = acc ? (dE < 0 ? "accept (worse)" : "accept") : (dE > 0 ? "reject (better!)" : "reject");
      rows.push([i, rT(T), cur, P.vars[b], nxt, dE, r3(pr), u, verdict]); states.push(acc ? (dE < 0 ? "warn" : "ok") : (dE > 0 ? "warn" : "bad"));
      const from = cur, Tused = T; if (acc) { cur = nxt; accepted++; if (P.h(cur) > P.h(best)) best = cur; }
      series.push({ x: i, y: P.h(cur), best: P.h(best), T: Tused, proposal: P.h(nxt), accepted: acc });
      steps.push(frag(`k = ${i}, T = ${rT(Tused)}: flip ${P.vars[b]} proposes ${nxt} (h ${P.h(nxt)}), ΔE = ${P.h(nxt)} − ${P.h(from)} = ${dE}, P = ${r3(pr)}, u = ${u} → ${verdict}${acc ? "" : `; stay at ${cur}`}.`, L.drawBits(P, cur, { flipped: acc ? [b] : [] })));
      T = cool(i);
    }
    steps.push(frag(`bestSeen ${best} with h = ${P.h(best)} of ${P.m}${P.solved(best) ? " (a solution)" : ""}; ${accepted} of ${rows.length} proposals accepted, final T = ${rT(T)}.`, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved: P.solved(best), accepted, last: cur, visited: rows.map(r => r[4]) } };
  },
});
