/* Beam search on SAT: keep the w best distinct one-flip neighbours of the whole beam. */
Studio.register({
  id: "sat-beam",
  name: "Beam search",
  family: "SAT · local search",
  week: 3,
  problem: "sat",
  order: 30,
  defaultExample: "sat-local-trap",
  summary: "Keep w assignments instead of one. Each level generates the N1 neighbours of every assignment in the beam and keeps the w with the largest h; stop when the head of the beam no longer improves. w = 1 is hill climbing.",
  pseudocode: `OPEN ← [start]                       # the beam, best first
loop
    if some X in OPEN has h(X) = m: return X
    cand ← distinct N1 neighbours of every X in OPEN
    OPEN ← the w best of cand by h (ties: order of generation, lowest bit first)
    if h(head of OPEN) ≤ h(previous head): stop
return the best assignment seen`,
  complexity: "w · n evaluations per level",
  learn: {
    intro: "Hill climbing follows a single path and so can be trapped. Beam search keeps a small population of w assignments: the w best of everything reachable in one flip from the current beam. A wider beam explores more routes at the cost of w times more work per level.",
    definition: "Level 0 is [start]. At each level, generate the N1 neighbours of every assignment in the beam (removing duplicates), sort them by h, and keep the best w. Stop when no solution appears and the best h of the new beam is not higher than that of the old one; return the best assignment seen.",
    steps: [
      ["OPEN ← [start]", "The beam; its first element is the head."],
      ["if some X in OPEN is a solution: return X", "Goal test when the assignment is taken from the beam."],
      ["cand ← distinct neighbours of the beam", "Two beam members can share a neighbour; keep it once."],
      ["OPEN ← the w best of cand", "Ties keep generation order: beam order first, then lowest bit."],
      ["stop if the head did not improve", "Otherwise the next level starts from the new beam."],
    ],
    formulas: [
      { f: "|cand| ≤ w · n", read: "at most w·n candidates per level", why: "The work per level is linear in the beam width." },
      { f: "w = 1 ⇒ hill climbing; w ≥ 2ⁿ ⇒ breadth-first over the whole space", read: "the width interpolates between the two", why: "The same dial as in graph and TSP beam search." },
    ],
    why: "The beam lets a runner-up survive. Hill climbing keeps only the single best neighbour, but the second-best string may have a neighbour that beats everything reachable from the best one. On the example 'Local-maximum trap' (sat-local-trap) from 0000: w = 1 is hill climbing and stops at 0100 (h 7); w = 2 also keeps 0001 (h 7), and its neighbour 0011 has h 8, a solution, at level 2. The beam is still incomplete: it stops as soon as the head does not improve, so it cannot cross a plateau, and if all w members fall into the same basin it stalls like hill climbing. On the course example sat-four-var even w = 4 stops at 1000 (h 5), because the head of the beam does not improve at level 2.",
    traps: [
      "The beam holds the w best of all neighbours together, not w neighbours per member.",
      "Remove duplicate neighbours, or the beam fills up with copies of the same string.",
      "Stopping rule: the head not improving. A level whose beam is merely as good as the last one ends the search, so a wider beam does not help on a plateau (try sat-four-var with w = 1 to 4).",
      "A wider beam is not always better; it costs w times more evaluations and only helps when a runner-up leads somewhere the best member does not.",
    ],
    props: { complete: "no", optimal: "no", time: "O(levels · w · n · m)", space: "O(w · n)" },
  },
  params: [Studio.satLib.startParam, { key: "w", label: "Beam width w", type: "int", default: 2, min: 1, max: 8 }],
  run(P, { start, w }) {
    const L = Studio.satLib, steps = [], levels = [];
    let beam = [L.startBits(P, start)], head = beam[0], best = head;
    const lists = (B, st) => [{ label: "OPEN", items: B.map((b, i) => ({ text: `${b} (h ${P.h(b)})`, state: i === 0 ? "open" : "plain" })) }];
    levels.push([0, "start", `${head} (h ${P.h(head)})`, P.h(head)]);
    const tbl = () => ({ title: `levels (w = ${w})`, columns: ["level", "generated", "beam", "head h"], rows: levels.map(r => r.slice()), rowStates: levels.map((_, i) => (i === levels.length - 1 ? "cur" : "")) });
    steps.push(Object.assign({ caption: `Level 0: the beam is [${head}] with h = ${P.h(head)} of ${P.m}.`, table: tbl(), lists: lists(beam), stats: L.stats(P, head, [{ label: "w", value: w }]) }, L.drawBits(P, head)));
    for (let lv = 1; lv <= 60 && !P.solved(head); lv++) {
      const seen = new Map(), from = {};
      beam.forEach(b => P.nbrs(b, 1).forEach(x => { if (!seen.has(x.bits)) { seen.set(x.bits, x); from[x.bits] = b; } }));
      const ranked = [...seen.values()].map((x, i) => [x, i]).sort((a, b) => b[0].h - a[0].h || a[1] - b[1]).map(z => z[0]);
      const kept = ranked.slice(0, w), prevH = P.h(head);
      beam = kept.map(x => x.bits); head = beam[0];
      const improved = P.h(head) > prevH, solved = P.solved(head);
      if (P.h(head) > P.h(best)) best = head;
      levels.push([lv, seen.size, kept.map(x => `${x.bits} (h ${x.h})`).join(" | "), P.h(head)]);
      steps.push(Object.assign({
        caption: `Level ${lv}: the beam's N1 neighbourhoods give ${seen.size} distinct strings. The best ${kept.length} are ${kept.map(x => `${x.bits} (h ${x.h})`).join(", ")}. Head h ${P.h(head)} ${improved ? ">" : "≤"} ${prevH}: ${solved ? "that is a solution." : improved ? "the head improved, so continue." : "no improvement, so the beam search stops."}`,
        table: Object.assign(tbl(), { title: `level ${lv} candidates (kept ${kept.length} of ${seen.size})`, columns: ["string", "h", "from", "kept"], rows: ranked.map(x => [x.bits, x.h, from[x.bits], kept.includes(x) ? { t: "kept", s: "ok" } : ""]), rowStates: ranked.map(x => (kept.includes(x) ? "ok" : "")) }),
        lists: lists(beam), stats: L.stats(P, head, [{ label: "level", value: lv }, { label: "w", value: w }]),
      }, L.drawBits(P, head, { state: solved ? "goal" : undefined })));
      if (!improved && !solved) break;
    }
    steps.push(Object.assign({ caption: P.solved(best) ? `Beam search (w = ${w}) found the solution ${best} at level ${levels.length - 1}; compare with w = 1, which is plain hill climbing.` : `Beam search (w = ${w}) returns ${best} with h = ${P.h(best)} of ${P.m}; unsatisfied: ${L.unsatText(P, best)}. The head stopped improving, so all ${w} member${w === 1 ? "" : "s"} of the beam are stuck${w === 1 ? " (w = 1 is hill climbing)" : "; a different width may do better"}.`,
      table: Object.assign(tbl(), { rowStates: levels.map(() => "") }), stats: L.stats(P, best, [{ label: "result", value: P.solved(best) ? "solved" : "stuck", state: P.solved(best) ? "ok" : "bad" }]) }, L.drawBits(P, best, { state: P.solved(best) ? "goal" : "path" })));
    return { steps, result: { bits: best, h: P.h(best), solved: P.solved(best), levels: levels.length - 1, w } };
  },
});
