/* Sequence alignment as A* search on the lattice, h = gap × |remaining length difference|. */
Studio.register({
  id: "align-astar",
  name: "Sequence alignment (A*)",
  family: "Sequence alignment",
  week: 6,
  problem: "alignment",
  order: 20,
  defaultExample: "align-similar",
  summary: "Treat each lattice point (i,j) as a state and search from (0,0) to (m,n) with A*. h(i,j) = gap × |(m−i) − (n−j)| never overestimates, because that many gaps are unavoidable.",
  pseudocode: `start (0,0), goal (m,n)
moves: diagonal cost(aᵢ,bⱼ), down gap, right gap
h(i,j) = gap · |(m − i) − (n − j)|           # admissible: the length difference must be covered by gaps
run A*: pick least f = g + h from OPEN; update cheaper paths; stop when (m,n) is picked`,
  complexity: "At most (m+1)(n+1) states; often far fewer than dynamic programming fills",
  learn: {
    "intro": "Dynamic programming fills the whole table. A* treats alignment as a shortest-path search on the same lattice and, with a good heuristic, explores only the part of the table near the best alignment.",
    "definition": "States are lattice points (i,j); moves are diagonal, down and right with their costs. h(i,j) = gap × |(m−i) − (n−j)| because the remaining length difference must be covered by gaps.",
    "steps": [
      [
        "start (0,0), goal (m,n)",
        ""
      ],
      [
        "h = gap · |remaining length difference|",
        "Admissible and consistent."
      ],
      [
        "A* with OPEN and CLOSED",
        "Stop when (m,n) is picked from OPEN."
      ]
    ],
    "formulas": [
      {
        "f": "h(i,j) = gap · |(m − i) − (n − j)|",
        "read": "at least this many gaps are unavoidable",
        "why": "Each gap shortens the length difference by one, so this many gap moves remain in any completion: h never overestimates."
      }
    ],
    "why": "Optimal like dynamic programming, usually with fewer states: the more alike the sequences, the fewer lattice points A* has to expand, because the cheap diagonal path keeps f low and everything else waits on OPEN. With large sequences, frontier search and DCFS keep its memory small.",
    "traps": [
      "A weak h (such as 0) makes A* behave like Dijkstra and expand most of the table. When both sequences have the same length h is 0 at the start, so the saving comes only from the cheap diagonal moves: compare 'ACGTTGCAAT vs ACGTAGCAAT, one substitution' (11 of 121 points) with 'ACGTAC vs TGCATG, unrelated' (19 of 49).",
      "A* is only guaranteed to find the optimal cost, not a unique alignment: several alignments can tie, and the tie-break decides which one is shown."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes",
      "time": "≤ O(m·n·log(m·n))",
      "space": "≤ O(m·n)"
    }
  },
  params: [],
  run(P) {
    const { a, b, m, n, cost, gapC: gc, nid } = P, steps = [];
    const h = (i, j) => gc * Math.abs((m - i) - (n - j));
    const OPEN = new Map([[nid(0, 0), { i: 0, j: 0, g: 0, parent: null }]]), CLOSED = new Map();
    const pair = x => `(${x.i},${x.j}) g=${x.g} f=${x.g + h(x.i, x.j)}`;
    while (OPEN.size) {
      let N = null; for (const x of OPEN.values()) { const f = x.g + h(x.i, x.j); if (!N || f < N.g + h(N.i, N.j) || (f === N.g + h(N.i, N.j) && x.g > N.g)) N = x; }
      const k = nid(N.i, N.j); OPEN.delete(k); CLOSED.set(k, N);
      const nodes = {}; for (const [id, x] of CLOSED) nodes[id] = { state: "closed", label: String(x.g) }; for (const [id, x] of OPEN) nodes[id] = { state: "open", label: String(x.g) }; nodes[k] = { state: "current", label: String(N.g) };
      if (N.i === m && N.j === n) {
        const path = []; let x = N; while (x) { path.unshift(nid(x.i, x.j)); x = x.parent ? CLOSED.get(x.parent) : null; }
        const edges = []; for (let t = 0; t + 1 < path.length; t++) edges.push({ u: path[t], v: path[t + 1], state: "path" });
        path.forEach(id => (nodes[id] = Object.assign({}, nodes[id], { state: "path" })));
        const A = [], B = []; for (let t = 0; t + 1 < path.length; t++) { const [i1, j1] = path[t].split(",").map(Number), [i2, j2] = path[t + 1].split(",").map(Number); A.push(i2 > i1 ? a[i1] : "-"); B.push(j2 > j1 ? b[j1] : "-"); }
        steps.push({ caption: `Goal (${m},${n}) picked from OPEN with the least f, so cost ${N.g} is optimal: ${A.join("")} / ${B.join("")} (${A.filter((x, q) => x !== "-" && B[q] !== "-" && x === B[q]).length} matches, ${A.filter((x, q) => x !== "-" && B[q] !== "-" && x !== B[q]).length} mismatches, ${A.filter((x, q) => x === "-" || B[q] === "-").length} gaps). A* expanded ${CLOSED.size} of the ${(m + 1) * (n + 1)} lattice points that dynamic programming fills`, nodes, edges,
          lists: [{ label: "a", items: A.map(z => ({ text: z, state: "open" })), boxes: true }, { label: "b", items: B.map((z, q) => ({ text: z, state: z === A[q] ? "open" : z === "-" || A[q] === "-" ? "alt" : "bad" })), boxes: true }],
          stats: [{ label: "cost", value: N.g, state: "ok" }, { label: "expanded", value: CLOSED.size }] });
        return { steps, result: { cost: N.g, alignment: [A.join(""), B.join("")], expanded: CLOSED.size, lattice: (m + 1) * (n + 1) } };
      }
      const moves = [];
      if (N.i < m && N.j < n) moves.push([N.i + 1, N.j + 1, cost(N.i, N.j)]);
      if (N.i < m) moves.push([N.i + 1, N.j, gc]);
      if (N.j < n) moves.push([N.i, N.j + 1, gc]);
      for (const [i, j, w] of moves) {
        const id = nid(i, j), g = N.g + w;
        const old = OPEN.get(id) || CLOSED.get(id);
        if (!old) OPEN.set(id, { i, j, g, parent: k });
        else if (g < old.g) { old.g = g; old.parent = k; if (CLOSED.has(id)) { CLOSED.delete(id); OPEN.set(id, old); } }
      }
      steps.push({ caption: `Expand (${N.i},${N.j}) because it has the least f = g + h = ${N.g} + ${h(N.i, N.j)} = ${N.g + h(N.i, N.j)} on OPEN (h = gap × |remaining length difference| = ${gc} × ${Math.abs((m - N.i) - (n - N.j))}); its ${moves.length} move${moves.length === 1 ? "" : "s"} (diagonal, down, right) ${moves.length === 1 ? "is" : "are"} added to OPEN or give a cheaper g`, nodes,
        lists: [{ label: "OPEN", items: [...OPEN.values()].sort((x, y) => x.g + h(x.i, x.j) - (y.g + h(y.i, y.j))).slice(0, 8).map(x => ({ text: pair(x), state: "open" })) }],
        stats: [{ label: "expanded", value: CLOSED.size }, { label: "OPEN", value: OPEN.size }] });
    }
    return { steps, result: {} };
  },
});
