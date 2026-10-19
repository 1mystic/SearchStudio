/* Savings heuristic (Clarke–Wright) with a base / fulcrum city. */
Studio.register({
  id: "tsp-savings",
  name: "Savings heuristic",
  family: "TSP · constructive",
  week: 3,
  problem: "tsp",
  order: 30,
  summary: "Start with an out-and-back trip from the base to every city, then merge trips in decreasing order of savings S(i,j) = C(base,i) + C(base,j) − C(i,j).",
  pseudocode: `for every pair i, j ≠ base:  S(i,j) ← C(base,i) + C(base,j) − C(i,j)
sort pairs by S, largest first (ties: alphabetical)
start with n−1 sub-tours base–x–base
for each pair (i,j) in that order
    if i and j are ends of different sub-tours: link i–j (merge)
    else: skip (same sub-tour, or an interior city)
return the single tour`,
  complexity: "O(n² log n)",
  learn: {
    "intro": "Imagine a delivery van that returns to the depot after every single delivery. The Savings heuristic starts there and asks: which two trips can I combine to save the most driving? It keeps combining trips until there is just one round trip.",
    "definition": "Choose a base (fulcrum) city b. For each pair of other cities compute the saving S(i,j) of visiting i and j on one trip instead of two. Process pairs from the largest saving down, linking i and j whenever both are still ends of different sub-tours.",
    "steps": [
      [
        "S(i,j) ← C(b,i) + C(b,j) − C(i,j)",
        "For n cities there are (n−1)(n−2)/2 pairs."
      ],
      [
        "sort pairs, largest saving first",
        "Ties change the result; the course breaks them alphabetically."
      ],
      [
        "start with b–x–b for every x",
        "Initial cost = 2 × Σ C(b,x)."
      ],
      [
        "link i–j if both are ends of different sub-tours",
        "An end city is one still adjacent to the base. Linking removes edges b–i and b–j and adds i–j."
      ],
      [
        "otherwise skip",
        "Same sub-tour: would close a cycle. Interior city: already has two non-base neighbours."
      ],
      [
        "return the single tour",
        "Final cost = initial cost − Σ accepted savings."
      ]
    ],
    "formulas": [
      {
        "f": "S(i,j) = C(b,i) + C(b,j) − C(i,j)",
        "read": "trip b→i→b plus b→j→b, minus going i→j directly",
        "why": "Merging two out-and-back trips replaces the two edges i–b and b–j with one edge i–j; the difference is the distance saved."
      },
      {
        "f": "cost = 2·Σₓ C(b,x) − Σ accepted S(i,j)",
        "read": "start with all out-and-back trips, subtract each saving you used",
        "why": "Every merge removes exactly its saving from the total, which is a quick way to check your final tour cost."
      }
    ],
    "why": "Savings rewards pairs that are far from the base but close to each other, which avoids stranding remote cities. It is usually the best of the three constructive heuristics, but the result depends on the base city and on tie-breaking.",
    "traps": [
      "The savings formula has a minus on C(i,j), not on the base distances.",
      "A pair is refused if either city is interior, even if they are in different sub-tours.",
      "Know which pairs merged and which did not: exams ask for the first three of each."
    ],
    "props": {
      "complete": "always returns a tour",
      "optimal": "no",
      "time": "O(n² log n)",
      "space": "O(n²)"
    }
  },
  params: [{ key: "base", label: "Base (fulcrum) city", type: "city", default: P => P.ids[0] }],
  run(P, { base }) {
    const steps = [], others = P.ids.filter(c => c !== base);
    const S = [];
    others.forEach((a, i) => others.slice(i + 1).forEach(b => S.push({ pair: a + b, a, b, s: P.d(base, a) + P.d(base, b) - P.d(a, b), calc: `${P.d(base, a)}+${P.d(base, b)}−${P.d(a, b)}` })));
    S.sort((x, y) => y.s - x.s || (x.pair < y.pair ? -1 : 1));
    let subs = others.map(c => [c]);
    const owner = c => subs.findIndex(p => p.includes(c));
    let cost = others.reduce((s, c) => s + 2 * P.d(base, c), 0);
    const status = S.map(() => "");
    const verdict = S.map(() => "");
    const draw = () => {
      const edges = [];
      subs.forEach(p => {
        if (p.length === 1) edges.push({ u: base, v: p[0], state: "alt", label: "×2" });
        else { const seq = [base, ...p, base]; for (let i = 0; i + 1 < seq.length; i++) edges.push({ u: seq[i], v: seq[i + 1], state: "tour", label: P.d(seq[i], seq[i + 1]) }); }
      });
      const nodes = {}; P.ids.forEach(c => (nodes[c] = { state: "plain" })); nodes[base] = { state: "start" };
      return { nodes, edges };
    };
    const table = () => ({ columns: ["#", "pair", "C(b,i)+C(b,j)−C(i,j)", "S", "result"], rows: S.map((r, i) => [i + 1, r.pair, r.calc, r.s, verdict[i]]), rowStates: status.slice() });
    steps.push({ caption: `Base ${base}: ${S.length} savings, sorted largest first. Start: ${others.length} trips ${base}–x–${base}, cost ${cost}`, ...draw(), table: table(), stats: [{ label: "cost", value: cost }] });
    let merges = 0;
    S.forEach((r, i) => {
      if (merges === others.length - 1) { status[i] = "dim"; verdict[i] = "done"; return; }
      const oa = owner(r.a), ob = owner(r.b);
      let why = "";
      const pa = subs[oa], pb = subs[ob];
      if (oa === ob) why = "same sub-tour";
      else if (!(pa[0] === r.a || pa[pa.length - 1] === r.a)) why = `${r.a} is interior`;
      else if (!(pb[0] === r.b || pb[pb.length - 1] === r.b)) why = `${r.b} is interior`;
      status[i] = "cur";
      const d = draw();
      d.edges.push({ u: r.a, v: r.b, state: why ? "rejected" : "candidate", label: P.d(r.a, r.b) });
      if (why) {
        verdict[i] = "no: " + why;
        steps.push({ caption: `${r.pair} (S = ${r.s}): no merge, ${why}`, ...d, table: table(), stats: [{ label: "cost", value: cost }] });
        status[i] = "bad";
        return;
      }
      const A = pa[pa.length - 1] === r.a ? pa : pa.slice().reverse();
      const B = pb[0] === r.b ? pb : pb.slice().reverse();
      const merged = A.concat(B);
      subs = subs.filter((_, k) => k !== oa && k !== ob).concat([merged]);
      cost -= r.s; merges++;
      verdict[i] = `merge → ${base}-${merged.join("-")}-${base}`;
      const d2 = draw();
      d2.edges.forEach(e => { if ((e.u === r.a && e.v === r.b) || (e.u === r.b && e.v === r.a)) e.state = "added"; });
      steps.push({ caption: `${r.pair} (S = ${r.s}): merge. Cost ${cost + r.s} − ${r.s} = ${cost}`, ...d2, table: table(), stats: [{ label: "cost", value: cost }] });
      status[i] = "ok";
    });
    const tour = [base, ...subs[0]];
    const final = P.cost(tour);
    const merged = S.filter((_, i) => status[i] === "ok").map(r => r.pair), not = S.filter((_, i) => status[i] === "bad").map(r => r.pair);
    steps.push({ caption: `Tour ${tour.join(",")} = ${final}. First merges: ${merged.slice(0, 3).join(", ")}; first refusals: ${not.slice(0, 3).join(", ") || "none"}`, ...draw(), table: table(), stats: [{ label: "tour cost", value: final, state: "ok" }] });
    return { steps, result: { tour, cost: final, merged, notMerged: not } };
  },
});
