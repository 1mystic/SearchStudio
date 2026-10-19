/* Crossover lab: one crossover of two parent tours, traced position by position. */
Studio.register({
  id: "tsp-crossover-lab",
  name: "Crossover lab",
  family: "TSP · genetic",
  week: 4,
  problem: "tsp",
  order: 140,
  summary: "Apply one TSP crossover to two parents: cycle, PMX, order (path representation), alternating edges and heuristic (adjacency), ordinal + single-point, or naive single-point to see why it fails.",
  pseudocode: `CX:  follow P1[i] → city P2[i] → its position in P1 …; odd cycles from P1, even from P2
PMX: copy P1[a..b]; elsewhere take P2's city, following the a..b mapping while it is taken
OX:  copy P1[a..b]; fill the blanks left to right with P2's order minus those cities
AEX: next city from P1, then P2, then P1 …; on a cycle use the other parent, else first unvisited
HX:  from each city take the shorter of the two parents' next edges
Ordinal: encode each tour by indices into the shrinking city list; single-point crossover; decode`,
  complexity: "O(n) to O(n²) per child",
  learn: {
    "intro": "Genetic algorithms combine two good tours into a child. For the TSP that is tricky: cutting two city lists and gluing the halves usually repeats some cities and loses others. TSP crossovers are designed to always produce valid tours.",
    "definition": "A crossover takes parent tours P1, P2 and builds a child that inherits structure from both: positions (cycle crossover), a segment plus positions (PMX), a segment plus relative order (order crossover), edges (alternating edges, heuristic crossover), or a prefix in ordinal code (ordinal crossover).",
    "steps": [
      [
        "CX: trace cycles",
        "From position i, look at P2[i], find that city's position in P1, repeat until back at i. Odd cycles from P1, even from P2."
      ],
      [
        "PMX: copy a segment, then map",
        "Fill other positions from P2; if the city is already in the segment, follow the segment mapping until a free city appears."
      ],
      [
        "OX: copy a segment, fill in P2's order",
        "The remaining cities appear in the order they have in P2."
      ],
      [
        "AEX: alternate parents' edges",
        "Next city from P1, then P2, …; repair cycles."
      ],
      [
        "HX: shorter parent edge",
        "From each city take whichever parent's next city is closer."
      ],
      [
        "Ordinal: encode, cut, decode",
        "Index into the shrinking list of unvisited cities; any cut gives a valid child."
      ]
    ],
    "formulas": [
      {
        "f": "ordinal gene i ∈ {1, …, n−i+1}",
        "read": "the i-th index points into the n−i+1 cities still unvisited",
        "why": "Any mix of two such sequences is still a legal sequence, so single-point crossover is always valid."
      },
      {
        "f": "adjacency: a[X] = city after X",
        "read": "store who comes next instead of the order",
        "why": "Tour cost depends on edges, so operators that pass on edges pass on the useful information."
      }
    ],
    "why": "Each operator preserves a different property of the parents. Since cost depends on edges, edge- and order-preserving operators usually produce better children than position-preserving ones.",
    "traps": [
      "Know the exact fill convention for OX in your course (left to right here).",
      "PMX: keep following the mapping chain until the city is not already placed.",
      "Naive single-point crossover on paths is invalid in general."
    ],
    "props": {
      "complete": "n/a",
      "optimal": "n/a",
      "time": "O(n) to O(n²) per child",
      "space": "O(n)"
    }
  },
  params: [
    { key: "op", label: "Operator", type: "select", default: "pmx", options: Object.entries(Studio.tsp.crossovers.names) },
    { key: "p1", label: "Parent 1", type: "text", default: "greedy", help: "greedy, nn, random or a tour like A,C,D,F,B,E" },
    { key: "p2", label: "Parent 2", type: "text", default: "random", help: "greedy, nn, random or a tour" },
    { key: "a", label: "Segment from (PMX/OX)", type: "int", default: 2 },
    { key: "b", label: "Segment to (PMX/OX)", type: "int", default: 4 },
    { key: "cut", label: "Cut after (1-point/ordinal)", type: "int", default: 3 },
    Studio.seedParam(1),
  ],
  run(P, { op, p1, p2, a, b, cut, seed }) {
    const T = Studio.tsp, X = T.crossovers;
    const P1 = T.startTour(P, p1, seed), P2 = T.startTour(P, p2, seed + 1);
    const r = X.apply(P, op, P1, P2, { a, b, cut });
    const steps = [];
    const row = (name, t, st) => ({ label: name, items: t.map((c, i) => ({ text: c, state: st ? st(i, c) : "plain" })), boxes: true });
    const segSt = (i) => (r.segment && i >= r.segment[0] - 1 && i < r.segment[1] ? "open" : "plain");
    const cycSt = (i) => (r.cyc ? (r.cyc[i] % 2 ? "open" : "alt") : segSt(i));
    const base = {
      lists: [row("P1", P1, cycSt), row("P2", P2, cycSt)],
      table: { title: X.names[op], columns: ["step"], rows: [] },
    };
    steps.push(Object.assign({ caption: `Parents: P1 = ${P1.join(",")} (${P.cost(P1)}), P2 = ${P2.join(",")} (${P.cost(P2)})`,
      nodes: Studio.tspSteps.nodes(P), edges: Studio.draw.tour(P1, "tour", P).concat(Studio.draw.tour(P2, "alt", null, false)) }, base));
    r.log.forEach((line, i) => {
      steps.push(Object.assign({}, base, { caption: line, nodes: Studio.tspSteps.nodes(P), edges: Studio.draw.tour(P1, "tour", P).concat(Studio.draw.tour(P2, "alt", null, false)),
        table: { title: X.names[op], columns: ["step"], rows: r.log.slice(0, i + 1).map(x => [x]), rowStates: r.log.slice(0, i + 1).map((_, j) => (j === i ? "cur" : "")) } }));
    });
    const valid = !r.invalid;
    const cost = valid ? P.cost(r.child) : null;
    const lists = [row("P1", P1, cycSt), row("P2", P2, cycSt), row("C1", r.child, (i, c) => (r.invalid && r.child.indexOf(c) !== i ? "bad" : r.cyc ? (r.cyc[i] % 2 ? "open" : "alt") : segSt(i)))];
    if (r.child2) lists.push(row("C2", r.child2, () => "plain"));
    steps.push({ caption: valid ? `Child ${r.child.join(",")} = ${cost}${r.child2 ? `; second child ${r.child2.join(",")} = ${P.cost(r.child2)}` : ""}` : `Child ${r.child.join(",")} is not a tour: ${r.log[1]}`,
      nodes: Studio.tspSteps.nodes(P, valid ? "path" : "plain"), edges: valid ? Studio.draw.tour(r.child, "path", P) : [],
      lists, table: { title: X.names[op], columns: ["step"], rows: r.log.map(x => [x]) },
      stats: [{ label: "P1", value: P.cost(P1) }, { label: "P2", value: P.cost(P2) }, { label: "child", value: valid ? cost : "invalid", state: valid ? "ok" : "bad" }] });
    return { steps, result: { tour: valid ? r.child : null, cost } };
  },
});
