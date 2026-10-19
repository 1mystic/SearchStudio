/* Nearest Neighbour heuristic (constructive). */
Studio.register({
  id: "tsp-nearest-neighbour",
  name: "Nearest Neighbour",
  family: "TSP · constructive",
  week: 3,
  problem: "tsp",
  order: 10,
  summary: "Grow one path from a start city, always moving to the closest unvisited city; return home at the end.",
  pseudocode: `tour ← [start]
while unvisited cities remain
    c ← last city of tour
    append the unvisited city nearest to c   (ties: alphabetical)
return tour   (closing edge back to start is implied)`,
  complexity: "O(n²); from every start O(n³)",
  learn: {
    "intro": "Nearest Neighbour is what most people do by hand: from where you are, go to the closest place you have not visited yet. It builds a tour quickly but can paint itself into a corner and pay for a long trip home at the end.",
    "definition": "A constructive (synthesis) heuristic: start at a given city, repeatedly append the nearest unvisited city, and finally return to the start.",
    "steps": [
      [
        "tour ← [start]",
        "The path starts at the chosen city."
      ],
      [
        "while unvisited cities remain",
        "n−1 choices are made in total."
      ],
      [
        "c ← last city of tour",
        "Only the current end of the path matters: NN never looks back."
      ],
      [
        "append the unvisited city nearest to c",
        "Ties go to the alphabetically first city (the course convention)."
      ],
      [
        "return tour",
        "The edge from the last city back to the start is forced, whatever its length."
      ]
    ],
    "formulas": [
      {
        "f": "next = argmin over unvisited j of C(c, j)",
        "read": "pick the cheapest edge out of the current city that leads somewhere new",
        "why": "Each choice is locally best; nothing guarantees the sum of choices is globally best."
      },
      {
        "f": "NN ≤ ½(⌈log₂ n⌉ + 1) · OPT  (metric TSP)",
        "read": "in the worst case NN can be about log n times worse than optimal",
        "why": "Bad cases exist where greedy local moves strand far-away cities."
      }
    ],
    "why": "Cheap and intuitive. Its weakness is the end game: the last cities are whatever is left over, often far apart, and the forced return edge can be the longest edge in the tour.",
    "traps": [
      "The tour depends on the start city: run it from every city and keep the best.",
      "Do not forget the forced return edge in the cost.",
      "Write the answer in path representation starting from the asked city."
    ],
    "props": {
      "complete": "always returns a tour",
      "optimal": "no",
      "time": "O(n²)",
      "space": "O(n)"
    }
  },
  params: [{ key: "start", label: "Start city", type: "city", default: P => P.ids[0] }],
  run(P, { start }) {
    const steps = [], t = [start], rows = [];
    let total = 0;
    const base = () => {
      const nodes = {};
      P.ids.forEach(c => (nodes[c] = { state: t.includes(c) ? "visited" : "plain" }));
      return nodes;
    };
    const tourEdges = () => Studio.draw.path(t, "tour").map(e => ({ ...e, label: P.d(e.u, e.v) }));
    steps.push({ caption: `Start at ${start}`, nodes: { ...base(), [start]: { state: "current" } }, edges: [],
      table: { columns: ["at", "unvisited (nearest first)", "go", "+", "Σ"], rows: [] }, stats: [{ label: "cost so far", value: 0 }] });
    while (t.length < P.n) {
      const c = t[t.length - 1];
      const cands = P.ids.filter(x => !t.includes(x)).sort((a, b) => P.d(c, a) - P.d(c, b) || (a < b ? -1 : 1));
      const nodes = base(); nodes[c] = { state: "current" };
      cands.forEach(x => (nodes[x] = { state: "open" }));
      steps.push({
        caption: `At ${c}: candidates ${cands.map(x => x + " " + P.d(c, x)).join(", ")}`,
        nodes, edges: tourEdges().concat(cands.map(x => ({ u: c, v: x, state: "candidate", label: P.d(c, x) }))),
        table: { columns: ["at", "unvisited (nearest first)", "go", "+", "Σ"], rows: rows.concat([[c, cands.map(x => x + P.d(c, x)).join(" "), "?", "", ""]]), rowStates: rows.map(() => "").concat(["cur"]) },
        stats: [{ label: "cost so far", value: total }],
      });
      const nx = cands[0];
      total += P.d(c, nx);
      t.push(nx);
      rows.push([c, cands.map(x => x + P.d(c, x)).join(" "), nx, P.d(c, nx), total]);
      const n2 = base(); n2[nx] = { state: "current" };
      steps.push({ caption: `${c} → ${nx} (+${P.d(c, nx)}), total ${total}`, nodes: n2, edges: tourEdges(),
        table: { columns: ["at", "unvisited (nearest first)", "go", "+", "Σ"], rows: rows.slice(), rowStates: rows.map((_, i) => (i === rows.length - 1 ? "ok" : "")) },
        stats: [{ label: "cost so far", value: total }] });
    }
    const last = t[t.length - 1], back = P.d(last, start);
    total += back;
    rows.push([last, start + back, start, back, total]);
    const longest = Math.max(...Studio.tsp.tourEdges(t).map(([a, b]) => P.d(a, b)));
    const nodes = base(); nodes[start] = { state: "path" };
    steps.push({
      caption: `Forced return ${last} → ${start} (+${back}). Tour ${t.join(",")} = ${total}` + (back === longest ? ". The return leg is the longest edge in the tour." : ""),
      nodes, edges: tourEdges().concat([{ u: last, v: start, state: back === longest ? "rejected" : "tour", label: back }]),
      table: { columns: ["at", "unvisited (nearest first)", "go", "+", "Σ"], rows: rows.slice(), rowStates: rows.map((_, i) => (i === rows.length - 1 ? (back === longest ? "bad" : "ok") : "")) },
      stats: [{ label: "tour cost", value: total, state: "ok" }],
    });
    return { steps, result: { tour: t, cost: total } };
  },
});
