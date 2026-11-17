/* Week 6 (supplementary): Divide and Conquer Beam Search (Zhou and Hansen). Uses Studio.spaceSaving from a-star-ub.js; only called inside run(). */
Studio.register({
  id: "search-dc-beam",
  name: "Divide and Conquer Beam Search",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 38,
  defaultExample: "graph-grid",
  summary: "Beam search keeps only the w best nodes of each layer and only the latest layers, so it cannot read its path back. Divide and Conquer Beam Search remembers a relay node from the middle layer of the best path found, then solves start→relay and relay→goal as two smaller beam searches, recursively. Memory is O(w), with no parent pointers.",
  pseudocode: `DCBS(S, T, U, w):
    run beam search from S to T, layer by layer, keeping the w best nodes by f in each layer
        (nodes with f > U are never generated; only the current and previous layers are stored)
    if no goal was reached: fail
    if the path has ≤ 1 move: return [S, T]
    run it again, each node on layer ⌊L/2⌋ becoming its own relay, passed on to its descendants
    R ← the relay of the best goal, with g(R)
    return DCBS(S, R, g(R), w) ++ DCBS(R, T, C − g(R), w)       # drop the repeated R`,
  complexity: "Memory O(w) nodes per layer (two layers kept); time about twice beam search, the halves shrink geometrically",
  learn: {
    intro: "Beam search bounds memory by keeping only w nodes per layer, but then the path cannot be read from parent pointers without storing every layer. Divide and Conquer Beam Search keeps one extra node instead: the middle node of the best path found, the relay. Each half is then a smaller beam search of the same kind. **Supplementary:** this is Zhou and Hansen's divide-and-conquer beam search; the course covers beam search and divide-and-conquer frontier search separately.",
    definition: "Run beam search from S to T: generate the children of the layer, drop those with f = g + h above the bound U, drop duplicates found in the current or previous layer, and keep the w best by f. Continue until the layers run out, remembering the best goal. Repeat the run with every node of layer ⌊L/2⌋ acting as a relay that its descendants inherit. The best goal's relay R splits the problem into S→R (cost g(R)) and R→T (cost C − g(R)); solve both recursively with h = 0 and their exact costs as bounds. If a half cannot be re-found at width w, the width is doubled for that half until it can.",
    steps: [
      ["beam search S→T with width w", "Layer by layer, only the w best nodes by f survive; nodes beyond w are cut."],
      ["rerun marking layer ⌊L/2⌋ nodes as relays", "The same beam is rebuilt, so the same best goal is found, now with a relay."],
      ["R ← relay of the best goal", "A node halfway (by moves) along the best path found."],
      ["solve S→R and R→T", "Smaller beam searches with exact cost bounds; their paths are joined."],
    ],
    formulas: [
      { f: "|beam| ≤ w,   stored nodes ≤ 3w", read: "the new layer plus the two kept layers", why: "At most w nodes survive in each layer and only the current and previous layers are kept for duplicate detection, so memory does not grow with depth." },
      { f: "C = g(R) + cost(R→T)", read: "the path found splits at the relay into two parts", why: "Each part of the path found is itself a path of the stated cost, so joining the solved halves gives a path of cost C. It is optimal only if beam search found an optimal path." },
    ],
    why: "Shows how to recover the path from a search that stores almost nothing. A very wide beam behaves like BFHS and finds the optimum; a narrow beam may cut the only route, and then the search falls back to the quick solution or reports failure.",
    traps: ["Beam search is incomplete: with a small w the beam can lose every route to the goal. Then DC beam search returns the greedy quick solution that gave U, or says it found nothing.", "The halves are searched with h = 0 (h aims at T, not at the relay), so a narrow beam may need widening to re-find a half.", "A wider beam is not always cheaper in memory terms: peak storage grows with w."],
    props: { complete: "no (yes when w ≥ number of nodes)", optimal: "no for small w, yes for a wide beam with admissible h", time: "≈ 2 × beam search", space: "O(w)" },
  },
  params: [
    { key: "w", label: "Beam width w", type: "int", default: 3, min: 1, max: 30 },
    { key: "U", label: "Upper bound U (0 = from a greedy run)", type: "number", default: 0 },
  ],
  run(P, { w, U: given }) {
    const SS = Studio.spaceSaving, { fmt, byF, EPS } = SS;
    w = Math.max(1, Math.round(w || 1));
    const n = P.ids.length, rec = SS.recorder(), base = SS.astarBase(P), ub = SS.getU(P, +given || 0);
    const zero = () => 0, hOf = id => SS.H(P, id);
    let peakOpen = 0, peakClosed = 0, peakTotal = 0, passes = 0, widened = 0, relayStored = 0;
    const log = [];

    /* beam search core: layers by number of moves; keeps the w best (by f, then name) of every layer; two layers back for duplicates */
    const beam = (s, t, U, h, width, relayLayer, onLayer) => {
      let best = null, k = 0, prev = [], expanded = 0, pk = { open: 0, closed: 0, total: 0 };
      let cur = [{ id: s, g: 0, f: h(s), k: 0, relay: null, relayG: 0 }];
      if (cur[0].f > U + EPS) cur = [];
      const accept = g => (best ? g < best.g - EPS : g <= U + EPS);
      while (cur.length && k <= 6 * n + 10) {
        const next = new Map(), pruned = [], dups = [];
        for (const x of cur) {
          if (x.id === t) { if (accept(x.g)) { best = x; U = x.g; } continue; }
          expanded++;
          for (const [c, wt] of P.adj[x.id]) {
            const g2 = x.g + wt, f2 = g2 + h(c);
            if (f2 > U + EPS) { pruned.push(c); continue; }
            const same = next.get(c) || cur.find(y => y.id === c && y.g <= g2 + EPS) || prev.find(y => y.id === c && y.g <= g2 + EPS);
            if (same && same.g <= g2 + EPS) { dups.push(c); continue; }
            const isMid = relayLayer != null && k + 1 === relayLayer;
            next.set(c, { id: c, g: g2, f: f2, k: k + 1, relay: isMid ? c : x.relay, relayG: isMid ? g2 : x.relayG });
          }
        }
        const all = [...next.values()].sort(byF), kept = all.slice(0, width), cut = all.slice(width);
        const closedNow = cur.length + prev.length;
        pk.open = Math.max(pk.open, kept.length); pk.closed = Math.max(pk.closed, closedNow); pk.total = Math.max(pk.total, kept.length + closedNow);
        if (onLayer) onLayer({ k, cur, prev, kept, cut, pruned, dups, U, best });
        prev = cur; cur = kept; k++;
      }
      peakOpen = Math.max(peakOpen, pk.open); peakClosed = Math.max(peakClosed, pk.closed); peakTotal = Math.max(peakTotal, pk.total);
      return { found: !!best, best, cost: best ? best.g : Infinity, layers: k, expanded };
    };

    // top-level pass 1: shown layer by layer
    const shownLayers = [], layerRows = [];
    const first = (U0) => {
      passes++;
      return beam(P.start, P.goal, U0, hOf, w, null, L => {
        layerRows.push([L.k, L.cur.length, L.kept.length, L.cut.length, L.pruned.length]);
        const states = {}, badges = {};
        L.prev.forEach(x => (states[x.id] = "closed")); L.cur.forEach(x => (states[x.id] = "visited"));
        L.cut.forEach(x => (states[x.id] = "pruned")); L.kept.forEach(x => { states[x.id] = "open"; badges[x.id] = fmt(x.g); });
        states[P.start] = states[P.start] || "start"; if (states[P.goal] === undefined) states[P.goal] = "goalcand";
        shownLayers.push({ L, states, badges, row: layerRows.slice() });
      });
    };
    rec.push({ caption: `${ub.how}. Beam width w = ${w}: every layer keeps only its ${w} best nodes by f = g + h and the layers behind are deleted. The path will be rebuilt from a relay node in the middle layer instead of parent pointers.`,
      nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P), stats: [{ label: "w", value: w }, { label: "U", value: fmt(ub.U) }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
    const r1 = first(ub.U);
    shownLayers.slice(0, 14).forEach(({ L, states, badges, row }) => {
      rec.push({ caption: `Layer ${L.k}: expand ${L.cur.length} node${L.cur.length === 1 ? "" : "s"} (${L.cur.map(x => x.id).join(", ")}). ${L.kept.length + L.cut.length} new candidate${L.kept.length + L.cut.length === 1 ? "" : "s"}${L.pruned.length ? `, ${L.pruned.length} discarded for f > U = ${fmt(L.U)}` : ""}${L.cut.length ? `; the beam keeps the best ${w} and cuts ${L.cut.map(x => `${x.id} (f=${fmt(x.f)})`).join(", ")} for good` : "; all fit in the beam"}.`,
        nodes: SS.nodeMap(P, states, badges), edges: Studio.gs.edges(P),
        lists: [{ label: `BEAM (layer ${L.k + 1})`, items: L.kept.map(x => ({ text: `${x.id} g=${fmt(x.g)} f=${fmt(x.f)}`, state: "open" })) }, { label: "CUT BY WIDTH", items: L.cut.map(x => ({ text: `${x.id} f=${fmt(x.f)}`, state: "pruned" })) }],
        table: { title: "layers", columns: ["layer", "expanded", "kept", "cut by width", "discarded f>U"], rows: row.slice(), rowStates: row.map((_, i) => (i === row.length - 1 ? "cur" : "")) },
        stats: [{ label: "beam stored", value: L.kept.length }, { label: "kept layers", value: L.cur.length + L.prev.length }, { label: "peak OPEN+CLOSED", value: L.kept.length + L.cur.length + L.prev.length }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
    });
    if (shownLayers.length > 14) rec.push({ caption: `${shownLayers.length - 14} more layers follow the same pattern (not drawn).`, nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P) });

    // recursion
    const solve = (s, t, U, depth, useH, r1pre) => {
      let width = w, r = r1pre || null;
      const h = useH ? hOf : zero;
      if (!r) {
        passes++; r = beam(s, t, U, h, width, null);
        while (!r.found && width < n) { width = Math.min(n, width * 2); widened++; passes++; r = beam(s, t, U, h, width, null); }
      }
      if (!r.found) { log.push([depth, `${s}→${t}`, `no path within U = ${fmt(U)} at width ${width}`, "–"]); return null; }
      const C = r.cost, L = r.best.k;
      if (L <= 1) { log.push([depth, `${s}→${t}`, `cost ${fmt(C)}, ${L} move`, "none (direct)"]); return [s, t]; }
      const mid = Math.floor(L / 2);
      passes++; const r2 = beam(s, t, U, h, width, mid);
      const R = r2.best && r2.best.relay;
      if (!R || R === s || R === t) { log.push([depth, `${s}→${t}`, `cost ${fmt(C)}, ${L} moves`, "no relay found"]); return null; }
      relayStored = Math.max(relayStored, 1);
      const gR = r2.best.relayG;
      log.push([depth, `${s}→${t}`, `cost ${fmt(C)}, ${L} moves, width ${width}${width !== w ? " (widened)" : ""}`, `${R} (layer ${mid}, g=${fmt(gR)})`]);
      rec.push({ caption: `${depth === 0 ? "" : "· ".repeat(depth) + "Sub-problem: "}beam search ${s}→${t} (width ${width}) reached ${t} at cost ${fmt(C)} after ${L} layers. Rerunning with layer ${mid} nodes as relays: the best goal's relay is ${R} (g = ${fmt(gR)}). Solve ${s}→${R} (exact cost ${fmt(gR)}) and ${R}→${t} (exact cost ${fmt(C - gR)}) separately.`,
        nodes: SS.nodeMap(P, { [s]: "start", [t]: "goalcand", [R]: "current" }, { [R]: fmt(gR) }, { [R]: "relay" }), edges: Studio.gs.edges(P),
        table: { title: "recursion", columns: ["level", "search", "result", "relay"], rows: log.map(x => x.slice()) },
        stats: [{ label: "relay stored", value: R }, { label: "peak OPEN+CLOSED", value: peakTotal }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
      const left = solve(s, R, gR, depth + 1, false), right = left && solve(R, t, C - gR, depth + 1, false);
      return left && right ? left.concat(right.slice(1)) : null;
    };
    let path = solve(P.start, P.goal, ub.U, 0, true, r1), how = "Path rebuilt from relays", fallback = false;
    if (!path && ub.inc) { path = ub.inc.path; fallback = true; how = r1.found ? "The relay recursion failed" : `Beam width ${w} cut every route to ${P.goal} (the beam is incomplete)`; how += ", so the quick greedy solution that gave U is returned"; }
    if (!path) {
      rec.push({ caption: `Beam width ${w} lost every route to ${P.goal} (or no path exists within U = ${fmt(ub.U)}): no solution is reported. Try a wider beam.`, nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P),
        table: log.length ? { title: "recursion", columns: ["level", "search", "result", "relay"], rows: log } : undefined });
      return { steps: rec.steps, result: { found: false, w, passes, peakOpen, peakClosed, peakTotal, astarPeakTotal: base.peakTotal } };
    }
    const cost = Studio.gs.pathCost(P, path);
    rec.push({ caption: `${how}: ${path.join(" – ")}, cost ${fmt(cost)}, from ${passes} beam passes${widened ? ` (${widened} widening${widened > 1 ? "s" : ""} to re-find a half)` : ""}. Peak stored nodes ${peakTotal} (A* ${base.peakTotal}); no parent pointers and only one relay at a time were kept.`,
      nodes: SS.nodeMap(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      table: log.length ? { title: "recursion", columns: ["level", "search", "result", "relay"], rows: log } : undefined,
      stats: [{ label: "path cost", value: fmt(cost), state: "ok" }, { label: "w", value: w }, { label: "peak OPEN+CLOSED", value: peakTotal }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
    return { steps: rec.steps, result: { found: true, path, cost, w, passes, widened, fallback, U: ub.U, peakOpen, peakClosed, peakTotal, astarPeakOpen: base.peakOpen, astarClosed: base.peakClosed, astarPeakTotal: base.peakTotal } };
  },
});
