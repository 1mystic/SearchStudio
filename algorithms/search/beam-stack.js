/* Beam Stack Search (supplementary: Zhou & Hansen, 2005): layered beam search made complete and optimal by backtracking. */
Studio.register({
  id: "search-beam-stack",
  name: "Beam Stack Search",
  family: "Graph search · space saving",
  week: 6,
  problem: "graph",
  order: 40,
  summary: "Beam search with memory of what it threw away. Each layer keeps its w best nodes by f, and a beam stack records the range of f values [lo, hi) each layer has covered. After a layer is exhausted the search backtracks to the deepest layer with unexplored f values, so it is eventually complete and optimal.",
  pseudocode: `U ← cost of a quick solution (greedy) or a given bound
layer 0 ← [S];  beam stack ← [ [lo=−∞, hi=∞) per layer ]
loop
    if a node of the current layer is the goal and g < U: remember it, U ← g
    candidates ← children of the layer with f ≤ U and f in [lo, hi) of the next layer's stack item
    if more than w candidates: keep the w with least f, set hi of that item to the f of the best discarded one
    if the next layer is non-empty: go down one layer
    else BACKTRACK: pop to the deepest layer whose hi < U;  lo ← hi, hi ← ∞;  rebuild that layer
    stop when no layer has hi left to explore
return the best goal found`,
  complexity: "Memory O(w · depth) stored nodes; time up to exponential, A*-like for wide beams",
  learn: {
    intro: "Plain beam search forgets nodes outside the beam and can miss the goal. Beam stack search keeps a small record of what was forgotten: for every layer, the interval of f values it has already covered. When the search runs dry it backtracks and goes after the part of f-space it skipped. **Supplementary:** this is Zhou and Hansen's algorithm; it is not in the lecture slides.",
    definition: "Layer k holds nodes reached with k moves, at most w of them. The beam stack has one item [lo, hi) per layer. Children of layer k go to layer k+1 only if f is in [lo, hi) and f ≤ U. If there are more than w, the w with least f survive and hi becomes the f of the best node dropped. When a layer has no children (dead end or goal), backtrack to the deepest layer with hi < U, set lo ← hi and hi ← ∞, and rebuild that layer from the one above. Ties in f are broken alphabetically, so the intervals are over (f, name) pairs and the search always terminates.",
    steps: [
      ["layer 0 ← [S], stack item [−∞, ∞)", ""],
      ["candidates in [lo, hi) with f ≤ U", "The stack says which f values this layer still owes us."],
      ["keep w best; hi ← f of best dropped", "What was dropped is remembered as the part of f-space not yet searched."],
      ["empty layer: backtrack, lo ← hi, hi ← ∞", "Searches the next slice of f-values at the deepest layer that has one."],
    ],
    formulas: [
      { f: "stored nodes ≤ w · (layers)", read: "each layer holds at most w nodes", why: "The beam width bounds the memory regardless of the graph." },
      { f: "layer k item = [lo_k, hi_k)", read: "f-values already covered up to hi_k", why: "Every dropped node has f ≥ hi_k, so once all slices are searched nothing with f ≤ U is missed; with admissible h the optimum is found." },
    ],
    why: "A wide enough beam makes it behave like A*; w = 1 turns it into depth-first-like backtracking. Memory stays small either way, so it trades time for space.",
    traps: ["With w = 1 it can revisit the same node many times.", "A bound U that is too low prunes the solution; the greedy bound is always safe.", "The cost equals UCS/A* only when h is admissible; with an inadmissible h it returns the best path it saw, which may not be optimal.", "Cycles are avoided here by never generating a node that is already on its own path."],
    props: { complete: "yes (with backtracking)", optimal: "yes with admissible h", time: "up to exponential", space: "O(w · depth)" },
  },
  params: [{ key: "w", label: "Beam width w", type: "int", default: 2, min: 1, max: 8 }, { key: "U", label: "Upper bound U (0 = from a greedy run)", type: "number", default: 0 }],
  run(P, { w, U: given }) {
    const SS = Studio.spaceSaving, { fmt, EPS } = SS;
    w = Math.max(1, +w || 2);
    const rec = SS.recorder(), base = SS.astarBase(P), ub = SS.getU(P, +given || 0);
    let U = ub.U, best = ub.inc ? { path: ub.inc.path, cost: ub.inc.cost, quick: true } : null;
    const cmp = (a, b) => (a.f - b.f) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const key = n => ({ f: n.f, id: n.id });
    const kcmp = (a, b) => (a.f - b.f) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const kfmt = k => (k === null ? null : `${fmt(k.f)}(${k.id})`);
    const layers = [[{ id: P.start, g: 0, f: SS.H(P, P.start), par: null }]], B = [{ lo: null, hi: null }];
    let l = 0, peak = 1, backtracks = 0, expanded = 0;
    const isAnc = (n, c) => { for (let x = n; x; x = x.par) if (x.id === c) return true; return false; };
    const stored = () => layers.reduce((a, x) => a + x.length, 0);
    const stackItems = () => B.map((b, i) => ({ text: `layer ${i}: [${b.lo ? kfmt(b.lo) : "−∞"}, ${b.hi ? kfmt(b.hi) : "∞"})`, state: i === l + 1 ? "current" : "open" })).reverse();
    const snap = (cap, extra = {}) => {
      const states = {}; layers.forEach((L, i) => L.forEach(n => (states[n.id] = i < l ? "closed" : "open"))); (layers[l] || []).forEach(n => (states[n.id] = "current"));
      (extra.dropped || []).forEach(n => { if (!states[n.id]) states[n.id] = "pruned"; }); (extra.prunedU || []).forEach(id => { if (!states[id]) states[id] = "pruned"; });
      if (!states[P.goal]) states[P.goal] = "goalcand";
      const badges = {}; layers.forEach(L => L.forEach(n => (badges[n.id] = fmt(n.g))));
      rec.push({ caption: cap, nodes: SS.nodeMap(P, states, badges), edges: Studio.gs.edges(P, best && !best.quick ? best.path : []),
        lists: [{ label: "BEAM STACK (top first)", items: stackItems() },
          { label: "LAYERS", items: layers.map((L, i) => ({ text: `layer ${i}: ${L.map(n => `${n.id}(g=${fmt(n.g)},f=${fmt(n.f)})`).join(" ")}`, state: i === l ? "current" : "closed" })).reverse() }]
          .concat(extra.dropped && extra.dropped.length ? [{ label: "DROPPED (beam full)", items: extra.dropped.map(n => ({ text: `${n.id} f=${fmt(n.f)}`, state: "pruned" })) }] : []),
        stats: [{ label: "stored nodes", value: stored() }, { label: "peak stored", value: peak }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }, { label: "U", value: fmt(U) }, { label: "backtracks", value: backtracks }] });
    };
    rec.push({ caption: `${ub.how}. Beam width w = ${w}. Each layer keeps at most ${w} nodes; the beam stack remembers which f-values each layer has not covered yet.`,
      nodes: SS.nodeMap(P, { [P.start]: "start", [P.goal]: "goalcand" }), edges: Studio.gs.edges(P), stats: [{ label: "w", value: w }, { label: "U", value: fmt(U) }] });
    for (let guard = 0; guard < 200000; guard++) {
      const cur = layers[l];
      for (const n of cur.slice().sort(cmp)) if (n.id === P.goal && (best ? n.g < best.cost - EPS : n.g <= U + EPS)) {
        best = { path: SS.pathOf(n), cost: n.g }; U = n.g;
      }
      const item = B[l + 1] || (B[l + 1] = { lo: null, hi: null });
      const cand = new Map(), prunedU = []; let outside = 0;
      for (const n of cur) {
        if (n.id === P.goal) continue;
        expanded++;
        for (const [c, wt] of P.adj[n.id]) {
          const g2 = n.g + wt, f2 = g2 + SS.H(P, c);
          if (f2 > U + EPS) { prunedU.push(c); continue; }
          if (isAnc(n, c)) continue;
          const ex = cand.get(c); if (!ex || g2 < ex.g) cand.set(c, { id: c, g: g2, f: f2, par: n });
        }
      }
      let list = [...cand.values()];
      const inRange = n => (!item.lo || kcmp(key(n), item.lo) >= 0) && (!item.hi || kcmp(key(n), item.hi) < 0);
      const total = list.length; list = list.filter(inRange).sort(cmp); outside = total - list.length;
      let dropped = [];
      if (list.length > w) { item.hi = key(list[w]); dropped = list.slice(w); list = list.slice(0, w); }
      layers.length = l + 1; layers.push(list);
      peak = Math.max(peak, stored());
      const goalNote = cur.some(n => n.id === P.goal) ? ` The goal is in layer ${l}; U is now ${fmt(U)}.` : "";
      if (list.length) {
        snap(`Layer ${l} → layer ${l + 1}: ${total} candidate${total === 1 ? "" : "s"}${outside ? `, ${outside} outside [${item.lo ? kfmt(item.lo) : "−∞"}, …) or already covered` : ""}; keep the ${list.length} with least f${dropped.length ? `, drop ${dropped.map(n => n.id).join(", ")} and record hi = ${kfmt(item.hi)} so they are searched later by backtracking` : ""}.${goalNote}`, { dropped, prunedU });
        l++; continue;
      }
      // backtrack
      let j = null;
      for (let i = layers.length - 1; i >= 1; i--) if (B[i] && B[i].hi && B[i].hi.f <= U + EPS) { j = i; break; }
      snap(`Layer ${l + 1} is empty (${total ? "everything was outside the covered f-range or pruned by U" : cur.some(n => n.id === P.goal) ? "the goal has no children" : "dead end: every child is pruned by U or already on the path"}).${goalNote} ${j === null ? "No layer has uncovered f-values below U: the search is complete." : `Backtrack to layer ${j}: its hi = ${kfmt(B[j].hi)} is still ≤ U = ${fmt(U)}.`}`, { dropped, prunedU });
      if (j === null) break;
      backtracks++;
      B[j].lo = B[j].hi; B[j].hi = null; B.length = j + 1; layers.length = j; l = j - 1;
    }
    if (!best) { rec.push({ caption: `No path found within U = ${fmt(U)}`, nodes: SS.nodeMap(P), edges: Studio.gs.edges(P) }); return { steps: rec.steps, result: { found: false, expanded } }; }
    const path = best.path, cost = Studio.gs.pathCost(P, path);
    rec.push({ caption: `Search complete after ${backtracks} backtrack${backtracks === 1 ? "" : "s"}: ${best.quick ? "no layer ever beat the quick solution " : "best path "}${path.join(" – ")}, cost ${fmt(cost)}. Peak stored nodes ${peak} (A* peak OPEN+CLOSED ${base.peakTotal}).`,
      nodes: SS.nodeMap(P, Object.fromEntries(path.map(p => [p, p === P.goal ? "goal" : "path"]))), edges: Studio.gs.edges(P, path),
      stats: [{ label: "path cost", value: fmt(cost), state: "ok" }, { label: "peak stored", value: peak }, { label: "A* peak OPEN+CLOSED", value: base.peakTotal }, { label: "backtracks", value: backtracks }] });
    return { steps: rec.steps, result: { found: true, path, cost, expanded, backtracks, U: ub.U, w, peakTotal: peak, astarPeakTotal: base.peakTotal, astarClosed: base.peakClosed } };
  },
});
