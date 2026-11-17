/* Tabu search on SAT: best non-tabu one-flip move, tenure, aspiration, optional frequency penalty. */
Studio.register({
  id: "sat-tabu",
  name: "Tabu search",
  family: "SAT · local search",
  week: 3,
  problem: "sat",
  order: 60,
  defaultExample: "sat-local-trap",
  summary: "Always flip the best variable that is not tabu, even if that makes h worse. A variable just flipped is tabu for the next tt iterations; aspiration lets a tabu flip through if it beats the best h seen; an optional frequency penalty discourages variables flipped too often.",
  pseudocode: `N ← start;  bestSeen ← N
for t = 1, 2, …
    if h(N) = m: stop
    rank the one-bit flips i by  score(i) = h(flip(N,i)) − λ · freq(i)    (ties: lowest bit)
    take the first flip that is not tabu,
         or is tabu but gives h > h(bestSeen)             # aspiration
    N ← flip(N,i);  tabu(i) ← t + tt;  freq(i) ← freq(i) + 1
    if h(N) > h(bestSeen): bestSeen ← N
return bestSeen`,
  complexity: "iterations × n evaluations; memory O(n)",
  learn: {
    intro: "Best-neighbour walking cycles because the best move is often the one that undoes the last. Tabu search adds a short-term memory: a variable that has just been flipped may not be flipped again for a few iterations, which forces the walk onward, even through worse or equal states.",
    definition: "At every iteration choose the best flip that is not tabu and take it even if h gets worse. The flipped variable becomes tabu for the tenure tt iterations. A tabu flip is still allowed when it gives an h larger than the best seen (the aspiration criterion). Optionally a long-term frequency memory subtracts λ times the number of past flips of a variable from its score, steering the search towards variables rarely flipped.",
    steps: [
      ["N ← start; bestSeen ← N", ""],
      ["rank the flips by score", "Score is h of the neighbour; with λ > 0 subtract λ × (how often that variable has been flipped). Ties: lowest bit."],
      ["first flip that is not tabu, or tabu with h > bestSeen", "This is the aspiration criterion: forbidding a move that would set a new record only blocks progress."],
      ["N ← the flip; tabu(i) ← t + tt", "Variable i cannot be flipped again at iterations t+1 … t+tt."],
      ["update bestSeen; return it at the end", "The walk may leave a good string, so keep the best one."],
    ],
    formulas: [
      { f: "tabu(i) at iteration t ⇔ t ≤ tabuUntil(i),  tabuUntil(i) = t₀ + tt", read: "flipped at t₀, forbidden for the next tt iterations", why: "Too short a tenure lets the walk cycle; too long blocks good moves. On the course example tt = 2 is enough to get out." },
      { f: "allow a tabu flip if h(new) > h(bestSeen)", read: "aspiration criterion", why: "Tabu exists to stop cycling, never to block a new record." },
      { f: "score(i) = h(flip(N,i)) − λ · freq(i)", read: "frequency penalty (**supplementary**: the weight λ is a common implementation choice, not fixed by the course)", why: "Long-term memory of how often each variable has been flipped diversifies the search; λ = 0 switches it off." },
    ],
    why: "From 0000 on the course example: flip a (→ 1000, h 5); a is now tabu, and the best remaining flips tie at h 5, so b (the lowest bit) gives 1100, a sideways move; from 1100, a and b are tabu, and flipping d gives 1101, h 6, the unique solution. Hill climbing could never take the sideways move, and best-neighbour walking would have gone back to 0000. The tenure matters. On 'Local-maximum trap' (sat-local-trap) tenure 1 only forbids the immediate undo and the walk goes round 0000 → 0100 → 1100 → 1000 → 0000 and never finds a solution; tenure 2 breaks the loop and reaches 0111 in 5 flips. With tenure 4 and aspiration off every flip becomes tabu at 1111 and the search stops; with aspiration on, the tabu flip of a is allowed because 0111 (h 8) beats the best h seen (7).",
    traps: [
      "The tabu element is the variable (the move), not the whole string.",
      "Tabu takes the best allowed move even when h decreases; only bestSeen is monotone.",
      "Apply aspiration before rejecting a tabu flip.",
      "With tenure 2 a variable flipped at iteration 1 is still tabu at iterations 2 and 3 and free again at 4.",
      "Too short a tenure cycles (tenure 1 on sat-local-trap), too long a tenure freezes the search (tenure 4 with aspiration off stops when every flip is tabu). Aspiration is what rescues a record-breaking move from a long tenure.",
    ],
    props: { complete: "no", optimal: "no", time: "iterations × n × m", space: "O(n)" },
  },
  params: [Studio.satLib.startParam, { key: "tenure", label: "Tabu tenure tt", type: "int", default: 2, min: 1, max: 20 },
    { key: "iters", label: "Iterations", type: "int", default: 8, min: 1, max: 60 },
    { key: "aspiration", label: "Aspiration criterion", type: "select", default: "yes", options: [["yes", "On"], ["no", "Off"]] },
    { key: "lambda", label: "Frequency penalty λ", type: "number", default: 0, min: 0, max: 5, help: "0 = off" }],
  run(P, { start, tenure, iters, aspiration, lambda }) {
    const L = Studio.satLib, steps = [], freq = Array(P.n).fill(0), until = Array(P.n).fill(0), pen = Number(lambda) || 0;
    let cur = L.startBits(P, start), best = cur, revisits = 0, stopped = false;
    const rows = [[0, "start", cur, P.h(cur), "–", P.h(best)]], states = [""], first = new Map([[cur, 0]]);
    const tabuList = t => P.vars.map((v, i) => [v, until[i]]).filter(([, u]) => u >= t).map(([v, u]) => ({ text: `${v} until ${u}`, state: "open" }));
    const tbl = () => ({ title: `tenure ${tenure}${pen ? `, λ = ${pen}` : ""}`, columns: ["it", "flip", "string", "h", "tabu", "best h"], rows: rows.map(r => r.slice()), rowStates: states.map((s, i) => (i === states.length - 1 ? s || "cur" : s)) });
    steps.push(Object.assign({ caption: `Start at ${cur} (h ${P.h(cur)} of ${P.m}); nothing is tabu yet. Each iteration flips the best variable that is not tabu, even if h falls.`, table: tbl(), lists: [{ label: "TABU", items: [] }], stats: L.stats(P, cur) }, L.drawBits(P, cur)));
    for (let t = 1; t <= iters && !P.solved(cur); t++) {
      const nb = P.nbrs(cur, 1).map((x, i) => Object.assign(x, { i: x.flips[0], f: freq[x.flips[0]], score: x.h - pen * freq[x.flips[0]], idx: i, tabu: until[x.flips[0]] >= t }));
      const ranked = nb.slice().sort((a, b) => b.score - a.score || a.idx - b.idx);
      let chosen = null, asp = false; const skipped = [];
      for (const r of ranked) {
        if (r.tabu && aspiration === "yes" && r.h > P.h(best)) { chosen = r; asp = true; break; }
        if (r.tabu) { skipped.push(`${r.move} (h ${r.h})`); continue; }
        chosen = r; break;
      }
      if (!chosen) { steps.push(Object.assign({ caption: `Iteration ${t}: every flip is tabu and none beats bestSeen (h ${P.h(best)}), so the search stops.`, table: tbl(), lists: [{ label: "TABU", items: tabuList(t) }], stats: L.stats(P, cur) }, L.drawBits(P, cur))); stopped = true; break; }
      const h0 = P.h(cur), worse = chosen.h < h0, sideways = chosen.h === h0, prevBestH = P.h(best);
      const states0 = {}; nb.forEach(x => { if (x.tabu && x !== chosen) states0[x.bits] = "pruned"; });
      steps.push(Object.assign({
        caption: `Iteration ${t}: flip ${chosen.move} → ${chosen.bits} (h ${chosen.h}).${skipped.length ? ` Skipped tabu: ${skipped.join(", ")}.` : ""}${asp ? " It is tabu but h beats bestSeen, so aspiration allows it." : ""}${pen && chosen.f ? ` Score ${chosen.score.toFixed(2)} after penalising ${chosen.f} earlier flip${chosen.f > 1 ? "s" : ""}.` : ""}${worse ? " This is worse than the current string, taken anyway." : sideways ? " A sideways move (equal h)." : ""} ${P.vars[chosen.i]} is now tabu until iteration ${t + tenure}.`,
        table: L.nbrTable(P, nb, cur, chosen.bits, { cols: ["tabu", "freq", "score"], row: x => [x.tabu ? { t: "tabu", s: "warn" } : "", x.f, Number(x.score.toFixed(2))] }),
        lists: [{ label: "TABU", items: tabuList(t).concat(tabuList(t).some(z => z.text.startsWith(P.vars[chosen.i] + " ")) ? [] : [{ text: `${P.vars[chosen.i]} until ${t + tenure}`, state: "open" }]) }],
        stats: L.stats(P, cur, [{ label: "iteration", value: t }, { label: "bestSeen h", value: P.h(best), state: "ok" }]),
      }, L.drawNeighbourhood(P, cur, nb, { chosen: chosen.bits, states: states0 })));
      until[chosen.i] = t + tenure; freq[chosen.i]++; cur = chosen.bits;
      if (P.h(cur) > prevBestH) best = cur;
      const again = first.has(cur); if (!again) first.set(cur, t); else revisits++;
      rows.push([t, chosen.move, cur, P.h(cur), P.vars.filter((_, i) => until[i] > t).join(",") || "–", P.h(best)]);
      states.push(P.h(cur) > prevBestH ? "ok" : asp ? "warn" : again ? "warn" : worse ? "bad" : "");
    }
    const solved = P.solved(best);
    steps.push(Object.assign({ caption: solved ? `${best} satisfies all ${P.m} clauses: tabu search succeeded after ${rows.length - 1} flip${rows.length === 2 ? "" : "s"} (${rows.map(r => r[2]).join(" → ")}).` : `Search ended${stopped ? " (every flip was tabu)" : ""}. bestSeen is ${best} with h = ${P.h(best)} of ${P.m}. ${revisits ? `The walk revisited a string ${revisits} time${revisits === 1 ? "" : "s"}: it is cycling, so try a longer tenure than ${tenure} (for example ${tenure + 1}).` : "No string was revisited."}`,
      table: Object.assign(tbl(), { rowStates: states.slice() }), lists: [{ label: "FLIPS (frequency)", items: P.vars.map((v, i) => ({ text: `${v}: ${freq[i]}`, state: freq[i] ? "closed" : "plain" })) }],
      stats: L.stats(P, best, [{ label: "result", value: solved ? "solved" : "not solved", state: solved ? "ok" : "bad" }]) }, L.drawBits(P, best, { state: solved ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved, path: rows.map(r => r[2]), flips: rows.slice(1).map(r => r[1]), iterations: rows.length - 1, freq, revisits, stopped } };
  },
});
