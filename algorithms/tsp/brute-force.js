/* Exhaustive search: the reference optimum for small instances. */
Studio.register({
  id: "tsp-brute-force",
  name: "Brute force (exact)",
  family: "TSP · exact",
  week: 3,
  problem: "tsp",
  order: 5,
  maxSize: 9,
  summary: "Fix the first city and try every ordering of the rest; for a symmetric TSP each tour appears twice, so (n−1)!/2 distinct tours.",
  pseudocode: `best ← ∞
for every permutation p of cities 2..n   (symmetric: skip p with p[first] > p[last])
    if cost(city1 + p) < best: best ← that tour
return best`,
  complexity: "O(n!)",
  learn: {
    "intro": "The travelling salesperson problem (TSP) asks for the shortest round trip that visits every city exactly once. Brute force simply tries every possible round trip and keeps the shortest. It is the only method here that is guaranteed to find the best tour, and it is how every other method's answer is checked.",
    "definition": "Fix the first city (a round trip can start anywhere), list every ordering of the remaining n−1 cities, compute each tour's cost, and return the cheapest.",
    "steps": [
      [
        "best ← ∞",
        "No tour seen yet."
      ],
      [
        "for every permutation p of cities 2..n",
        "There are (n−1)! orderings. In a symmetric TSP a tour and its reverse cost the same, so only half are distinct."
      ],
      [
        "if cost(city1 + p) < best",
        "Cost = sum of the n edges, including the edge back to the start."
      ],
      [
        "return best",
        "The cheapest tour is the optimum."
      ]
    ],
    "formulas": [
      {
        "f": "number of tours = (n−1)! / 2  (symmetric)",
        "read": "fix one city, order the rest, halve for direction",
        "why": "Rotations of a cycle are the same tour, and so is the reversed cycle when C(i,j) = C(j,i)."
      },
      {
        "f": "cost(T) = Σ C(tᵢ, tᵢ₊₁) + C(tₙ, t₁)",
        "read": "add up every edge on the cycle",
        "why": "The closing edge back to the start is part of the tour; forgetting it is the most common arithmetic slip."
      }
    ],
    "why": "It works because it leaves nothing out. It fails in practice because (n−1)!/2 explodes: 60 tours for 6 cities, 181,440 for 10, about 10^155 for 100.",
    "traps": [
      "Forgetting the closing edge.",
      "Counting (n−1)! instead of (n−1)!/2 for a symmetric instance.",
      "Using brute force on large n: the studio limits it to 9 cities."
    ],
    "props": {
      "complete": "yes",
      "optimal": "yes",
      "time": "O(n!)",
      "space": "O(n)"
    }
  },
  params: [],
  run(P) {
    const [first, ...rest] = P.ids, steps = [], all = [];
    let best = null, k = 0;
    const perm = (arr, pre) => {
      if (!arr.length) {
        if (P.symmetric && pre[0] > pre[pre.length - 1]) return;
        const t = [first, ...pre], c = P.cost(t); k++;
        all.push([t.join(","), c]);
        if (!best || c < best[1]) {
          best = [t, c];
          steps.push({ caption: `Tour #${k}: ${t.join(",")} = ${c} — new best`, nodes: Object.fromEntries(P.ids.map(x => [x, { state: "plain" }])),
            edges: Studio.draw.tour(t, "tour", P), stats: [{ label: "tours checked", value: k }, { label: "best", value: c, state: "ok" }] });
        }
        return;
      }
      arr.forEach((x, i) => perm(arr.slice(0, i).concat(arr.slice(i + 1)), pre.concat([x])));
    };
    perm(rest, []);
    all.sort((a, b) => a[1] - b[1]);
    const top = all.slice(0, 12);
    steps.push({ caption: `${k} ${P.symmetric ? "distinct (n−1)!/2" : "directed (n−1)!"} tours checked. Optimum ${best[0].join(",")} = ${best[1]}; worst ${all[all.length - 1][1]}`,
      nodes: Object.fromEntries(P.ids.map(x => [x, { state: "path" }])), edges: Studio.draw.tour(best[0], "path", P),
      table: { title: "best tours", columns: ["rank", "tour", "cost"], rows: top.map((r, i) => [i + 1, r[0], r[1]]), rowStates: top.map(r => (r[1] === best[1] ? "ok" : "")) },
      stats: [{ label: "tours checked", value: k }, { label: "optimum", value: best[1], state: "ok" }] });
    return { steps, result: { tour: best[0], cost: best[1], count: k } };
  },
});
