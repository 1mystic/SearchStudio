/* A* with upper-bound pruning of OPEN (supplementary: Zhou & Hansen; the bound U idea).
 * This file also defines Studio.spaceSaving: helpers shared by the other Week 6 space-saving searches
 * (BFHS, Beam Stack, SMGS, Frontier, DC-BFHS). They are used only inside run(), so file order does not matter. */
(function (root) {
  const Studio = root.Studio;
  const EPS = 1e-9;
  const fmt = v => (v === Infinity ? "∞" : v === -Infinity ? "−∞" : String(Math.round(v * 100) / 100));
  const H = (P, id) => P.h[id] ?? 0;
  const byF = (a, b) => (a.f - b.f) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  /* quick greedy best-first (by h, CLOSED list, alphabetical ties): a cheap solution whose cost is an upper bound U */
  function greedyPath(P) {
    const OPEN = new Map([[P.start, { id: P.start, par: null }]]), CLOSED = new Map();
    while (OPEN.size) {
      let N = null; for (const x of OPEN.values()) if (!N || H(P, x.id) < H(P, N.id) || (H(P, x.id) === H(P, N.id) && x.id < N.id)) N = x;
      OPEN.delete(N.id); CLOSED.set(N.id, N);
      if (N.id === P.goal) { const p = []; for (let x = N; x; x = x.par) p.unshift(x.id); return p; }
      for (const [c] of P.adj[N.id]) if (!OPEN.has(c) && !CLOSED.has(c)) OPEN.set(c, { id: c, par: N });
    }
    return null;
  }
  /* U from the user (param > 0) or from the greedy path */
  function getU(P, given) {
    if (given > 0) return { U: given, inc: null, how: `U = ${fmt(given)} given` };
    const p = greedyPath(P);
    if (!p) return { U: Infinity, inc: null, how: "no greedy path, U = ∞" };
    const c = Studio.gs.pathCost(P, p);
    return { U: c, inc: { path: p, cost: c }, how: `U = ${fmt(c)} from the greedy path ${p.join("–")}` };
  }
  /* plain A* used only as the memory yardstick */
  function astarBase(P) {
    const OPEN = new Map([[P.start, { id: P.start, g: 0, f: H(P, P.start) }]]), CLOSED = new Map();
    let peakOpen = 1, peakClosed = 0, peakTotal = 1;
    while (OPEN.size) {
      let N = null; for (const x of OPEN.values()) if (!N || byF(x, N) < 0) N = x;
      OPEN.delete(N.id);
      if (N.id === P.goal) return { found: true, cost: N.g, expanded: CLOSED.size, peakOpen, peakClosed, peakTotal };
      CLOSED.set(N.id, N);
      for (const [c, w] of P.adj[N.id]) {
        const g2 = N.g + w, o = OPEN.get(c), k = CLOSED.get(c);
        if (o) { if (g2 < o.g - EPS) { o.g = g2; o.f = g2 + H(P, c); } }
        else if (k) { if (g2 < k.g - EPS) { CLOSED.delete(c); OPEN.set(c, { id: c, g: g2, f: g2 + H(P, c) }); } }
        else OPEN.set(c, { id: c, g: g2, f: g2 + H(P, c) });
      }
      peakOpen = Math.max(peakOpen, OPEN.size); peakClosed = Math.max(peakClosed, CLOSED.size); peakTotal = Math.max(peakTotal, OPEN.size + CLOSED.size);
    }
    return { found: false, cost: Infinity, expanded: CLOSED.size, peakOpen, peakClosed, peakTotal };
  }
  const memStats = (open, closed, peak, base, extra = []) => [
    { label: "|OPEN|", value: open }, { label: "|CLOSED|", value: closed }, { label: "peak OPEN+CLOSED", value: peak },
    { label: "A* peak OPEN+CLOSED", value: base.peakTotal }].concat(extra);
  const pair = (n, show = "g") => `(${n.id},${n.par ? (n.par.id ?? n.par) : "nil"},${fmt(show === "f" ? n.f : n.g)})`;
  const nodeMap = (P, states, badges, subs = {}) => { const m = Studio.gs.nodes(P, states, badges); for (const k of Object.keys(subs)) m[k].sub = subs[k]; return m; };
  const treeEdges = (P, parents, path) => Studio.gs.edges(P, path || [], Object.keys(parents).filter(k => parents[k]).map(k => ({ u: parents[k], v: k, state: "tree" })));
  const pathOf = n => { const p = []; for (let x = n; x; x = x.par) p.unshift(x.id); return p; };
  /* step recorder with a cap, so pathological runs stay small */
  const recorder = (cap = 700) => { const steps = []; let dropped = 0; return { steps, push(s) { if (steps.length < cap) steps.push(s); else dropped++; }, get dropped() { return dropped; } }; };

  /* Breadth-first heuristic search core. Layers are edge counts from s. Only the two latest layers are kept for duplicate
   * detection (the boundary); older layers are deleted. Nodes with f > U are never generated.
   * o: { U, h(id), keepPar, relayLayer, onLayer(info) } */
  function bfhsCore(P, s, t, o) {
    const h = o.h || (id => H(P, id));
    let U = o.U, best = null, expanded = 0, peakOpen = 0, peakClosed = 0, peakTotal = 0, k = 0, prev = [];
    let cur = [{ id: s, g: 0, f: h(s), par: null, k: 0, relay: null, relayG: 0 }];
    if (cur[0].f > U + EPS) cur = [];
    const accept = g => (best ? g < best.g - EPS : g <= U + EPS);
    while (cur.length) {
      cur.sort(byF);
      const next = new Map(), pruned = [], dups = [], goals = [];
      for (const n of cur) {
        if (n.id === t) { if (accept(n.g)) { best = n; U = n.g; goals.push(n); } continue; }
        expanded++;
        for (const [c, w] of P.adj[n.id]) {
          const g2 = n.g + w, f2 = g2 + h(c);
          if (f2 > U + EPS) { pruned.push(c); continue; }
          const same = next.get(c) || cur.find(x => x.id === c && x.g <= g2 + EPS) || prev.find(x => x.id === c && x.g <= g2 + EPS);
          if (same && same.g <= g2 + EPS) { dups.push(c); continue; }
          const isMid = o.relayLayer != null && k + 1 === o.relayLayer;
          next.set(c, { id: c, g: g2, f: f2, par: o.keepPar ? n : null, k: k + 1,
            relay: isMid ? c : n.relay, relayG: isMid ? g2 : n.relayG });
        }
      }
      const nextArr = [...next.values()].sort(byF);
      peakOpen = Math.max(peakOpen, nextArr.length); const closedNow = cur.length + prev.length;
      peakClosed = Math.max(peakClosed, closedNow); peakTotal = Math.max(peakTotal, nextArr.length + closedNow);
      if (o.onLayer) o.onLayer({ k, cur, prev, next: nextArr, pruned, dups, goals, U, best });
      prev = cur; cur = nextArr; k++;
    }
    return { found: !!best, best, cost: best ? best.g : Infinity, layers: k, expanded, peakOpen, peakClosed, peakTotal, U };
  }

  Studio.spaceSaving = { EPS, fmt, H, byF, greedyPath, getU, astarBase, memStats, pair, nodeMap, treeEdges, pathOf, recorder, bfhsCore };
})(typeof window !== "undefined" ? window : globalThis);

Studio.register({
  id: "search-astar-ub",
  name: "A* with upper-bound pruning of OPEN",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 20,
  defaultExample: "graph-dijkstra",
  summary: "A* that never puts a node with f > U on OPEN, where U is the cost of any known solution (here a quick greedy run, or a value you type). Those nodes cannot lie on a cheaper path when h is admissible, so OPEN stays smaller and the answer is unchanged.",
  pseudocode: `U ← cost of a quick solution (greedy by h) or a given bound
OPEN ← [(S, nil, 0)]
while OPEN not empty
    N ← node with least f = g + h;  remove it
    if GoalTest(N): return the path
    move N to CLOSED
    for each child C with g' = g(N) + k(N,C)
        if g' + h(C) > U: discard C  (never enters OPEN)
        else add / update C exactly as A* does
return the quick solution if OPEN empties (it was optimal or h was inadmissible)`,
  complexity: "Never more nodes on OPEN than A*; CLOSED unchanged",
  learn: {
    intro: "OPEN is where A* spends much of its memory. If we already know some solution of cost U, any node whose estimate f = g + h exceeds U cannot be on a cheaper solution (with an admissible h), so it is not worth storing. **Supplementary:** this is the bound used in Zhou and Hansen's space-saving A* variants; it is not in the lecture slides.",
    definition: "Run A* as usual, but when a child C is generated with f(C) = g(C) + h(C) > U, drop it instead of adding it to OPEN. U can be given or obtained cheaply, for instance from greedy best-first search. If OPEN becomes empty without reaching the goal, the quick solution that produced U is returned.",
    steps: [
      ["U ← greedy solution cost", "Any solution is an upper bound on the optimum."],
      ["N ← least f; goal test", "Same as A*: goal test happens when the node is picked."],
      ["if f(C) > U discard C", "With admissible h no better path goes through C."],
      ["OPEN empty: return the quick solution", "Only happens when U was already optimal, or when h overestimates."],
    ],
    formulas: [
      { f: "discard C when g(C) + h(C) > U", read: "the best possible cost through C is already worse than a known solution", why: "With h ≤ h*, g(C) + h(C) never overestimates the cheapest solution through C, so such a C cannot improve on U." },
      { f: "C* ≤ U", read: "the optimum is at most the bound", why: "U is the cost of a real solution. A bound below C* would wrongly discard every solution; the run then reports failure." },
    ],
    why: "A better bound prunes more: on the 'Dijkstra demo' graph the greedy bound U = 9 keeps peak OPEN at 2 where A* needs 3. The saving is on OPEN only: CLOSED is as large as in A*. Combine with CLOSED-pruning methods (BFHS, SMGS) for real savings.",
    traps: ["With an inadmissible h, a node with f > U may still lead to a cheaper path, so pruning can lose the optimum (the search then falls back to the quick solution).", "A bound that is too small yields no solution at all.", "Nodes with f = U are kept: they may still give a solution of cost exactly U."],
    props: { complete: "yes if U ≥ C*", optimal: "yes with admissible h and U ≥ C*", time: "at most A*'s", space: "OPEN smaller than A*, CLOSED same" },
  },
  params: [{ key: "U", label: "Upper bound U (0 = from a greedy run)", type: "number", default: 0 }],
  run(P, { U: given }) {
    const SS = Studio.spaceSaving, { fmt, H, byF } = SS;
    const rec = SS.recorder(), base = SS.astarBase(P);
    const ub = SS.getU(P, +given || 0); const U = ub.U;
    const OPEN = new Map([[P.start, { id: P.start, g: 0, f: H(P, P.start), par: null }]]), CLOSED = new Map(), discarded = new Set();
    let peak = 1, peakOpen = 1, peakClosed = 0, expanded = 0, discards = 0;
    const snap = (cap, cur, newly) => {
      const states = {}; discarded.forEach(d => (states[d] = "pruned")); CLOSED.forEach((_, id) => (states[id] = "closed")); OPEN.forEach((_, id) => (states[id] = "open"));
      if (cur) states[cur.id] = "current"; if (states[P.goal] === undefined) states[P.goal] = "goalcand";
      const badges = {}; for (const x of [...OPEN.values(), ...CLOSED.values()]) badges[x.id] = fmt(x.g);
      const parents = {}; for (const x of [...OPEN.values(), ...CLOSED.values()]) if (x.par) parents[x.id] = x.par.id;
      rec.push({ caption: cap, nodes: SS.nodeMap(P, states, badges), edges: SS.treeEdges(P, parents),
        lists: [{ label: "OPEN", items: [...OPEN.values()].sort(byF).map(x => ({ text: `(${x.id},${x.par ? x.par.id : "nil"},g=${fmt(x.g)},f=${fmt(x.f)})`, state: "open" })) },
          { label: "CLOSED", items: [...CLOSED.values()].map(x => ({ text: SS.pair(x), state: "closed" })) },
          { label: `DISCARDED (f > U = ${fmt(U)})`, items: (newly || []).map(x => ({ text: `${x.id}: f=${fmt(x.f)}`, state: "pruned" })) }],
        stats: SS.memStats(OPEN.size, CLOSED.size, peak, base, [{ label: "discarded so far", value: discards }]) });
    };
    rec.push({ caption: `${ub.how}. Nodes with f = g + h greater than U are discarded instead of joining OPEN.`, nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P),
      stats: [{ label: "U", value: fmt(U) }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }] });
    let goal = null;
    while (OPEN.size) {
      let N = null; for (const x of OPEN.values()) if (!N || byF(x, N) < 0) N = x;
      OPEN.delete(N.id);
      if (N.id === P.goal) { goal = N; break; }
      CLOSED.set(N.id, N); expanded++;
      const newly = [], notes = [];
      for (const [c, w] of P.adj[N.id]) {
        const g2 = N.g + w, f2 = g2 + H(P, c);
        if (f2 > U + SS.EPS) { newly.push({ id: c, f: f2 }); discarded.add(c); discards++; continue; }
        const o = OPEN.get(c), k = CLOSED.get(c);
        if (o) { if (g2 < o.g - SS.EPS) { o.g = g2; o.f = f2; o.par = N; notes.push(`${c} cheaper`); } }
        else if (k) { if (g2 < k.g - SS.EPS) { CLOSED.delete(c); OPEN.set(c, { id: c, g: g2, f: f2, par: N }); notes.push(`${c} reopened`); } }
        else { OPEN.set(c, { id: c, g: g2, f: f2, par: N }); discarded.delete(c); }
      }
      peak = Math.max(peak, OPEN.size + CLOSED.size); peakOpen = Math.max(peakOpen, OPEN.size); peakClosed = Math.max(peakClosed, CLOSED.size);
      snap(`Pick ${N.id} (least f = ${fmt(N.f)}) and expand it. ${newly.length ? `Discard ${newly.map(x => x.id).join(", ")}: f > U = ${fmt(U)}, so they can never beat a known solution.` : "No child exceeded U."}${notes.length ? " " + notes.join("; ") + "." : ""}`, N, newly);
    }
    let path, cost, how;
    if (goal) { path = SS.pathOf(goal); cost = Studio.gs.pathCost(P, path); how = `Goal ${P.goal} picked from OPEN`; }
    else if (ub.inc) { path = ub.inc.path; cost = Studio.gs.pathCost(P, path); how = "OPEN emptied (everything left had f > U): the quick solution is returned"; }
    if (!path) { rec.push({ caption: `OPEN is empty and no path was found within U = ${fmt(U)}`, nodes: SS.nodeMap(P), edges: Studio.gs.edges(P) }); return { steps: rec.steps, result: { found: false, expanded } }; }
    rec.push({ caption: `${how}: path ${path.join(" – ")}, cost ${fmt(cost)}. Peak OPEN ${peakOpen} (A* ${base.peakOpen}), ${discards} nodes discarded by the bound.`,
      nodes: SS.nodeMap(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      stats: SS.memStats(OPEN.size, CLOSED.size, peak, base, [{ label: "path cost", value: fmt(cost), state: "ok" }]) });
    return { steps: rec.steps, result: { found: true, path, cost, expanded, U, discarded: discards, peakOpen, peakClosed, peakTotal: peak, astarPeakOpen: base.peakOpen, astarClosed: base.peakClosed, astarPeakTotal: base.peakTotal } };
  },
});
