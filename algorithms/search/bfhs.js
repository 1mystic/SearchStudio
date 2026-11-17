/* Breadth First Heuristic Search (supplementary: Zhou & Hansen, 2004) and its divide-and-conquer form DC-BFHS.
 * Both use Studio.spaceSaving.bfhsCore (defined in a-star-ub.js). */
Studio.register({
  id: "search-bfhs",
  name: "Breadth First Heuristic Search (BFHS)",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 30,
  summary: "Expand the graph layer by layer like breadth-first search, but never generate a node with f = g + h above an upper bound U. Only the boundary (the last two layers) is kept in CLOSED, older layers are deleted. With admissible h the cost equals A*'s.",
  pseudocode: `U ← cost of a quick solution (greedy) or a given bound
layer0 ← [S]
while the current layer is not empty
    for each node N in the layer (least f first)
        if GoalTest(N) and g(N) < U: remember N, U ← g(N)
        else for each child C:  if g(C) + h(C) > U: discard
                                 elif C is already in the current, previous or next layer with g ≤ g(C): skip
                                 else put C in the next layer
    delete the layer before the previous one          # keep only the boundary
    move to the next layer
return the best goal found (or the quick solution)`,
  complexity: "Time ≈ A* (it may expand nodes with f = C* that A* skips); memory: two layers plus one generated layer",
  learn: {
    intro: "A* remembers every node it has expanded. Breadth First Heuristic Search borrows breadth-first search's layering: it knows that a node can only be regenerated from a neighbouring layer, so older layers can be thrown away. An upper bound U on f keeps the layers narrow. **Supplementary:** BFHS is from Zhou and Hansen's work on memory-bounded graph search; it is beyond the lecture slides.",
    definition: "Layer k holds the nodes reached with k moves. Expand layer k completely to build layer k+1. A child is discarded if f = g + h > U. Duplicate detection looks only at the current layer, the previous layer and the layer being built, which is enough on undirected graphs and means all earlier layers can be deleted. When a goal is picked with g < U, U shrinks to g. The search ends when a layer is empty.",
    steps: [
      ["U ← greedy cost", "A real solution gives a valid bound."],
      ["expand the whole layer", "Unlike A*, nodes are not picked one at a time across layers."],
      ["if f(C) > U: discard", "With admissible h such a node cannot be on a cheaper path."],
      ["delete the layer before the previous one", "The boundary of two layers is enough for duplicate detection."],
    ],
    formulas: [
      { f: "CLOSED = layers k and k−1", read: "only the boundary is stored", why: "Every neighbour of a layer-k node is in layer k−1, k or k+1 (in a graph of unit moves), so older layers can never be regenerated through duplicate detection." },
      { f: "discard C when g(C) + h(C) > U", read: "bound pruning", why: "It keeps the layers narrow and, with h ≤ h*, never discards the optimal path when U ≥ C*." },
    ],
    why: "BFHS stores far fewer expanded nodes than A* on graphs whose layers are narrow compared with the whole explored region. It pays with expanding every node with f ≤ U, even ones A* would never reach.",
    traps: ["Costs are compared across layers, so a node can be reached in a later layer with a lower g; this tracer keeps the cheaper copy only when it is still in a retained layer.", "A bad (large) U weakens the pruning but never breaks the answer.", "In the original BFHS no parent pointers are kept, so only the cost is known; here parent links are kept just to print the path. Divide and Conquer BFHS shows how to recover it without them."],
    props: { complete: "yes if U ≥ C*", optimal: "yes with admissible h", time: "A*-like", space: "two layers + one" },
  },
  params: [{ key: "U", label: "Upper bound U (0 = from a greedy run)", type: "number", default: 0 }],
  run(P, { U: given }) {
    const SS = Studio.spaceSaving, { fmt } = SS;
    const rec = SS.recorder(), base = SS.astarBase(P), ub = SS.getU(P, +given || 0);
    const rows = [], forgotten = new Set(); let peak = 0;
    rec.push({ caption: `${ub.how}. Layers are expanded breadth-first; a child with f > U is never generated, and only the last two layers stay in CLOSED.`,
      nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P), stats: [{ label: "U", value: fmt(ub.U) }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
    const res = SS.bfhsCore(P, P.start, P.goal, { U: ub.U, keepPar: true, onLayer(L) {
      peak = Math.max(peak, L.cur.length + L.prev.length + L.next.length);
      const states = {}; forgotten.forEach(x => (states[x] = "dim")); L.pruned.forEach(x => (states[x] = "pruned"));
      L.prev.forEach(n => (states[n.id] = "closed")); L.next.forEach(n => (states[n.id] = "open")); L.cur.forEach(n => (states[n.id] = "current")); states[P.goal] = states[P.goal] || "goalcand";
      const badges = {}; [...L.prev, ...L.cur, ...L.next].forEach(n => (badges[n.id] = fmt(n.g)));
      rows.push([L.k, L.cur.map(n => n.id).join(" "), L.next.map(n => n.id).join(" ") || "–", [...new Set(L.pruned)].join(" ") || "–", L.prev.length ? `layer ${L.k - 1}` : "–"]);
      const dropTxt = L.prev.length ? ` Layer ${L.k - 1} is still kept as boundary; once this layer is done it is deleted.` : "";
      const goalTxt = L.goals.length ? ` Goal ${P.goal} is in this layer with g = ${fmt(L.goals[0].g)}: U shrinks to ${fmt(L.goals[0].g)}.` : "";
      rec.push({ caption: `Expand layer ${L.k} (${L.cur.length} nodes) to build layer ${L.k + 1} (${L.next.length} nodes).${L.pruned.length ? ` ${[...new Set(L.pruned)].join(", ")} discarded: f > U = ${fmt(L.U)}.` : ""}${dropTxt}${goalTxt}`,
        nodes: SS.nodeMap(P, states, badges), edges: Studio.gs.edges(P),
        lists: [{ label: `OPEN (layer ${L.k + 1})`, items: L.next.map(n => ({ text: SS.pair(n), state: "open" })) },
          { label: "CLOSED (boundary: last two layers)", items: L.cur.concat(L.prev).map(n => ({ text: SS.pair(n), state: "closed" })) }],
        table: { title: "layers", columns: ["layer", "expanded", "generated", "discarded f>U", "boundary kept"], rows: rows.slice(), rowStates: rows.map((_, i) => (i === rows.length - 1 ? "cur" : "")) },
        stats: SS.memStats(L.next.length, L.cur.length + L.prev.length, peak, base, [{ label: "U", value: fmt(L.U) }]) });
      L.prev.forEach(n => forgotten.add(n.id)); L.prev.forEach(n => { if (L.cur.some(c => c.id === n.id) || L.next.some(c => c.id === n.id)) forgotten.delete(n.id); });
    } });
    let path = null, cost = null, how = "";
    if (res.found) { path = SS.pathOf(res.best); cost = Studio.gs.pathCost(P, path); how = `The last layer is empty; the best goal found has cost ${fmt(cost)}`; }
    else if (ub.inc) { path = ub.inc.path; cost = Studio.gs.pathCost(P, path); how = "Every layer was pruned by U (h overestimates somewhere), so the quick solution is returned"; }
    if (!path) { rec.push({ caption: `No path with f ≤ U = ${fmt(ub.U)}`, nodes: SS.nodeMap(P), edges: Studio.gs.edges(P) }); return { steps: rec.steps, result: { found: false } }; }
    rec.push({ caption: `${how}: path ${path.join(" – ")}. Peak CLOSED ${res.peakClosed} (A* ${base.peakClosed}); peak OPEN ${res.peakOpen} (A* ${base.peakOpen}).`,
      nodes: SS.nodeMap(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      stats: [{ label: "path cost", value: fmt(cost), state: "ok" }, { label: "peak CLOSED", value: res.peakClosed }, { label: "A* peak CLOSED", value: base.peakClosed }, { label: "peak OPEN", value: res.peakOpen }, { label: "A* peak OPEN", value: base.peakOpen }] });
    return { steps: rec.steps, result: { found: true, path, cost, expanded: res.expanded, U: ub.U, layers: res.layers, peakOpen: res.peakOpen, peakClosed: res.peakClosed, peakTotal: res.peakTotal, astarPeakOpen: base.peakOpen, astarClosed: base.peakClosed, astarPeakTotal: base.peakTotal } };
  },
});

Studio.register({
  id: "search-dc-bfhs",
  name: "Divide and Conquer BFHS (DC-BFHS)",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 35,
  summary: "BFHS keeps only boundary layers, so it cannot read the path back. DC-BFHS remembers a relay node from the middle layer of the best path, then solves start→relay and relay→goal as two smaller BFHS problems, recursively. No parent pointers are stored at all.",
  pseudocode: `DC-BFHS(S, T, U):
    run BFHS from S to T with bound U, no parent pointers      # gives cost C and the number of layers L
    if L ≤ 1: return [S, T]
    run it again, each node at layer ⌊L/2⌋ becoming its own relay and passing it on to descendants
    R ← the relay of the best goal, with g(R)
    return DC-BFHS(S, R, g(R)) ++ DC-BFHS(R, T, C − g(R))      # drop the repeated R`,
  complexity: "Memory: boundary layers only; time: about twice BFHS (the halves shrink geometrically)",
  learn: {
    intro: "Deleting layers saves memory but loses the parent pointers needed to print the path. Divide and Conquer BFHS keeps one thing instead: the middle node of the best path. Each half is then a smaller search of the same kind. **Supplementary:** from Zhou and Hansen; the relay idea matches Divide and Conquer Frontier Search from the course. The beam-search version (DC beam search) is not implemented here.",
    definition: "Run BFHS to find the optimal cost C and the layer count L. Run it again with every node on layer ⌊L/2⌋ acting as a relay: its descendants carry the relay's name and its g. The goal's relay R splits the problem into S→R (cost g(R)) and R→T (cost C − g(R)). Solve each recursively; in the sub-searches the exact cost is the upper bound U and h = 0 (the original h aims at T, not R).",
    steps: [
      ["BFHS S→T, no parents", "Gives the cost and the number of layers."],
      ["mark layer ⌊L/2⌋ nodes as relays", "Every descendant inherits its ancestor's relay."],
      ["R ← relay of the goal", "A node halfway along an optimal path."],
      ["solve S→R and R→T", "Exact costs are known, so U is exact in the halves."],
    ],
    formulas: [
      { f: "C = g(R) + cost(R→T)", read: "an optimal path through R splits into two optimal halves", why: "Each half of an optimal path is itself optimal, so solving the halves and joining them gives an optimal whole." },
      { f: "memory ≈ boundary layers of the largest sub-search", read: "no pointers, no deep layers", why: "The sub-searches run one at a time, so their memory is not added up." },
    ],
    why: "Shows how to get the path from a search that keeps almost nothing. The cost is a second pass per level of recursion.",
    traps: ["The relay must be recorded in the same run that finds the best goal; a different tie-break could give a different path and relay.", "A sub-search uses h = 0, so it expands more nodes than the first run did.", "The relay layer ⌊L/2⌋ is by number of moves, not by cost; on weighted graphs the halves can have unequal cost."],
    props: { complete: "yes if U ≥ C*", optimal: "yes with admissible h", time: "≈ 2 × BFHS", space: "boundary layers" },
  },
  params: [{ key: "U", label: "Upper bound U (0 = from a greedy run)", type: "number", default: 0 }],
  run(P, { U: given }) {
    const SS = Studio.spaceSaving, { fmt } = SS;
    const rec = SS.recorder(), base = SS.astarBase(P), ub = SS.getU(P, +given || 0);
    const log = []; let peakClosed = 0, peakOpen = 0, peakTotal = 0, passes = 0, fb = false;
    const zero = () => 0;
    const search = (s, t, U, useH, mid) => {
      passes++;
      const r = SS.bfhsCore(P, s, t, { U, h: useH ? undefined : zero, keepPar: false, relayLayer: mid });
      peakClosed = Math.max(peakClosed, r.peakClosed); peakOpen = Math.max(peakOpen, r.peakOpen); peakTotal = Math.max(peakTotal, r.peakTotal);
      return r;
    };
    const solve = (s, t, U, depth, useH) => {
      const r1 = search(s, t, U, useH, null);
      if (!r1.found) { log.push([depth, `${s}→${t}`, `no path within U = ${fmt(U)}`, "–"]); return null; }
      const C = r1.cost, L = r1.best.k;
      if (L <= 1) { log.push([depth, `${s}→${t}`, `cost ${fmt(C)}, ${L} move`, "none (direct)"]); return [s, t]; }
      let mid = Math.floor(L / 2), r2 = search(s, t, C, useH, mid);
      if (r2.found && !r2.best.relay) { mid = Math.floor(r2.best.k / 2); r2 = search(s, t, C, useH, mid); }
      const R = r2.best && r2.best.relay;
      if (!R || R === s || R === t) { fb = true; log.push([depth, `${s}→${t}`, `cost ${fmt(C)}, ${L} moves`, "no relay found"]); return null; }
      const gR = r2.best.relayG;
      log.push([depth, `${s}→${t}`, `cost ${fmt(C)}, ${L} moves, ${r1.peakClosed} boundary nodes`, `${R} (layer ${mid}, g=${fmt(gR)})`]);
      if (depth === 0) {
        rec.push({ caption: `BFHS ${s}→${t} found cost ${fmt(C)} in ${L} layers without storing parents. Rerunning with layer ${mid} nodes as relays: the goal's relay is ${R} (g = ${fmt(gR)}), so solve ${s}→${R} and ${R}→${t}.`,
          nodes: SS.nodeMap(P, { [s]: "start", [t]: "goalcand", [R]: "current" }, { [R]: fmt(gR) }, { [R]: "relay" }), edges: Studio.gs.edges(P),
          table: { title: "recursion", columns: ["level", "search", "result", "relay"], rows: log.map(x => x.slice()) },
          stats: [{ label: "peak CLOSED", value: peakClosed }, { label: "A* peak CLOSED", value: base.peakClosed }, { label: "peak OPEN", value: peakOpen }, { label: "A* peak OPEN", value: base.peakOpen }] });
      } else {
        rec.push({ caption: `${"· ".repeat(depth)}Sub-problem ${s}→${t} (exact cost ${fmt(C)}): relay ${R} at layer ${mid}; split into ${s}→${R} and ${R}→${t}.`,
          nodes: SS.nodeMap(P, { [s]: "start", [t]: "goalcand", [R]: "current" }, { [R]: fmt(gR) }, { [R]: "relay" }), edges: Studio.gs.edges(P),
          table: { title: "recursion", columns: ["level", "search", "result", "relay"], rows: log.map(x => x.slice()) },
          stats: [{ label: "peak CLOSED", value: peakClosed }, { label: "A* peak CLOSED", value: base.peakClosed }] });
      }
      const left = solve(s, R, gR, depth + 1, false), right = left && solve(R, t, C - gR, depth + 1, false);
      return left && right ? left.concat(right.slice(1)) : null;
    };
    rec.push({ caption: `${ub.how}. DC-BFHS finds the cost with BFHS, then rebuilds the path from middle-layer relay nodes, with no parent pointers stored.`,
      nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P), stats: [{ label: "U", value: fmt(ub.U) }, { label: "A* peak CLOSED", value: base.peakClosed }] });
    let path = solve(P.start, P.goal, ub.U, 0, true), how = "Path rebuilt from relays";
    if (!path && ub.inc) { path = ub.inc.path; how = "BFHS pruned everything with f > U (h overestimates), so the quick solution is returned"; }
    if (!path) { rec.push({ caption: `No path with f ≤ U = ${fmt(ub.U)}`, nodes: SS.nodeMap(P), edges: Studio.gs.edges(P) }); return { steps: rec.steps, result: { found: false } }; }
    const cost = Studio.gs.pathCost(P, path);
    rec.push({ caption: `${how}: ${path.join(" – ")}, cost ${fmt(cost)}, from ${passes} BFHS passes. Peak boundary CLOSED ${peakClosed} (A* ${base.peakClosed}).`,
      nodes: SS.nodeMap(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      table: { title: "recursion", columns: ["level", "search", "result", "relay"], rows: log },
      stats: [{ label: "path cost", value: fmt(cost), state: "ok" }, { label: "peak CLOSED", value: peakClosed }, { label: "A* peak CLOSED", value: base.peakClosed }, { label: "peak OPEN", value: peakOpen }, { label: "A* peak OPEN", value: base.peakOpen }] });
    return { steps: rec.steps, result: { found: true, path, cost, passes, noRelay: fb, U: ub.U, peakOpen, peakClosed, peakTotal, astarPeakOpen: base.peakOpen, astarClosed: base.peakClosed, astarPeakTotal: base.peakTotal } };
  },
});
