/* Representation lab: path <-> ordinal <-> adjacency, and why ordinal crossover never breaks a tour. */
Studio.register({
  id: "tsp-representation-lab",
  name: "Representation lab",
  family: "TSP · genetic",
  week: 4,
  problem: "tsp",
  order: 145,
  summary: "Convert a tour between path, ordinal and adjacency representations step by step; see that the reversed tour's adjacency is also valid, that one-point crossover on ordinal strings always decodes to a tour, and that the same cut on adjacency lists may not.",
  pseudocode: `Ordinal encode:  ref ← the cities of the tour in alphabetical order
    for each city c of the tour, in order:  gene ← position of c in ref (1-based);  delete c from ref
Ordinal decode:  ref ← same list;  for each gene g: city ← g-th city of ref;  delete it from ref
Adjacency encode: a[c] ← the city after c in the tour (cyclic), listed in alphabetical order of c
Adjacency decode: start at the first city, repeatedly go to a[current]; valid iff all n cities are visited before returning
Crossover: cut two ordinal strings after k genes and swap the tails; decode both children`,
  complexity: "O(n²) per conversion",
  learn: {
    intro: "A genetic algorithm needs a way to write a tour as a string it can cut and recombine. The same tour can be written as the path (visit order), as an adjacency list (who follows whom) or as an ordinal string (index into a shrinking list). Each representation allows different crossover operators and has different pitfalls.",
    definition: "Path: the cities in visiting order. Adjacency: entry i is the city that follows the i-th city (alphabetical order) in the tour. Ordinal: with a reference list of the tour's cities in alphabetical order, gene 1 is the position of the first tour city in that list; delete it; gene 2 is the position of the second tour city in the remaining list; and so on.",
    steps: [
      ["ref ← cities in alphabetical order", "The reference list fixes what 'position k' means. The notes' ordinal example (I,L,G,D,F,H,J,E,K,M → 6,8,4,1,2,2,2,1,1,1) is reproduced by the alphabetical list D,E,F,G,H,I,J,K,L,M of the cities in the tour."],
      ["gene ← position of c in ref; delete c", "Deleting the city makes the list shrink, so gene i is always between 1 and n−i+1."],
      ["adjacency a[c] ← city after c", "Listed in alphabetical order of c. The notes' example J,G,F,I,L,M,E,D,H,K gives H,D,I,F,K,L,G,J,M,E."],
      ["adjacency of the reversed tour", "Every arrow flips, so the list is the inverse mapping; it is also a valid single cycle with the same cost."],
      ["cut two ordinal strings and swap tails", "Gene i of any child is still in 1..n−i+1, so it always selects an existing city when decoding: the child is a tour."],
    ],
    formulas: [
      { f: "gene i ∈ {1, …, n−i+1}", read: "the i-th gene indexes a list that already lost i−1 cities", why: "Mixing the first genes of one string with the later genes of another never leaves this range, so decoding cannot fail." },
      { f: "a[c] = successor of c", read: "adjacency stores edges, directed along the tour", why: "A list is a tour only if following a[ ] from any city visits all n cities before returning; two or more separate cycles are legal lists but not tours." },
      { f: "a_reverse = a⁻¹", read: "the reversed tour's adjacency is the inverse permutation", why: "A tour and its reverse are the same cycle with the same cost, so both lists are valid representations." },
    ],
    why: "Ordinal representation is the course's example of a representation chosen so that a plain one-point crossover is legal. The price is that gene positions mean different things depending on earlier genes, so a child can look unlike either parent.",
    traps: [
      "The reference list is the tour's own cities in alphabetical order, not the order of the tour.",
      "Genes count from 1, and the list shrinks after every deletion.",
      "Adjacency is read in alphabetical order of the city, not along the tour.",
      "A valid-looking adjacency list can break into sub-cycles; check that it is one cycle through every city.",
    ],
    props: { complete: "n/a", optimal: "n/a", time: "O(n²)", space: "O(n)" },
  },
  params: [
    { key: "tour", label: "Tour", type: "text", default: "auto", help: "auto, or a list of cities such as I,L,G,D,F,H,J,E,K,M (auto uses that tour when the problem has cities A..M, else a seeded random tour)" },
    { key: "tour2", label: "Second tour (crossover)", type: "text", default: "auto", help: "auto = a seeded shuffle of the same cities, or a list of the same cities" },
    { key: "cut", label: "Cut after (genes)", type: "int", default: 4 },
    Studio.seedParam(7),
  ],
  run(P, { tour, tour2, cut, seed }) {
    const X = Studio.tsp.crossovers, rng = Studio.rng(seed), steps = [];
    const parse = (s) => String(s).split(/[\s,;]+/).filter(Boolean);
    const NOTES = "I,L,G,D,F,H,J,E,K,M".split(",");
    let t;
    if (!tour || tour === "auto") {
      t = NOTES.every(c => P.ids.includes(c)) ? NOTES : [P.ids[0]].concat(rng.shuffle(P.ids.slice(1)));
    } else t = parse(tour);
    if (t.length < 3 || new Set(t).size !== t.length || t.some(c => !P.ids.includes(c))) throw new Error(`Tour "${tour}" must list distinct cities of the problem (at least 3)`);
    const n = t.length, ref0 = t.slice().sort();
    let t2;
    if (!tour2 || tour2 === "auto") { t2 = rng.shuffle(t); if (t2.join() === t.join()) t2 = t.slice().reverse(); } else t2 = parse(tour2);
    if (t2.length !== n || new Set(t2).size !== n || t2.some(c => !t.includes(c))) throw new Error(`Second tour "${tour2}" must use exactly the same cities as the first`);
    const k = Math.max(1, Math.min(n - 1, cut | 0 || 1));
    const cost = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += P.d(x[i], x[(i + 1) % x.length]); return s; };
    const nodes = (x, st = "plain") => { const o = {}; P.ids.forEach(c => (o[c] = { state: x.includes(c) ? st : "dim" })); return o; };
    const cycle = (x, st) => Studio.draw.tour(x, st);
    const row = (label, items, st) => ({ label, items: items.map((c, i) => ({ text: String(c), state: st ? st(i, c) : "plain" })), boxes: true });
    const adjOf = (x) => { const a = X.adj(x); return ref0.map(c => a[c]); };
    /* follow an adjacency list from the first alphabetical city; report whether it is one cycle through all */
    const follow = (adjList) => {
      const a = {}; ref0.forEach((c, i) => (a[c] = adjList[i]));
      const path = [ref0[0]]; let c = a[ref0[0]];
      while (c !== ref0[0] && !path.includes(c) && path.length <= n) { path.push(c); c = a[c]; }
      return { path, ok: path.length === n && c === ref0[0] };
    };
    const push = (s) => steps.push(s);

    push({ caption: `Tour ${t.join(",")} (${n} cities, cost ${cost(t)}). Reference list for ordinal coding: its cities in alphabetical order, ${ref0.join(",")}`,
      nodes: nodes(t), edges: cycle(t, "tour"), lists: [row("path", t), row("ref", ref0)],
      stats: [{ label: "cities", value: n }, { label: "cost", value: cost(t) }] });

    /* ---- path -> ordinal */
    const ref = ref0.slice(), code = [], rows = [], states = [];
    t.forEach((c, i) => {
      const g = ref.indexOf(c) + 1, before = ref.slice();
      ref.splice(g - 1, 1); code.push(g);
      rows.push([i + 1, c, before.join(""), g]); states.push("cur");
      push({ caption: `Gene ${i + 1}: ${c} is at position ${g} of [${before.join("")}], so the gene is ${g}; delete ${c}, ${ref.length} cities remain`,
        nodes: nodes(t, "visited"), edges: cycle(t, "faint"),
        lists: [row("path", t, (j) => (j === i ? "current" : j < i ? "closed" : "plain")), row("ref", before, (j) => (j === g - 1 ? "current" : "plain")), row("ordinal", code)],
        table: { title: "path → ordinal", columns: ["i", "city", "list before", "gene"], rows: rows.slice(), rowStates: states.map((_, j) => (j === i ? "cur" : "")) },
        stats: [{ label: "gene range", value: `1..${n - i}` }] });
    });
    push({ caption: `Ordinal string of ${t.join(",")} = ${code.join(" ")}. Gene i lies in 1..n−i+1, here ${code.map((g, i) => `${g}≤${n - i}`).join(", ")}`,
      nodes: nodes(t), edges: cycle(t, "tour"), lists: [row("path", t), row("ordinal", code)], stats: [{ label: "ordinal", value: code.join(" "), state: "ok" }] });

    /* ---- ordinal -> path (check) */
    const dec = X.fromOrdinal(ref0, code);
    push({ caption: `Decoding ${code.join(" ")} with the same reference list gives ${dec.join(",")}: ${dec.join() === t.join() ? "the original tour, so the code loses nothing" : "MISMATCH"}`,
      nodes: nodes(dec, "path"), edges: cycle(dec, "path"), lists: [row("ordinal", code), row("decoded", dec)], stats: [{ label: "round trip", value: dec.join() === t.join() ? "ok" : "bad", state: dec.join() === t.join() ? "ok" : "bad" }] });

    /* ---- path -> adjacency */
    const adj = adjOf(t), arows = ref0.map((c, i) => [c, adj[i]]);
    push({ caption: `Adjacency: in alphabetical order of city, write the city that follows it in the tour (the last city wraps to ${t[0]}): ${adj.join(",")}`,
      nodes: nodes(t), edges: cycle(t, "tour"), lists: [row("city", ref0), row("next", adj)],
      table: { title: "path → adjacency", columns: ["city", "next"], rows: arows } });
    const f1 = follow(adj);
    push({ caption: `Reading it back: start at ${ref0[0]} and follow the arrows ${f1.path.join("→")}→${ref0[0]}. All ${n} cities are visited in one cycle, so the list is a tour`,
      nodes: nodes(f1.path, "path"), edges: cycle(f1.path, "path"), lists: [row("city", ref0), row("next", adj)], stats: [{ label: "valid tour", value: f1.ok ? "yes" : "no", state: f1.ok ? "ok" : "bad" }] });

    /* ---- reversed tour */
    const rev = t.slice().reverse(), radj = adjOf(rev), fr = follow(radj);
    const sameEdges = (x, y) => { const E = z => new Set(Studio.tsp.tourEdges(z).map(([a, b]) => [a, b].sort().join(""))); const A = E(x), B = E(y); return A.size === B.size && [...A].every(e => B.has(e)); };
    push({ caption: `The reversed tour ${rev.join(",")} has adjacency ${radj.join(",")}, a different list for the same cycle: it is also a valid tour (${fr.ok ? "one cycle through all cities" : "NOT one cycle"}), same edges ${sameEdges(t, rev) ? "yes" : "no"}, same cost ${cost(rev)}`,
      nodes: nodes(rev, "path"), edges: cycle(rev, "alt"), lists: [row("city", ref0), row("next (tour)", adj), row("next (reversed)", radj)],
      table: { title: "adjacency of the tour and of its reverse", columns: ["city", "tour", "reversed"], rows: ref0.map((c, i) => [c, adj[i], radj[i]]) },
      stats: [{ label: "reversed is valid", value: fr.ok ? "yes" : "no", state: fr.ok ? "ok" : "bad" }, { label: "cost", value: cost(rev) }] });

    /* ---- ordinal one-point crossover */
    const enc = (x) => { const r = ref0.slice(), o = []; x.forEach(c => { const g = r.indexOf(c) + 1; o.push(g); r.splice(g - 1, 1); }); return o; };
    const o1 = code, o2 = enc(t2);
    push({ caption: `Second parent ${t2.join(",")} (cost ${cost(t2)}) has ordinal ${o2.join(" ")}`, nodes: nodes(t2), edges: cycle(t, "tour").concat(Studio.draw.tour(t2, "alt", null, false)),
      lists: [row("P1 ordinal", o1), row("P2 ordinal", o2)] });
    const c1 = o1.slice(0, k).concat(o2.slice(k)), c2 = o2.slice(0, k).concat(o1.slice(k));
    const ch1 = X.fromOrdinal(ref0, c1), ch2 = X.fromOrdinal(ref0, c2);
    const inRange = (c) => c.every((g, i) => g >= 1 && g <= n - i);
    const cutSt = (i) => (i < k ? "open" : "alt");
    push({ caption: `Cut after gene ${k} and swap the tails: C1 = ${c1.join(" ")}, C2 = ${c2.join(" ")}. Every gene is still within 1..n−i+1 (${inRange(c1) && inRange(c2) ? "checked" : "VIOLATED"})`,
      nodes: nodes(t), edges: cycle(t, "tour"),
      lists: [row("P1", o1, cutSt), row("P2", o2, cutSt), row("C1", c1, cutSt), row("C2", c2, (i) => (i < k ? "alt" : "open"))] });
    const v = (x) => x.length === n && new Set(x).size === n;
    push({ caption: `Decoding gives C1 = ${ch1.join(",")} (cost ${cost(ch1)}) and C2 = ${ch2.join(",")} (cost ${cost(ch2)}): both are valid tours, because each gene indexes a list that still has that many cities`,
      nodes: nodes(ch1, "path"), edges: cycle(ch1, "path"),
      lists: [row("C1", ch1), row("C2", ch2)], stats: [{ label: "C1 valid", value: v(ch1) ? "yes" : "no", state: v(ch1) ? "ok" : "bad" }, { label: "C2 valid", value: v(ch2) ? "yes" : "no", state: v(ch2) ? "ok" : "bad" }] });

    /* ---- the same cut on adjacency lists (contrast) */
    const a1 = adj, a2 = adjOf(t2), ac = a1.slice(0, k).concat(a2.slice(k)), fc = follow(ac);
    const dupT = ac.filter((c, i) => ac.indexOf(c) !== i);
    push({ caption: `Contrast: the same cut on the adjacency lists gives ${ac.join(",")}. ${fc.ok ? "Valid here, by luck" : dupT.length ? `${[...new Set(dupT)].join(",")} appear${dupT.length > 1 ? "" : "s"} as the successor of two cities, so it is not a tour` : `Following it from ${ref0[0]} visits only ${fc.path.join(",")} and closes early (sub-cycle), so it is not a tour`}`,
      nodes: nodes(t), edges: cycle(t, "faint"), lists: [row("A1", a1, cutSt), row("A2", a2, cutSt), row("child", ac, cutSt)],
      stats: [{ label: "valid tour", value: fc.ok ? "yes (luck)" : "no", state: fc.ok ? "warn" : "bad" }] });

    return { steps, result: { path: t, refList: ref0, ordinal: code, adjacency: adj, reversed: rev, reversedAdjacency: radj, reversedValid: fr.ok,
      ordinal2: o2, childOrdinal: [c1, c2], children: [ch1, ch2], childrenValid: v(ch1) && v(ch2), adjacencyChildValid: fc.ok, cost: cost(t) } };
  },
});
