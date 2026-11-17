/* Frontier search (Korf, Zhou): best-first search with no CLOSED list; each OPEN node carries used-operator bits. */
Studio.register({
  id: "search-frontier",
  name: "Frontier Search",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 70,
  summary: "A* with no CLOSED list at all. Each OPEN node remembers which of its moves lead back to nodes already expanded (used-operator bits), so the parents are never regenerated. Memory is just the frontier.",
  pseudocode: `OPEN ← [(S, g=0, used={})]                 # no CLOSED list
while OPEN not empty
    N ← node with least f;  remove it
    if GoalTest(N): return its cost
    for each child C of N with g' = g(N) + k(N,C), if C is not in used(N):
        if C is on OPEN: used(C) ← used(C) ∪ {N};  if g' is lower, update g(C)
        else add (C, g', used = {N}) to OPEN
    (N itself is forgotten)`,
  complexity: "Memory: |OPEN| only; time the same as A* for a consistent h",
  learn: {
    intro: "In A* the CLOSED list does two jobs: it stops the search regenerating nodes it has already expanded, and it lets us rebuild the path. Frontier search replaces the first job with a few bits on each OPEN node, and drops CLOSED entirely. This is in the course's discussion of memory-saving search (frontier search and its divide and conquer version); the used-operator bits are shown here in their simplest form, so treat the exact bookkeeping as **supplementary**.",
    definition: "Each OPEN node stores the set of neighbours that have already been expanded and generated it (its used operators). When N is expanded it never generates a child in used(N). Children already on OPEN merge: the new parent is added to their used set and the cheaper g is kept. After expansion N is discarded. Because no expanded node is stored, the search returns the cost; the path needs a relay recursion (see Divide and Conquer Frontier Search).",
    steps: [
      ["N ← least f; goal test", "Same as A*."],
      ["skip children in used(N)", "Those are expanded nodes; this replaces the CLOSED check."],
      ["child on OPEN: add N to its used set", "So that the child will not regenerate N later."],
      ["forget N", "Only the frontier remains in memory."],
    ],
    formulas: [
      { f: "memory = |OPEN|", read: "there is no CLOSED list", why: "In grid-like graphs the frontier is a thin front, much smaller than everything expanded so far." },
      { f: "h consistent (h(N) ≤ k(N,M) + h(M))", read: "needed for correctness", why: "Then a node is expanded with its final g, so never needing to be reopened. Reversible moves (undirected graph) are also needed, so the used bit can be set." },
    ],
    why: "A* minus its biggest list. It trades away the path: on its own it can only report the cost, and DCFS or DC-BFHS recover the path.",
    traps: ["With an inconsistent heuristic a node may need reopening, which frontier search cannot do.", "Only for undirected graphs here: a directed edge has no 'reverse operator' to mark as used.", "To print the path this tracer carries the path along with each OPEN node. That is for the display only and is not counted in the memory figures."],
    props: { complete: "yes", optimal: "yes with admissible, consistent h", time: "same as A*", space: "OPEN only" },
  },
  params: [],
  run(P) {
    if (P.directed) throw new Error("Frontier search is limited to undirected graphs (it needs reversible moves for the used bits)");
    const SS = Studio.spaceSaving, { fmt, H, byF } = SS;
    const rec = SS.recorder(), base = SS.astarBase(P);
    const OPEN = new Map([[P.start, { id: P.start, g: 0, f: H(P, P.start), used: new Set(), trail: [P.start] }]]);
    let peak = 1, expanded = 0, skipped = 0, goal = null; const gone = new Set();
    const snap = (cap, cur, skip) => {
      const states = {}; gone.forEach(i => (states[i] = "dim")); OPEN.forEach((_, i) => (states[i] = "open")); if (cur) states[cur.id] = "current"; if (!states[P.goal]) states[P.goal] = "goalcand";
      const badges = {}; OPEN.forEach(x => (badges[x.id] = fmt(x.g)));
      rec.push({ caption: cap, nodes: SS.nodeMap(P, states, badges), edges: Studio.gs.edges(P),
        lists: [{ label: "OPEN (with used-operator bits)", items: [...OPEN.values()].sort(byF).map(x => ({ text: `(${x.id}, g=${fmt(x.g)}, f=${fmt(x.f)}, used {${[...x.used].sort().join(",")}})`, state: "open" })) },
          { label: "CLOSED", items: [{ text: "none: not stored", state: "dim" }] }],
        stats: SS.memStats(OPEN.size, 0, peak, base, [{ label: "regenerations blocked", value: skipped }]) });
    };
    rec.push({ caption: "Frontier search has no CLOSED list. Every OPEN node carries used bits (the neighbours already expanded) so that an expanded node is never regenerated.",
      nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P), stats: [{ label: "A* peak CLOSED", value: base.peakClosed }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
    while (OPEN.size) {
      let N = null; for (const x of OPEN.values()) if (!N || byF(x, N) < 0) N = x;
      OPEN.delete(N.id);
      if (N.id === P.goal) { goal = N; break; }
      expanded++; gone.add(N.id);
      const blocked = [], notes = [];
      for (const [c, w] of P.adj[N.id]) {
        if (N.used.has(c)) { blocked.push(c); skipped++; continue; }
        const g2 = N.g + w, o = OPEN.get(c);
        if (o) { o.used.add(N.id); if (g2 < o.g - SS.EPS) { o.g = g2; o.f = g2 + H(P, c); o.trail = N.trail.concat(c); notes.push(`${c} cheaper via ${N.id}`); } else notes.push(`${c} already on OPEN: used += ${N.id}`); }
        else OPEN.set(c, { id: c, g: g2, f: g2 + H(P, c), used: new Set([N.id]), trail: N.trail.concat(c) });
      }
      peak = Math.max(peak, OPEN.size);
      snap(`Pick ${N.id} (f = ${fmt(N.f)}) and expand it, then forget it. ${blocked.length ? `${blocked.join(", ")} ${blocked.length > 1 ? "are" : "is"} in used(${N.id}) (already expanded), so not regenerated: this is what CLOSED would have done.` : "No child was blocked by a used bit."}${notes.length ? " " + notes.join("; ") + "." : ""}`, N);
    }
    if (!goal) { rec.push({ caption: "OPEN is empty: no path to the goal", nodes: SS.nodeMap(P), edges: Studio.gs.edges(P) }); return { steps: rec.steps, result: { found: false, expanded } }; }
    const path = goal.trail, cost = Studio.gs.pathCost(P, path);
    rec.push({ caption: `Goal ${P.goal} picked from OPEN: cost ${fmt(cost)} (path ${path.join(" – ")} printed from a trail carried only for display). Peak OPEN ${peak}, CLOSED always 0; A* peaked at ${base.peakClosed} closed + ${base.peakOpen} open.`,
      nodes: SS.nodeMap(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      stats: [{ label: "path cost", value: fmt(cost), state: "ok" }, { label: "peak OPEN", value: peak }, { label: "peak CLOSED", value: 0 }, { label: "A* peak CLOSED", value: base.peakClosed }] });
    return { steps: rec.steps, result: { found: true, path, cost, expanded, peakOpen: peak, peakClosed: 0, peakTotal: peak, astarPeakOpen: base.peakOpen, astarClosed: base.peakClosed, astarPeakTotal: base.peakTotal } };
  },
});
