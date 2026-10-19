/* Alpha-Beta pruning: Minimax that skips subtrees which cannot change the decision. */
Studio.register({
  id: "game-alpha-beta",
  name: "Alpha-Beta pruning",
  family: "Game playing",
  week: 7,
  problem: "game",
  order: 20,
  summary: "Carry a window (α, β): α is the best value MAX can already guarantee, β the best MIN can guarantee. When α ≥ β at a node, the remaining children cannot matter and are pruned.",
  pseudocode: `AlphaBeta(N, α, β):
    if N is a leaf: return e(N)
    if N is MAX:
        for each child C: α ← max(α, AlphaBeta(C, α, β)); if α ≥ β: prune the rest (β cut-off)
        return α
    if N is MIN:
        for each child C: β ← min(β, AlphaBeta(C, α, β)); if α ≥ β: prune the rest (α cut-off)
        return β
call AlphaBeta(root, −∞, +∞)`,
  complexity: "Best case O(b^(d/2)) with perfect ordering, worst case O(b^d)",
  learn: {
    "intro": "Alpha-beta gives the same answer as minimax while skipping parts of the tree that cannot change the decision. If you already know a move gives you 3, you can stop examining another move as soon as you see the opponent can hold you to 2 there.",
    "definition": "Pass a window (α, β) down the tree. α is the best value MAX is already guaranteed, β the best value MIN is guaranteed. At a MAX node raise α; at a MIN node lower β; as soon as α ≥ β, prune the remaining children.",
    "steps": [
      [
        "call AlphaBeta(root, −∞, +∞)",
        ""
      ],
      [
        "MAX: α ← max(α, child value)",
        "MAX's guarantee can only rise."
      ],
      [
        "MIN: β ← min(β, child value)",
        "MIN's guarantee can only fall."
      ],
      [
        "α ≥ β: prune",
        "β cut-off at a MAX node, α cut-off at a MIN node."
      ]
    ],
    "formulas": [
      {
        "f": "prune when α ≥ β",
        "read": "the window is empty",
        "why": "MIN above will never allow a value ≥ β, and MAX above already has α: nothing in this subtree can affect the root."
      },
      {
        "f": "best case ≈ b^(d/2) leaves",
        "read": "with perfect move ordering",
        "why": "Good ordering lets each MIN node be refuted by its first child, effectively doubling the search depth for the same work."
      }
    ],
    "why": "Always returns the minimax value. How much it prunes depends on move ordering: try the 'best first' and 'worst first' settings.",
    "traps": [
      "Pruned subtrees are never evaluated: count leaves carefully.",
      "The value returned at a pruned node is a bound, not an exact value; only the root's value is exact."
    ],
    "props": {
      "complete": "yes",
      "optimal": "same value as minimax",
      "time": "O(b^(d/2)) best, O(b^d) worst",
      "space": "O(b·d)"
    }
  },
  params: [{ key: "order", label: "Child order", type: "select", default: "given", options: [["given", "as given (left to right)"], ["best", "best first (perfect ordering)"], ["worst", "worst first"]] }],
  run(P, { order }) {
    const steps = [], val = {}, seen = new Set(), pruned = new Set(), rows = [];
    let leaves = 0;
    const mmv = {}; const mm = id => { const n = P.nodes[id]; if (!n.children.length) return (mmv[id] = n.value); const vs = n.children.map(mm); return (mmv[id] = n.player === "MAX" ? Math.max(...vs) : Math.min(...vs)); }; mm(P.root);
    const kidsOf = id => { const n = P.nodes[id], k = n.children.slice(); if (order === "given") return k; const better = (a, b) => (n.player === "MAX" ? mmv[b] - mmv[a] : mmv[a] - mmv[b]); return k.sort(order === "best" ? better : (a, b) => -better(a, b)); };
    const fmt = v => (v === Infinity ? "+∞" : v === -Infinity ? "−∞" : v);
    const window = {};
    const snap = (cur, cap) => {
      const nodes = {};
      P.ids.forEach(id => { nodes[id] = { state: pruned.has(id) ? "pruned" : seen.has(id) ? (P.nodes[id].children.length ? "closed" : "visited") : "plain", badge: id in val && P.nodes[id].children.length ? val[id] : undefined, sub: window[id] && P.nodes[id].children.length ? `α${fmt(window[id][0])} β${fmt(window[id][1])}` : undefined }; });
      if (cur) nodes[cur] = Object.assign({}, nodes[cur], { state: "current" });
      const edges = P.ids.filter(i => P.nodes[i].parent && pruned.has(i)).map(i => ({ u: P.nodes[i].parent, v: i, state: "rejected" }));
      steps.push({ caption: cap, nodes, edges, table: { title: "events", columns: ["node", "α", "β", "event"], rows: rows.slice(-14), rowStates: rows.slice(-14).map((r, i, a) => (/cut/.test(r[3]) ? "bad" : i === a.length - 1 ? "cur" : "")) },
        stats: [{ label: "leaves evaluated", value: leaves }, { label: "pruned leaves", value: P.leaves.filter(l => pruned.has(l)).length }] });
    };
    const markPruned = id => { pruned.add(id); P.nodes[id].children.forEach(markPruned); };
    const ab = (id, a, b) => {
      const n = P.nodes[id]; seen.add(id); window[id] = [a, b];
      if (!n.children.length) { leaves++; val[id] = n.value; return n.value; }
      const kids = kidsOf(id);
      for (let k = 0; k < kids.length; k++) {
        const v = ab(kids[k], a, b);
        if (n.player === "MAX") a = Math.max(a, v); else b = Math.min(b, v);
        window[id] = [a, b]; val[id] = n.player === "MAX" ? a : b;
        rows.push([id, fmt(a), fmt(b), `${kids[k]} returned ${v}`]);
        if (a >= b) {
          const rest = kids.slice(k + 1); rest.forEach(markPruned);
          rows.push([id, fmt(a), fmt(b), `${n.player === "MAX" ? "β" : "α"} cut-off${rest.length ? ": prune " + rest.join(",") : ""}`]);
          snap(id, `At ${n.player} ${id}: α=${fmt(a)} ≥ β=${fmt(b)} → ${rest.length ? "prune " + rest.join(", ") : "cut-off (no children left)"}`);
          return n.player === "MAX" ? a : b;
        }
        snap(id, `${n.player} ${id}: child ${kids[k]} = ${v}, window now (α ${fmt(a)}, β ${fmt(b)})`);
      }
      return n.player === "MAX" ? a : b;
    };
    snap(null, `AlphaBeta(${P.root}, −∞, +∞)`);
    const v = ab(P.root, -Infinity, Infinity);
    const pl = P.leaves.filter(l => pruned.has(l)).length;
    snap(null, `Value ${v} (same as Minimax). ${leaves} of ${P.leaves.length} leaves evaluated, ${pl} pruned.`);
    steps[steps.length - 1].stats.unshift({ label: "value", value: v, state: "ok" });
    return { steps, result: { value: v, leaves, pruned: pl } };
  },
});
