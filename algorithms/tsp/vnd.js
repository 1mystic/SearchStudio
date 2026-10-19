/* Variable Neighbourhood Descent (course pseudocode: hill climb with MoveGen(1), then MoveGen(2), ...). */
Studio.register({
  id: "tsp-vnd",
  name: "Variable neighbourhood descent",
  family: "TSP · local search",
  week: 3,
  problem: "tsp",
  order: 70,
  summary: "Hill climb with a sparse neighbourhood, then continue from its local optimum with denser ones. A local optimum of one MoveGen need not be one of the next.",
  pseudocode: `node ← start
for i ← 1 to n
    moveGen ← MoveGen(i)            # sparse → dense
    node ← HillClimbing(node, moveGen)
return node`,
  complexity: "Sum of the hill-climbing costs of each neighbourhood",
  learn: {
    "intro": "If hill climbing gets stuck, one fix is to look further: use a bigger neighbourhood. Variable Neighbourhood Descent does this in order, from cheap and sparse to expensive and dense, so most of the improvement comes cheaply.",
    "definition": "Given MoveGen functions ordered by density, hill climb with MoveGen(1) to a local optimum, then continue from there with MoveGen(2), and so on.",
    "steps": [
      [
        "node ← start",
        ""
      ],
      [
        "for i ← 1 to n",
        "MoveGens are sorted sparse → dense."
      ],
      [
        "node ← HillClimbing(node, MoveGen(i))",
        "Each phase starts where the previous phase stopped."
      ],
      [
        "return node",
        "A local optimum for the last (densest) neighbourhood."
      ]
    ],
    "formulas": [
      {
        "f": "LocalOpt(N₁) ⊉ LocalOpt(N₂)",
        "read": "being stuck in one neighbourhood does not mean being stuck in another",
        "why": "Different moves reach different tours; a denser neighbourhood contains moves the sparse one lacks."
      }
    ],
    "why": "Sparse neighbourhoods are cheap and do most of the work; dense ones are used only near the end, where they escape the sparse operator's traps.",
    "traps": [
      "The course version runs each MoveGen once, in order; some variants restart from MoveGen(1) after any improvement.",
      "A phase can make no progress at all: that is fine."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "sum of the phases' hill climbs",
      "space": "O(n)"
    }
  },
  params: [
    Studio.tsp.startParam,
    { key: "order", label: "MoveGen order", type: "select", default: "2-edge,2-city,3-edge",
      options: [["2-edge,2-city,3-edge", "2-edge → 2-city → 3-edge"], ["2-edge,or-opt,3-edge", "2-edge → Or-opt → 3-edge"], ["2-city,2-edge,3-edge", "2-city → 2-edge → 3-edge"]] },
    Studio.seedParam(1),
  ],
  run(P, { start, order, seed }) {
    let node = Studio.tsp.startTour(P, start, seed);
    const steps = [], phases = order.split(",");
    const rows = [];
    phases.forEach((mg, k) => {
      const label = Studio.tsp.moveGens[mg].label;
      const r = Studio.tspSteps.hillClimb(P, node, mg, label);
      const from = P.cost(node);
      r.steps.forEach(s => {
        s.caption = `N${k + 1} = ${label}: ` + s.caption;
        s.stats = [{ label: "phase", value: `N${k + 1} of ${phases.length}` }].concat(s.stats || []);
        s.lists = [{ label: "PHASES", items: phases.map((m, j) => ({ text: `N${j + 1} ${m}` + (rows[j] ? ` ${rows[j][1]}→${rows[j][2]}` : ""), state: j < k ? "closed" : j === k ? "open" : "plain" })) }];
        steps.push(s);
      });
      rows.push([mg, from, r.cost]);
      node = r.tour;
    });
    steps.push({ caption: `VND result ${node.join(",")} = ${P.cost(node)} (${rows.map(r => r[1] + "→" + r[2]).join(", ")})`,
      nodes: Studio.tspSteps.nodes(P, "path"), edges: Studio.tspSteps.edges(P, node, { state: "path" }),
      table: { columns: ["phase", "MoveGen", "from", "to"], rows: rows.map((r, i) => ["N" + (i + 1), r[0], r[1], r[2]]), rowStates: rows.map(r => (r[2] < r[1] ? "ok" : "dim")) },
      stats: [{ label: "result", value: P.cost(node), state: "ok" }] });
    return { steps, result: { tour: node, cost: P.cost(node) } };
  },
});
