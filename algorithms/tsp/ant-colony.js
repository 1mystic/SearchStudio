/* Ant colony optimisation (Ant System). */
Studio.register({
  id: "tsp-aco",
  name: "Ant colony optimisation",
  family: "TSP · swarm",
  week: 4,
  problem: "tsp",
  order: 150,
  summary: "Each ant builds a tour city by city with P(i→j) ∝ τ^α (1/d)^β over unvisited cities. Then pheromone evaporates, τ ← (1−ρ)τ, and every ant deposits Q/L on the edges of its tour.",
  pseudocode: `τ ← τ0 on every edge;  bestTour ← nil
repeat for t iterations
    place m ants on cities
    each ant: repeat n−1 times
        choose next j with P(i→j) = τij^α ηij^β / Σ τih^α ηih^β,  η = 1/d
    update bestTour
    τ ← (1 − ρ) τ                         # evaporation
    for each ant, for each edge of its tour: τ += Q / L(ant)
return bestTour`,
  complexity: "O(m · n²) per iteration",
  learn: {
    "intro": "Real ants find short paths by leaving pheromone: short routes are travelled more often, collect more pheromone, and attract more ants. Ant colony optimisation copies this with artificial ants building tours on a pheromone map.",
    "definition": "Each ant builds a tour, choosing the next city j from i with probability proportional to τᵢⱼ^α · (1/dᵢⱼ)^β. After all ants finish, pheromone evaporates by a factor (1−ρ) and each ant adds Q/L on the edges of its tour.",
    "steps": [
      [
        "τ ← τ₀ on every edge",
        "No preference at the start."
      ],
      [
        "each ant builds a tour",
        "Probabilistic choice over unvisited cities only."
      ],
      [
        "τ ← (1 − ρ) τ",
        "Evaporation forgets old information."
      ],
      [
        "τᵢⱼ += Q / Lₖ for edges of ant k",
        "Shorter tours (small L) deposit more."
      ],
      [
        "remember the best tour",
        ""
      ]
    ],
    "formulas": [
      {
        "f": "P(i→j) = τᵢⱼ^α ηᵢⱼ^β / Σ over unvisited h of τᵢₕ^α ηᵢₕ^β,   η = 1/d",
        "read": "pheromone strength times visibility, normalised",
        "why": "α weighs learned experience, β weighs the greedy distance heuristic."
      },
      {
        "f": "τᵢⱼ ← (1 − ρ) τᵢⱼ + Σₖ Q / Lₖ",
        "read": "evaporate, then deposit in proportion to tour quality",
        "why": "Edges shared by many short tours grow; unused edges fade."
      }
    ],
    "why": "Combines a greedy heuristic with experience shared through the environment. Large α can lock in early choices; large ρ forgets quickly and keeps exploring.",
    "traps": [
      "Normalise only over unvisited cities.",
      "Evaporate before depositing (course order).",
      "β = 0 ignores distance; α = 0 ignores pheromone and gives a randomised nearest neighbour."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "O(m · n²) per iteration",
      "space": "O(n²)"
    }
  },
  params: [
    { key: "m", label: "Ants m", type: "int", default: 3, min: 1, max: 30 },
    { key: "iters", label: "Iterations", type: "int", default: 3, min: 1, max: 50 },
    { key: "alpha", label: "α (pheromone weight)", type: "number", default: 1 },
    { key: "beta", label: "β (visibility weight)", type: "number", default: 2 },
    { key: "rho", label: "ρ (evaporation)", type: "number", default: 0.5 },
    { key: "Q", label: "Q (deposit)", type: "number", default: 100 },
    { key: "tau0", label: "τ0", type: "number", default: 1 },
    Studio.seedParam(1),
  ],
  run(P, { m, iters, alpha, beta, rho, Q, tau0, seed }) {
    const rng = Studio.rng(seed), steps = [], ids = P.ids, key = (a, b) => (a < b ? a + b : b + a);
    const tau = {}; ids.forEach((a, i) => ids.slice(i + 1).forEach(b => (tau[key(a, b)] = tau0)));
    const pherEdges = (scale) => { const mx = Math.max(...Object.values(tau)); return Object.entries(tau).map(([e, v]) => ({ u: e[0], v: e[1], state: "pheromone", weight: v / mx, label: undefined })); };
    let best = null;
    const starts = Array.from({ length: m }, (_, k) => ids[Math.floor((k * ids.length) / m) % ids.length]);
    for (let it = 1; it <= iters; it++) {
      const ants = [];
      for (let k = 0; k < m; k++) {
        const t = [starts[k]], choices = [];
        while (t.length < ids.length) {
          const x = t[t.length - 1], cand = ids.filter(c => !t.includes(c));
          const w = cand.map(c => Math.pow(tau[key(x, c)], alpha) * Math.pow(1 / Math.max(1e-9, P.d(x, c)), beta));
          const tot = w.reduce((a, b) => a + b, 0), u = rng.r3();
          let cum = 0, pick = cand[cand.length - 1];
          for (let i = 0; i < cand.length; i++) { cum += w[i] / tot; if (u <= cum) { pick = cand[i]; break; } }
          choices.push({ at: x, probs: cand.map((c, i) => [c, Math.round((w[i] / tot) * 1000) / 1000]), u, pick });
          t.push(pick);
        }
        ants.push({ t, L: P.cost(t), choices });
        if (!best || P.cost(t) < best.cost) best = { tour: t, cost: P.cost(t) };
        if (it === 1 && k === 0) {
          // show the first ant's choices in detail
          choices.forEach((c, j) => steps.push({
            caption: `Iteration 1, ant 1 at ${c.at}: ${c.probs.map(([z, p]) => z + " " + p).join(", ")}; u = ${c.u} → ${c.pick}`,
            nodes: Object.assign(Studio.tspSteps.nodes(P), Object.fromEntries(t.slice(0, j + 1).map(z => [z, { state: "visited" }])), { [c.at]: { state: "current" } }),
            edges: pherEdges().concat(Studio.draw.path(t.slice(0, j + 1), "tour")).concat(c.probs.map(([z]) => ({ u: c.at, v: z, state: z === c.pick ? "added" : "candidate", label: P.d(c.at, z) }))),
            chart: { kind: "bars", labels: c.probs.map(z => z[0]), values: c.probs.map(z => z[1]), mark: c.probs.findIndex(z => z[0] === c.pick), yLabel: "P(next city)" },
            table: { title: "P(i→j) ∝ τ^α (1/d)^β", columns: ["to", "d", "τ", "P"], rows: c.probs.map(([z, p]) => [z, P.d(c.at, z), tau[key(c.at, z)].toFixed(3), p]), rowStates: c.probs.map(([z]) => (z === c.pick ? "ok" : "")) },
          }));
        }
        steps.push({ caption: `Iteration ${it}, ant ${k + 1} from ${starts[k]}: ${t.join(",")} = ${P.cost(t)}`, nodes: Studio.tspSteps.nodes(P), edges: pherEdges().concat(Studio.draw.tour(t, "tour", P)),
          table: { title: `iteration ${it}`, columns: ["ant", "tour", "L", "Q/L"], rows: ants.map((a, i) => [i + 1, a.t.join(","), a.L, (Q / a.L).toFixed(3)]), rowStates: ants.map(a => (a.L === best.cost ? "ok" : "")) },
          stats: [{ label: "best so far", value: best.cost, state: "ok" }] });
      }
      const before = { ...tau };
      for (const e in tau) tau[e] *= 1 - rho;
      ants.forEach(a => Studio.tsp.tourEdges(a.t).forEach(([u, v]) => (tau[key(u, v)] += Q / a.L)));
      const top = Object.entries(tau).sort((a, b) => b[1] - a[1]).slice(0, 8);
      steps.push({ caption: `Pheromone update: evaporate ×${(1 - rho).toFixed(2)}, deposit Q/L. Strongest: ${top.slice(0, 3).map(([e, v]) => e + " " + v.toFixed(2)).join(", ")}`,
        nodes: Studio.tspSteps.nodes(P), edges: pherEdges(),
        table: { title: `τ after iteration ${it} (top 8)`, columns: ["edge", "before", "(1−ρ)·before", "deposit", "after"], rows: top.map(([e, v]) => [e, before[e].toFixed(3), (before[e] * (1 - rho)).toFixed(3), (v - before[e] * (1 - rho)).toFixed(3), v.toFixed(3)]) },
        stats: [{ label: "best so far", value: best.cost, state: "ok" }] });
    }
    steps.push({ caption: `Best tour ${best.tour.join(",")} = ${best.cost}`, nodes: Studio.tspSteps.nodes(P, "path"), edges: pherEdges().concat(Studio.draw.tour(best.tour, "path", P)), stats: [{ label: "best", value: best.cost, state: "ok" }] });
    return { steps, result: best };
  },
});
