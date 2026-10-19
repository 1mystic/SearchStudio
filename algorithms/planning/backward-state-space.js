/* Backward (regression) planning: search from the goal through relevant operators until the initial state satisfies the goal set. */
Studio.register({
  id: "plan-backward",
  name: "Backward state-space planning",
  family: "Planning",
  week: 8,
  problem: "planning",
  order: 20,
  summary: "Search backwards from the goal. An operator is relevant if it adds a goal and deletes none; regressing the goal set G through it gives (G − add) ∪ pre. Stop when the initial state satisfies the current goal set.",
  pseudocode: `OPEN ← [(goal, plan = [ ])]
while OPEN not empty
    (G, plan) ← head(OPEN)
    if G ⊆ init: return plan
    for each operator O that adds some g ∈ G and deletes nothing in G
        G' ← (G − add(O)) ∪ pre(O)
        if G' is consistent and new: append (G', [O] + plan)`,
  complexity: "Branching is the number of relevant operators, usually far smaller than applicable ones",
  learn: {
    "intro": "A planning problem gives an initial state, a goal and operators described in STRIPS form: each operator has preconditions, an add list and a delete list. In the blocks world the operators are pickup, putdown, stack and unstack, and AE means the arm is empty. Backward planning starts from the goal and asks which action could have achieved it last.",
    "definition": "Search over goal sets. An operator is relevant if it adds at least one goal and deletes none. Regressing goal set G through it gives (G − add) ∪ pre. Stop when the initial state satisfies the goal set.",
    "steps": [
      [
        "G ← goal",
        ""
      ],
      [
        "relevant operators only",
        "Must add something in G and delete nothing in G."
      ],
      [
        "G' = (G − add) ∪ pre",
        "What must be true before the action so that G holds after it."
      ],
      [
        "stop when G ⊆ initial state",
        "The plan is the sequence of operators, read forwards."
      ]
    ],
    "formulas": [
      {
        "f": "regress(G, O) = (G − add(O)) ∪ pre(O)",
        "read": "goals the action achieves are dropped, its preconditions are added",
        "why": "These are exactly the facts needed before O so that G holds after O."
      }
    ],
    "why": "Focused on the goal, so the branching factor is small, but goal sets can be impossible (like holding a block with the arm empty) and must be pruned.",
    "traps": [
      "Discard inconsistent goal sets.",
      "An operator that deletes a goal cannot be the last step."
    ],
    "props": {
      "complete": "yes",
      "optimal": "shortest plan (BFS)",
      "time": "O(b^d) with smaller b",
      "space": "O(b^d)"
    }
  },
  params: [{ key: "limit", label: "Stop after expanding", type: "int", default: 400 }],
  run(P, { limit }) {
    const steps = [], BW = Studio.blocks;
    const consistent = G => {
      const hold = [...G].filter(f => f.startsWith("holding(")); if (hold.length > 1 || (hold.length && G.has("AE"))) return false;
      for (const f of G) { const m = f.match(/^on\((\w+),(\w+)\)$/); if (m) { if (G.has(`clear(${m[2]})`) || G.has(`ontable(${m[1]})`) || G.has(`holding(${m[1]})`) || G.has(`holding(${m[2]})`) || m[1] === m[2]) return false;
        for (const g of G) { const k = g.match(/^on\((\w+),(\w+)\)$/); if (k && g !== f && (k[1] === m[1] || k[2] === m[2])) return false; } }
        const o = f.match(/^ontable\((\w+)\)$/); if (o && G.has(`holding(${o[1]})`)) return false;
        const c = f.match(/^clear\((\w+)\)$/); if (c && G.has(`holding(${c[1]})`)) return false; }
      return true;
    };
    const key = G => [...G].sort().join(" ");
    const OPEN = [{ G: new Set(P.goal), plan: [] }], seen = new Set([key(new Set(P.goal))]);
    let exp = 0;
    while (OPEN.length && exp < limit) {
      const { G, plan } = OPEN.shift();
      if ([...G].every(f => P.init.has(f))) {
        steps.push({ caption: `The initial state satisfies ${[...G].join(" ∧ ")}. Plan (${plan.length} steps): ${plan.join(", ")}`, blocks: Object.assign(BW.stacksFromState(P.blocks, P.init), { goal: P.goalDraw }),
          lists: [{ label: "PLAN", items: plan.map(x => ({ text: x, state: "open" })) }], stats: [{ label: "plan length", value: plan.length, state: "ok" }, { label: "expanded", value: exp }] });
        return { steps, result: { plan, expanded: exp } };
      }
      exp++;
      const rel = P.ops.filter(o => o.add.some(a => G.has(a)) && !o.del.some(d => G.has(d)));
      const made = [];
      rel.forEach(o => { const N = new Set([...G].filter(f => !o.add.includes(f)).concat(o.pre)); const k = key(N); if (consistent(N) && !seen.has(k)) { seen.add(k); OPEN.push({ G: N, plan: [o.name].concat(plan) }); made.push(o.name); } });
      if (exp <= 40) steps.push({ caption: `Regress goal set #${exp} {${[...G].sort().join(", ")}}: relevant ${rel.map(o => o.name).join(", ") || "none"}; ${made.length} consistent new goal sets`,
        blocks: Object.assign(BW.stacksFromState(P.blocks, P.init), { goal: P.goalDraw }),
        lists: [{ label: "GOALS", items: [...G].sort().map(f => ({ text: f, state: P.init.has(f) ? "closed" : "open" })) }, { label: "PLAN", items: plan.map(x => ({ text: x, state: "plain" })) }],
        stats: [{ label: "expanded", value: exp }, { label: "OPEN", value: OPEN.length }] });
    }
    steps.push({ caption: `Stopped after ${exp} expansions`, blocks: Object.assign(BW.stacksFromState(P.blocks, P.init), { goal: P.goalDraw }) });
    return { steps, result: { plan: null, expanded: exp } };
  },
});
