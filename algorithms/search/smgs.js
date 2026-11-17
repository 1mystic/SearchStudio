/* Smart Memory Graph Search: A* that deletes CLOSED nodes that can no longer be regenerated, keeping only the boundary
 * and the relay nodes that live nodes still need as ancestors. */
Studio.register({
  id: "search-smgs",
  name: "Smart Memory Graph Search (SMGS)",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 50,
  defaultExample: "graph-grid",
  summary: "A* that prunes CLOSED. A closed node whose neighbours have all been expanded can never be regenerated, so it is interior. Interior nodes are deleted, except relay nodes that still lie on the parent chain of a live node (OPEN or boundary), which are kept so the path can be read back.",
  pseudocode: `OPEN ← [(S, nil, 0)];  CLOSED ← empty
while OPEN not empty
    N ← node with least f;  remove it
    if GoalTest(N): return the path (follow parents through the kept nodes)
    move N to CLOSED;  generate children as in A*
    for each X in CLOSED:
        if every neighbour of X has been expanded:  X is interior
    live ← OPEN ∪ {CLOSED nodes that are not interior}      # the boundary
    relay ← interior nodes that are ancestors of a live node
    delete every interior node that is not a relay`,
  complexity: "Same time as A*; CLOSED holds only boundary + relay nodes",
  learn: {
    intro: "A* keeps every expanded node in CLOSED for two reasons: to avoid regenerating it, and to read the path back. A node whose neighbours have all been expanded can no longer be regenerated, so the first reason is gone. The second still holds for nodes on the way to the frontier. SMGS deletes the rest. The name and the idea of a boundary and relay nodes follow the lecture material on space-saving search; the exact deletion rule below is this site's reading of it, so treat the details as **supplementary**.",
    definition: "Run A*. After each expansion classify every CLOSED node. Boundary: at least one neighbour has not been expanded yet, so it may still be regenerated. Interior: all neighbours are expanded. A relay node is an interior node that is an ancestor, through parent pointers, of an OPEN or boundary node. Delete interior nodes that are not relays. The path to the goal is read from the nodes that remain.",
    steps: [
      ["N ← least f; goal test; expand", "Exactly A*."],
      ["boundary: some neighbour not expanded", "Must stay, it could be regenerated."],
      ["interior: all neighbours expanded", "Can never be regenerated: candidate for deletion."],
      ["relay: interior but an ancestor of a live node", "Kept so every live node's parent chain stays intact."],
    ],
    formulas: [
      { f: "|CLOSED| ≤ |boundary| + |relay|", read: "only the edge of the expanded region plus the needed ancestors", why: "Everything else is deleted, so on wide graphs CLOSED is a thin shell instead of a solid blob." },
    ],
    why: "Saves CLOSED memory at no cost in nodes expanded (on the 4×5 grid it deletes 9 nodes and the peak CLOSED falls from 19 to 17; the saving grows with the size of the graph). The relay rule is conservative: it keeps whole parent chains. Divide and conquer methods (DCFS, DC-BFHS) cut even those.",
    traps: ["If an h is inconsistent a node can be reopened with a better g; its deleted neighbours are simply regenerated as new nodes.", "Savings depend on the graph: on a tree or a path nearly every node stays a boundary or relay node."],
    props: { complete: "yes", optimal: "yes with admissible h", time: "same as A*", space: "boundary + relay nodes" },
  },
  params: [],
  run(P) {
    const SS = Studio.spaceSaving, { fmt, H, byF } = SS;
    const rec = SS.recorder(), base = SS.astarBase(P);
    const preds = Object.fromEntries(P.ids.map(i => [i, new Set()]));
    P.edges.forEach(([u, v]) => { preds[v].add(u); if (!P.directed) preds[u].add(v); });
    const OPEN = new Map([[P.start, { id: P.start, g: 0, f: H(P, P.start), par: null }]]), CLOSED = new Map(), expandedSet = new Set(), pruned = new Set();
    let peak = 1, peakClosed = 0, expanded = 0, totalPruned = 0, goal = null;
    const classify = () => {
      const interior = new Set(); for (const id of CLOSED.keys()) if ([...preds[id]].every(p => expandedSet.has(p))) interior.add(id);
      const needed = new Set();
      const walk = x => { for (let p = x.par; p; p = CLOSED.get(p)?.par ?? null) needed.add(p); };
      OPEN.forEach(walk); CLOSED.forEach((x, id) => { if (!interior.has(id)) walk(x); });
      return { interior, relay: new Set([...interior].filter(i => needed.has(i))), boundary: [...CLOSED.keys()].filter(i => !interior.has(i)) };
    };
    const snap = (cap, cur, cls, newly) => {
      const states = {}, subs = {}; pruned.forEach(i => (states[i] = "pruned"));
      cls.boundary.forEach(i => { states[i] = "closed"; subs[i] = "boundary"; }); cls.relay.forEach(i => { states[i] = "visited"; subs[i] = "relay"; });
      OPEN.forEach((_, i) => (states[i] = "open")); if (cur) states[cur.id] = "current"; if (!states[P.goal]) states[P.goal] = "goalcand";
      newly.forEach(i => (subs[i] = "pruned now"));
      const badges = {}; [...OPEN.values(), ...CLOSED.values()].forEach(x => (badges[x.id] = fmt(x.g)));
      const parents = {}; [...OPEN.values(), ...CLOSED.values()].forEach(x => { if (x.par) parents[x.id] = x.par; });
      const item = (x, s) => ({ text: `(${x.id},${x.par ?? "nil"},${fmt(x.g)})`, state: s });
      rec.push({ caption: cap, nodes: SS.nodeMap(P, states, badges, subs), edges: SS.treeEdges(P, parents),
        lists: [{ label: "OPEN", items: [...OPEN.values()].sort(byF).map(x => item(x, "open")) },
          { label: "CLOSED: boundary (kept, may be regenerated)", items: cls.boundary.map(i => item(CLOSED.get(i), "closed")) },
          { label: "CLOSED: relay (interior, kept for the path)", items: [...cls.relay].map(i => item(CLOSED.get(i), "visited")) },
          { label: "PRUNED from CLOSED (this step)", items: newly.map(i => ({ text: i, state: "pruned" })) }],
        stats: SS.memStats(OPEN.size, CLOSED.size, peak, base, [{ label: "pruned so far", value: totalPruned }]) });
    };
    rec.push({ caption: "SMGS runs A* but deletes CLOSED nodes that can no longer be regenerated. Boundary nodes (some neighbour not yet expanded) and relay nodes (ancestors of live nodes) stay.",
      nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P), stats: [{ label: "A* peak CLOSED", value: base.peakClosed }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
    while (OPEN.size) {
      let N = null; for (const x of OPEN.values()) if (!N || byF(x, N) < 0) N = x;
      OPEN.delete(N.id);
      if (N.id === P.goal) { goal = N; break; }
      CLOSED.set(N.id, N); expandedSet.add(N.id); expanded++;
      for (const [c, w] of P.adj[N.id]) {
        const g2 = N.g + w, f2 = g2 + H(P, c), o = OPEN.get(c), k = CLOSED.get(c);
        if (o) { if (g2 < o.g - SS.EPS) { o.g = g2; o.f = f2; o.par = N.id; } }
        else if (k) { if (g2 < k.g - SS.EPS) { CLOSED.delete(c); expandedSet.delete(c); OPEN.set(c, { id: c, g: g2, f: f2, par: N.id }); } }
        else { OPEN.set(c, { id: c, g: g2, f: f2, par: N.id }); pruned.delete(c); }
      }
      peak = Math.max(peak, OPEN.size + CLOSED.size); peakClosed = Math.max(peakClosed, CLOSED.size);
      const cls = classify();
      const newly = [...cls.interior].filter(i => !cls.relay.has(i));
      const before = { b: cls.boundary.slice(), r: [...cls.relay] };
      newly.forEach(i => { CLOSED.delete(i); pruned.add(i); totalPruned++; });
      snap(`Pick ${N.id} (f = ${fmt(N.f)}) and expand it. ${newly.length ? `All neighbours of ${newly.join(", ")} have been expanded, so ${newly.length > 1 ? "they cannot" : "it cannot"} be regenerated and ${newly.length > 1 ? "are" : "is"} deleted from CLOSED.` : "No closed node became interior and unneeded."} ${before.r.length ? `Relay kept: ${before.r.join(", ")} (still on the parent chain of a live node).` : ""} Boundary: ${before.b.join(", ") || "none"}.`, N, { ...cls, boundary: before.b, relay: cls.relay }, newly);
    }
    if (!goal) { rec.push({ caption: "OPEN is empty: no path to the goal", nodes: SS.nodeMap(P), edges: Studio.gs.edges(P) }); return { steps: rec.steps, result: { found: false, expanded } }; }
    const path = []; for (let x = goal; x; x = x.par ? CLOSED.get(x.par) : null) { path.unshift(x.id); if (x.par && !CLOSED.get(x.par)) throw new Error("SMGS lost an ancestor"); }
    const cost = Studio.gs.pathCost(P, path);
    rec.push({ caption: `Goal ${P.goal} picked from OPEN. The path ${path.join(" – ")} is read back through the nodes that were kept: cost ${fmt(cost)}. Peak CLOSED ${peakClosed} (A* ${base.peakClosed}), ${totalPruned} nodes deleted.`,
      nodes: SS.nodeMap(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      stats: [{ label: "path cost", value: fmt(cost), state: "ok" }, { label: "peak CLOSED", value: peakClosed }, { label: "A* peak CLOSED", value: base.peakClosed }, { label: "pruned", value: totalPruned }] });
    return { steps: rec.steps, result: { found: true, path, cost, expanded, pruned: totalPruned, peakClosed, peakTotal: peak, astarClosed: base.peakClosed, astarPeakTotal: base.peakTotal } };
  },
});
