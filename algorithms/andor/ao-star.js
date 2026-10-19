/* AO*: best-first search for the cheapest solution graph in an AND–OR graph. */
Studio.register({
  id: "andor-ao-star",
  name: "AO*",
  family: "Problem decomposition",
  week: 9,
  problem: "andor",
  order: 10,
  summary: "Follow the marked (currently best) connectors from the start to an unexpanded node, expand it, then revise costs upwards: each node's cost is its cheapest connector, an AND connector costs the sum over its children. A node is solved when all children of its marked connector are solved.",
  pseudocode: `repeat until start is SOLVED (or its cost exceeds FUTILITY)
    trace marked connectors from start; pick an unexpanded node n on that partial solution
    expand n: add its connectors and children (cost h); no connectors → cost FUTILITY
    S ← {n}
    while S not empty
        take m from S that has no descendant in S
        for each connector c of m: cost(c) = k(c) + Σ cost(children of c)
        cost(m) ← min over c;  mark the best connector
        if every child of the marked connector is SOLVED: label m SOLVED
        if cost(m) changed or m became SOLVED: add m's parents to S`,
  complexity: "Exponential in general; the marked solution graph is revised after every expansion",
  learn: {
    "intro": "Some problems split into subproblems that must all be solved (AND), while others offer alternative ways to proceed (OR). AO* searches such AND–OR graphs for the cheapest solution graph, revising its choices as costs become known.",
    "definition": "Each node has connectors: a single-child connector is an OR option, a multi-child connector is an AND arc. Cost of a connector = its arc costs + sum of its children's costs. A node's cost is its cheapest connector, which is marked. AO* expands an unexpanded node on the marked partial solution, then revises costs and markings upwards.",
    "steps": [
      [
        "trace marked connectors from the start",
        "This is the current best partial solution."
      ],
      [
        "expand one unexpanded node on it",
        ""
      ],
      [
        "revise costs bottom-up",
        "Recompute connector costs, mark the best, propagate to parents."
      ],
      [
        "solved when the marked connector's children are all solved",
        "Repeat until the start is solved."
      ]
    ],
    "formulas": [
      {
        "f": "cost(c) = Σ over children t of (k + cost(t))",
        "read": "every arc of a connector costs k, plus its children",
        "why": "An AND arc needs all its children, so their costs add."
      },
      {
        "f": "cost(n) = min over connectors c of n of cost(c)",
        "read": "choose the cheapest way to solve n",
        "why": "OR alternatives: only the best one is needed."
      }
    ],
    "why": "With admissible estimates AO* finds an optimal solution graph. The marked solution can change as estimates are corrected, which is visible in the trace.",
    "traps": [
      "An AND connector costs the sum, not the minimum, of its children.",
      "Propagate revisions to all ancestors whose marked connector uses the node."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes with admissible h",
      "time": "exponential in general",
      "space": "the explicit graph"
    }
  },
  params: [{ key: "futility", label: "Futility threshold", type: "number", default: 100 }],
  run(P, { futility }) {
    const steps = [], cost = {}, solved = {}, mark = {}, expanded = new Set(), seen = new Set([P.start]);
    P.ids.forEach(i => { cost[i] = P.node[i].h; solved[i] = P.node[i].solved; });
    const parents = id => P.ids.filter(p => expanded.has(p) && P.out[p].some(c => c.to.includes(id)));
    const conCost = c => c.cost + c.to.reduce((s, t) => s + cost[t], 0);
    const best = () => { const sol = new Set(), edges = []; const w = x => { sol.add(x); const c = mark[x]; if (c) c.to.forEach(t => { edges.push({ u: x, v: t, state: "path", group: c.and ? "c" + c.k : undefined, directed: true }); if (!sol.has(t)) w(t); }); }; w(P.start); return { sol, edges }; };
    const rows = [];
    const snap = (cur, cap) => {
      const { sol, edges } = best();
      const nodes = {}; P.ids.forEach(i => (nodes[i] = { state: !seen.has(i) ? "plain" : solved[i] ? "path" : expanded.has(i) ? "closed" : "open", badge: seen.has(i) ? (cost[i] >= futility ? "∞" : cost[i]) : undefined, sub: solved[i] ? "solved" : seen.has(i) ? "" : undefined }));
      if (cur) nodes[cur] = Object.assign({}, nodes[cur], { state: "current" });
      const base = P.ids.flatMap(i => P.out[i].flatMap(c => c.to.map(t => ({ u: i, v: t, state: expanded.has(i) ? "tree" : "faint", group: c.and ? "c" + c.k : undefined, directed: true }))));
      const merged = base.map(e => edges.find(x => x.u === e.u && x.v === e.v) || e);
      steps.push({ caption: cap, nodes, edges: merged, table: { title: "revisions", columns: ["#", "node", "connector costs", "cost", "solved"], rows: rows.slice(-14), rowStates: rows.slice(-14).map((r, i, a) => (r[4] === "yes" ? "ok" : i === a.length - 1 ? "cur" : "")) },
        lists: [{ label: "BEST", items: [...sol].map(x => ({ text: `${x}${solved[x] ? "✓" : ""}`, state: solved[x] ? "plain" : "open" })) }], stats: [{ label: `cost(${P.start})`, value: cost[P.start] }] });
    };
    snap(null, `Start: ${P.start} with estimate ${cost[P.start]}`);
    for (let it = 0; it < 200 && !solved[P.start] && cost[P.start] < futility; it++) {
      // find an unexpanded, unsolved node on the marked partial solution (left to right)
      let n = null; const stack = [P.start], vis = new Set();
      while (stack.length && !n) { const x = stack.shift(); if (vis.has(x)) continue; vis.add(x); if (!expanded.has(x) && !solved[x]) { n = x; break; } if (mark[x]) mark[x].to.forEach(t => stack.push(t)); }
      if (!n) break;
      expanded.add(n);
      P.out[n].forEach(c => c.to.forEach(t => seen.add(t)));
      if (!P.out[n].length) cost[n] = futility;
      snap(n, `Expand ${n}: ${P.out[n].length ? P.out[n].map(c => (c.and ? "AND{" + c.to.join(",") + "}" : c.to[0])).join(", ") : "no successors → cost FUTILITY"}`);
      const S = new Set([n]);
      for (let g = 0; g < 500 && S.size; g++) {
        const m = [...S].find(x => ![...S].some(y => y !== x && P.out[x].some(c => c.to.includes(y)))) || [...S][0];
        S.delete(m);
        if (!expanded.has(m)) continue;
        const before = [cost[m], solved[m]];
        if (P.out[m].length) {
          const opts = P.out[m].map(c => [conCost(c), c]).sort((a, b) => a[0] - b[0]);
          cost[m] = Math.min(futility, opts[0][0]); mark[m] = opts[0][1];
          solved[m] = mark[m].to.every(t => solved[t]);
          rows.push([rows.length + 1, m, opts.map(([v, c]) => (c.and ? `{${c.to.join("+")}}` : c.to[0]) + "=" + v).join(" "), cost[m], solved[m] ? "yes" : ""]);
        }
        if (before[0] !== cost[m] || before[1] !== solved[m]) parents(m).forEach(p => S.add(p));
        snap(m, `Revise ${m}: cost ${before[0]} → ${cost[m]}${mark[m] ? `, best connector ${mark[m].and ? "AND{" + mark[m].to.join(",") + "}" : mark[m].to[0]}` : ""}${solved[m] && !before[1] ? ", now SOLVED" : ""}`);
      }
    }
    const { sol } = best();
    const ok = solved[P.start];
    snap(null, ok ? `${P.start} is SOLVED with cost ${cost[P.start]}. Solution graph: ${[...sol].join(", ")}` : `No solution below the futility threshold`);
    return { steps, result: { solved: ok, cost: cost[P.start], solution: [...sol] } };
  },
});
