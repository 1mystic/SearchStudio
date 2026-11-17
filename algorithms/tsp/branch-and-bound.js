/* Branch and bound for the TSP: refinement search over include / exclude edge decisions. */
Studio.register({
  id: "tsp-branch-and-bound",
  name: "Branch & bound (exact)",
  family: "TSP · exact",
  week: 5,
  problem: "tsp",
  order: 10,
  maxSize: 9,
  summary: "Refine a set of tours by deciding one edge at a time: include it or exclude it. Every node gets the lower bound ½ Σ (two cheapest admissible edges at each city); a node whose bound is no better than the best tour found is pruned.",
  pseudocode: `best ← ∞ (or the cost of a known tour);  OPEN ← [root: no edge decided]
while OPEN is not empty
    N ← pick a node from OPEN                       # DFS: newest;  best-first: lowest bound
    LB(N) ← ½ · Σ over cities of the two cheapest admissible edges
             (included edges first; excluded edges, edges at a city that already has 2 included
              edges, and edges closing a short cycle are not admissible)
    if LB(N) ≥ best: prune N
    else if every city has 2 included edges: best ← cost (a complete tour)
    else  e ← cheapest undecided edge in the bound
          children: N + include e,  N + exclude e   (drop infeasible ones)
return best`,
  complexity: "O(n!) worst case, usually far less",
  learn: {
    intro: "Brute force looks at every tour. Branch and bound looks at families of tours: a node stands for 'every tour that contains these edges and avoids those edges', and a cheap lower bound says how good any tour in the family could possibly be. If even the optimistic bound cannot beat the best tour already found, the whole family is discarded unseen.",
    definition: "A node is a pair (included edges, excluded edges). Its lower bound is ½ Σ over cities of the cost of the two cheapest admissible edges at that city: every tour uses exactly two edges at each city, and each edge is counted from both ends, hence the half. Branching picks an undecided edge e and creates two children: include e and exclude e. A node is a complete tour when every city has two included edges.",
    steps: [
      ["N ← pick from OPEN", "Depth-first takes the newest node (include child first); best-first takes the node with the lowest bound."],
      ["LB(N) ← ½ Σ two cheapest admissible edges", "Included edges at a city come first, then the cheapest admissible others. Excluded edges, edges at a city that already has two included edges, and edges that would close a sub-cycle are skipped."],
      ["if LB(N) ≥ best: prune", "Every tour under N costs at least LB(N); if that is not below the best tour found, N cannot improve on it."],
      ["every city has 2 included edges", "The included edges form one Hamiltonian cycle: a complete tour whose cost equals the bound."],
      ["children: include e / exclude e", "Together they cover all the tours of N; a child that forces a city to degree 3, closes a short cycle, or leaves a city with fewer than two admissible edges is infeasible."],
    ],
    formulas: [
      { f: "LB = ½ Σ_c (e₁(c) + e₂(c))", read: "half the sum over cities of the two cheapest admissible edges at c", why: "Any tour has two edges at each city and each edge touches two cities, so its cost is half the sum of those per-city costs; choosing the cheapest two at every city can only lower that sum." },
      { f: "prune if LB ≥ best", read: "the optimistic cost is not below the incumbent", why: "No tour in this family can be strictly better than the best tour already found." },
    ],
    why: "The bound costs O(n²) per node but can remove huge subtrees. It is tight when the cheap edges at each city fit together into one tour, and weak when they do not, which is why the order in which edges are decided and a good first tour matter.",
    traps: [
      "The bound is half the sum, not the sum.",
      "An included edge counts for both of its cities; a city with two included edges contributes exactly those two.",
      "An edge at a city that already has two included edges is not admissible for its other end either.",
      "A bound can be a fraction (x.5); compare it with integer tour costs without rounding.",
      "Pruning depends on the best tour found so far. On Six cities depth-first picks 68 nodes, finds five successively better tours (238, 237, 233, 229, 224) and prunes 24 subtrees; best-first picks 49 nodes and finds only the optimum; depth-first with Initial best 229 picks 55. The Initial best must be above the optimum: below it no tour is found.",
    ],
    props: { complete: "yes", optimal: "yes", time: "O(n!) worst case", space: "O(n) per node, DFS" },
  },
  params: [
    { key: "order", label: "Node order", type: "select", default: "dfs", options: [["dfs", "Depth-first (include edge first)"], ["best", "Best-first (lowest bound)"]] },
    { key: "ub", label: "Initial best cost (0 = none)", type: "number", default: 0, help: "A known tour's cost lets the search prune from the start" },
    { key: "maxNodes", label: "Stop after nodes", type: "int", default: 400, min: 1, max: 2000 },
  ],
  run(P, { order, ub, maxNodes }) {
    const ids = P.ids, n = P.n, steps = [];
    const single = ids.every(c => c.length === 1), nm = (a, b) => (a < b ? [a, b] : [b, a]).join(single ? "" : "-");
    const E = []; ids.forEach((a, i) => ids.slice(i + 1).forEach(b => E.push({ a, b, name: nm(a, b), c: P.d(a, b) })));
    const byName = Object.fromEntries(E.map(e => [e.name, e]));
    const incident = Object.fromEntries(ids.map(c => [c, E.filter(e => e.a === c || e.b === c)]));
    const other = (e, c) => (e.a === c ? e.b : e.a);
    const cmp = (c) => (x, y) => x.c - y.c || (other(x, c) < other(y, c) ? -1 : 1);

    /* lower bound of the family (inc, exc): {ok, lb, rows, chosen, why} */
    const bound = (inc, exc) => {
      const deg = Object.fromEntries(ids.map(c => [c, 0])), par = Object.fromEntries(ids.map(c => [c, c])), size = Object.fromEntries(ids.map(c => [c, 1]));
      const find = x => (par[x] === x ? x : (par[x] = find(par[x])));
      for (const k of inc) {
        const e = byName[k]; deg[e.a]++; deg[e.b]++;
        if (deg[e.a] > 2) return { ok: false, why: `${e.a} would have 3 included edges` };
        if (deg[e.b] > 2) return { ok: false, why: `${e.b} would have 3 included edges` };
        const ra = find(e.a), rb = find(e.b);
        if (ra === rb) { if (size[ra] !== n) return { ok: false, why: `${k} closes a cycle through fewer than ${n} cities` }; }
        else { par[ra] = rb; size[rb] += size[ra]; }
      }
      const rows = [], chosen = new Set(); let total = 0;
      for (const c of ids) {
        const inc_c = incident[c].filter(e => inc.has(e.name)).sort(cmp(c));
        const avail = incident[c].filter(e => !inc.has(e.name) && !exc.has(e.name) && deg[c] < 2 && deg[other(e, c)] < 2 && (find(c) !== find(other(e, c)) || size[find(c)] === n)).sort(cmp(c));
        const need = 2 - deg[c];
        if (avail.length < need) return { ok: false, why: `${c} is left with only ${deg[c] + avail.length} admissible edge${deg[c] + avail.length === 1 ? "" : "s"}` };
        const pick = inc_c.concat(avail.slice(0, need));
        pick.forEach(e => chosen.add(e.name));
        const sum = pick.reduce((s, e) => s + e.c, 0); total += sum;
        rows.push({ c, pick, sum, nInc: inc_c.length });
      }
      return { ok: true, lb: total / 2, total, rows, chosen, complete: ids.every(c => deg[c] === 2) };
    };
    const tourOf = (inc) => {
      const adj = Object.fromEntries(ids.map(c => [c, []]));
      inc.forEach(k => { const e = byName[k]; adj[e.a].push(e.b); adj[e.b].push(e.a); });
      const t = [ids[0]]; let prev = null, cur = ids[0];
      while (t.length < n) { const nx = adj[cur].filter(x => x !== prev).sort()[0]; t.push(nx); prev = cur; cur = nx; }
      return t;
    };

    let id = 0;
    const mk = (parent, inc, exc, decision) => { const b = bound(inc, exc); return { id: ++id, parent, inc, exc, decision, b, lb: b.ok ? b.lb : Infinity }; };
    let best = ub > 0 ? ub : Infinity, bestTour = null, expanded = 0, pruned = 0, infeasible = 0, leaves = 0;
    const root = mk(0, new Set(), new Set(), "root");
    const open = [root], log = [];
    const fmt = (x) => (Number.isFinite(x) ? String(x) : "∞");
    const edgeDraw = (nd, extra = {}) => {
      const out = [];
      E.forEach(e => {
        if (nd.inc.has(e.name)) out.push({ u: e.a, v: e.b, state: extra.state || "tour", label: e.c });
        else if (nd.exc.has(e.name)) out.push({ u: e.a, v: e.b, state: "removed" });
        else if (extra.branch === e.name) out.push({ u: e.a, v: e.b, state: "candidate", label: e.c });
      });
      return out;
    };
    const openList = () => ({ label: "OPEN (node, bound)", items: open.map(x => ({ text: `#${x.id} ${fmt(x.lb)}`, state: x.lb >= best ? "closed" : "open" })) });
    const nodeTable = (nd) => {
      const b = nd.b, rows = b.rows.map(r => [r.c, ...[0, 1].map(i => r.pick[i] ? { t: `${r.pick[i].name} ${r.pick[i].c}`, s: i < r.nInc ? "ok" : "" } : "–"), r.sum]);
      rows.push(["Σ", "", "", `${b.total} → LB = ${b.total}/2 = ${b.lb}`]);
      return { title: `Node #${nd.id}: included {${[...nd.inc].join(",")}} excluded {${[...nd.exc].join(",")}}`, columns: ["city", "edge 1", "edge 2", "sum"], rows, rowStates: rows.map((_, i) => (i === rows.length - 1 ? "cur" : "")) };
    };
    const stats = () => [{ label: "best", value: fmt(best), state: Number.isFinite(best) ? "ok" : undefined }, { label: "expanded", value: expanded }, { label: "pruned", value: pruned }, { label: "OPEN", value: open.length }];
    const plain = (st = "plain") => Object.fromEntries(ids.map(c => [c, { state: st }]));

    steps.push({ caption: `Root node #1: nothing decided. Each city takes its two cheapest edges, total ${root.b.total}, so LB = ${root.b.total}/2 = ${root.b.lb}: no tour can cost less than ${Math.ceil(root.b.lb)}${ub > 0 ? `. Starting best ${ub}` : ""}`,
      nodes: plain(), edges: [], table: nodeTable(root), lists: [openList()], stats: stats() });

    while (open.length) {
      if (expanded >= maxNodes) { steps.push({ caption: `Stopped after ${maxNodes} nodes: the result is not proven optimal`, nodes: plain(), edges: [], lists: [openList()], stats: stats() }); break; }
      let k = open.length - 1;
      if (order === "best") { k = 0; open.forEach((x, i) => { if (x.lb < open[k].lb || (x.lb === open[k].lb && x.id < open[k].id)) k = i; }); }
      const nd = open.splice(k, 1)[0]; expanded++;
      const desc = nd.decision === "root" ? "root" : nd.decision;
      if (nd.lb >= best) {
        pruned++;
        steps.push({ caption: `Pick #${nd.id} (${desc}), LB = ${nd.lb} ≥ best ${fmt(best)}: prune, every tour below it costs at least ${nd.lb}`,
          nodes: plain("pruned"), edges: edgeDraw(nd), table: nodeTable(nd), lists: [openList()], stats: stats() });
        continue;
      }
      if (nd.b.complete) {
        const t = tourOf(nd.inc), c = P.cost(t); leaves++;
        const better = c < best;
        if (better) { best = c; bestTour = t; }
        steps.push({ caption: `Pick #${nd.id} (${desc}): every city has two included edges, a complete tour ${t.join(",")} = ${c}${better ? ` (new best, previous bound for all remaining nodes is now ${c})` : ` (not better than ${fmt(best)})`}`,
          nodes: plain("path"), edges: Studio.draw.tour(t, "path", P), table: nodeTable(nd), lists: [openList()], stats: stats() });
        continue;
      }
      /* branch on the cheapest undecided edge used by the bound */
      const cand = [...nd.b.chosen].filter(k2 => !nd.inc.has(k2)).map(k2 => byName[k2]).sort((x, y) => x.c - y.c || (x.name < y.name ? -1 : 1));
      const e = cand[0], kids = [];
      const inc2 = new Set(nd.inc).add(e.name), exc2 = new Set(nd.exc).add(e.name);
      const kInc = mk(nd.id, inc2, nd.exc, `+${e.name}`), kExc = mk(nd.id, nd.inc, exc2, `−${e.name}`);
      const notes = [];
      for (const kd of [kInc, kExc]) {
        if (kd.b.ok) kids.push(kd); else { infeasible++; notes.push(`#${kd.id} (${kd.decision}) infeasible: ${kd.b.why}`); }
      }
      // push so that the include child is explored first in DFS
      kids.slice().reverse().forEach(kd => open.push(kd));
      steps.push({ caption: `Pick #${nd.id} (${desc}), LB = ${nd.lb} < best ${fmt(best)}: branch on ${e.name} (${e.c}), the cheapest undecided edge the bound uses. Include → #${kInc.id} LB ${fmt(kInc.lb)}; exclude → #${kExc.id} LB ${fmt(kExc.lb)}${notes.length ? "; " + notes.join("; ") : ""}`,
        nodes: plain(), edges: edgeDraw(nd, { branch: e.name }), table: nodeTable(nd), lists: [openList()], stats: stats() });
    }
    const t = bestTour;
    steps.push({ caption: t ? `OPEN is empty. Best tour ${t.join(",")} = ${best}, proved optimal: ${expanded} nodes picked (${leaves} complete tours, ${pruned} pruned, ${infeasible} infeasible children dropped)` : `No tour found${ub > 0 ? ` below the given bound ${ub}` : ""}`,
      nodes: plain(t ? "path" : "plain"), edges: t ? Studio.draw.tour(t, "path", P) : [], stats: [{ label: "optimum", value: fmt(best), state: "ok" }, { label: "nodes", value: expanded }, { label: "pruned", value: pruned }] });
    return { steps, result: { tour: t, cost: t ? best : null, nodes: expanded, pruned, leaves, rootBound: root.b.lb, infeasible } };
  },
});
