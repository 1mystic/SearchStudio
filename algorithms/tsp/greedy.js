/* Greedy (edge) heuristic (constructive). */
Studio.register({
  id: "tsp-greedy",
  name: "Greedy heuristic",
  family: "TSP · constructive",
  week: 3,
  problem: "tsp",
  order: 20,
  summary: "Scan edges shortest first; accept an edge unless a city would get degree 3 or a cycle shorter than n would close.",
  pseudocode: `sort all edges by length (ties: alphabetical)
for each edge (a,b)
    if degree(a) = 2 or degree(b) = 2: reject
    if a, b already connected and fewer than n−1 edges chosen: reject (premature cycle)
    else accept
read the tour from the chosen edges, starting at the given city`,
  complexity: "O(n² log n) for the sort; union–find makes the cycle test ≈ O(1)",
  learn: {
    "intro": "The Greedy heuristic builds the tour out of the shortest edges available anywhere on the map, like snapping together the closest pairs of cities first. Two rules keep the pieces from becoming something other than one big loop.",
    "definition": "Sort all edges by length. Accept an edge unless it would give a city a third edge (degree 3) or close a loop before all cities are included (premature cycle). Stop at n edges.",
    "steps": [
      [
        "sort all edges by length",
        "There are n(n−1)/2 edges; ties are broken alphabetically."
      ],
      [
        "if degree(a) = 2 or degree(b) = 2: reject",
        "In a tour every city has exactly two neighbours."
      ],
      [
        "if a and b are already connected: reject",
        "Adding the edge would close a cycle that misses some cities. Only the very last edge may close the cycle."
      ],
      [
        "else accept",
        "The edge joins two fragments or extends one."
      ],
      [
        "read the tour from a city",
        "The edge set does not depend on any city; the start only fixes how the path representation is written."
      ]
    ],
    "formulas": [
      {
        "f": "accept (a,b) ⇔ deg(a) < 2 ∧ deg(b) < 2 ∧ (find(a) ≠ find(b) ∨ |E| = n−1)",
        "read": "both ends have a free slot, and they are in different fragments unless this is the closing edge",
        "why": "These are exactly the conditions for the chosen edges to still be part of some Hamiltonian cycle."
      },
      {
        "f": "cost = Σ of accepted edge lengths",
        "read": "the tour cost is just the accepted edges",
        "why": "Greedy accepts exactly n edges."
      }
    ],
    "why": "Short edges are likely to belong to good tours, so Greedy usually beats Nearest Neighbour. But fragments are joined late, and the final edges are whatever remains legal, which can be very long.",
    "traps": [
      "Track degrees and fragments carefully; most exam errors are an illegal acceptance.",
      "The last accepted edge is forced and may be long.",
      "'Greedy from city X' only changes where you start writing the tour."
    ],
    "props": {
      "complete": "always returns a tour",
      "optimal": "no",
      "time": "O(n² log n)",
      "space": "O(n²)"
    }
  },
  params: [{ key: "start", label: "Read the tour from city", type: "city", default: P => P.ids[0] }],
  run(P, { start }) {
    const steps = [], ids = P.ids;
    const E = [];
    ids.forEach((a, i) => ids.slice(i + 1).forEach(b => E.push({ a, b, w: P.d(a, b), name: a + b })));
    E.sort((x, y) => x.w - y.w || (x.name < y.name ? -1 : 1));
    const deg = Object.fromEntries(ids.map(c => [c, 0])), par = Object.fromEntries(ids.map(c => [c, c]));
    const find = x => (par[x] === x ? x : (par[x] = find(par[x])));
    const chosen = [], rows = [], states = [];
    const draw = (extra) => {
      const nodes = {}; ids.forEach(c => (nodes[c] = { state: deg[c] === 2 ? "closed" : deg[c] === 1 ? "visited" : "plain", badge: deg[c] }));
      return { nodes, edges: chosen.map(([a, b]) => ({ u: a, v: b, state: "tour", label: P.d(a, b) })).concat(extra || []) };
    };
    steps.push({ caption: `Sorted ${E.length} edges: ${E.slice(0, 8).map(e => e.name + " " + e.w).join(", ")}${E.length > 8 ? ", …" : ""}`, ...draw(),
      table: { columns: ["edge", "w", "decision", "why"], rows: [] }, stats: [{ label: "edges chosen", value: 0 }] });
    for (const e of E) {
      if (chosen.length === ids.length) break;
      let why = "";
      if (deg[e.a] === 2 || deg[e.b] === 2) why = `degree(${deg[e.a] === 2 ? e.a : e.b}) is already 2`;
      else if (find(e.a) === find(e.b) && chosen.length < ids.length - 1) why = "premature cycle";
      const ok = !why;
      if (ok) { chosen.push([e.a, e.b]); deg[e.a]++; deg[e.b]++; par[find(e.a)] = find(e.b); }
      const closes = ok && chosen.length === ids.length;
      rows.push([e.name, e.w, ok ? "accept" : "reject", ok ? (closes ? "closes the tour" : "") : why]); states.push(ok ? "ok" : "bad");
      const d = draw(ok ? [] : [{ u: e.a, v: e.b, state: "rejected", label: e.w }]);
      if (ok) d.edges[d.edges.length - 1].state = "added";
      steps.push({ caption: `${e.name} = ${e.w}: ${ok ? "accept" + (closes ? " (closes the tour)" : "") : "reject, " + why}`, ...d,
        table: { columns: ["edge", "w", "decision", "why"], rows: rows.slice(), rowStates: states.slice() },
        stats: [{ label: "edges chosen", value: chosen.length + " / " + ids.length }] });
    }
    const t = Studio.tsp.edgesToTour(ids, chosen, start);
    const cost = P.cost(t);
    steps.push({ caption: `Edges ${chosen.map(x => x.join("")).join(", ")} → from ${start}: ${t.join(",")} = ${cost}`, ...draw(),
      table: { columns: ["edge", "w", "decision", "why"], rows, rowStates: states }, stats: [{ label: "tour cost", value: cost, state: "ok" }] });
    return { steps, result: { tour: t, cost } };
  },
});
