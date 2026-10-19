/* Partial Order Planning: plan-space search with causal links, open conditions and threat resolution. */
Studio.register({
  id: "plan-pop",
  name: "Partial Order Planning",
  family: "Planning",
  week: 8,
  problem: "planning",
  order: 40,
  summary: "Search in the space of partial plans. Start with steps Start (effects = initial state) and Finish (preconditions = goal). Repeatedly pick an open precondition, support it with an existing or a new step via a causal link, and resolve threats by promotion or demotion. Backtrack when stuck.",
  pseudocode: `plan ← {Start, Finish}, Start < Finish, agenda ← goal preconditions of Finish
while agenda not empty
    (p, S) ← pick an open precondition
    choose an achiever A: an existing step that adds p and may precede S, or a new step from the operators
    add causal link A →p→ S and ordering A < S;  if A is new: add A's preconditions to the agenda
    for every step K that deletes p and could fall between A and S (a threat):
        demote (K < A) or promote (S < K), keeping the orderings acyclic
    if no choice works: backtrack
return any linearisation of the steps`,
  complexity: "Exponential in the worst case; avoids committing to an order until it must",
  learn: {
    "intro": "A planning problem gives an initial state, a goal and operators described in STRIPS form: each operator has preconditions, an add list and a delete list. In the blocks world the operators are pickup, putdown, stack and unstack, and AE means the arm is empty. Partial Order Planning searches the space of plans instead of states, adding steps and orderings only when it must.",
    "definition": "A partial plan has steps, ordering constraints, causal links (A achieves p for B) and open preconditions. Repeatedly support an open precondition with an existing or new step, then resolve threats (a step that deletes p and could fall between A and B) by ordering it before A (demotion) or after B (promotion). Backtrack on failure.",
    "steps": [
      [
        "Start < Finish",
        "Start's effects are the initial state; Finish's preconditions are the goal."
      ],
      [
        "pick an open precondition",
        "Here: the most constrained one first."
      ],
      [
        "add a causal link from an achiever",
        "Existing steps first, then new steps."
      ],
      [
        "resolve threats",
        "Demotion or promotion, keeping the order acyclic."
      ],
      [
        "no open preconditions → done",
        "Any linearisation of the steps is a valid plan."
      ]
    ],
    "formulas": [
      {
        "f": "threat: K deletes p and possibly A < K < B for link A →p→ B",
        "read": "a step that could undo a protected condition",
        "why": "Ordering K outside the interval keeps every causal link safe, which guarantees the plan works."
      },
      {
        "f": "least commitment",
        "read": "order steps only when forced",
        "why": "Avoids the interaction problems that make linear planners fail on the Sussman anomaly."
      }
    ],
    "why": "Finds the optimal 6-step plan for the Sussman anomaly by interleaving subgoals; the search can be expensive.",
    "traps": [
      "Check threats for new links and for new steps.",
      "Never order a step before Start or after Finish."
    ],
    "props": {
      "complete": "yes (with systematic search)",
      "optimal": "shortest plan with iterative deepening",
      "time": "exponential in the worst case",
      "space": "O(plan size) per partial plan"
    }
  },
  params: [{ key: "limit", label: "Stop after plans explored (per bound)", type: "int", default: 20000 }],
  run(P, { limit }) {
    const BW = Studio.blocks, steps = [];
    let explored = 0, recorded = 0;
    const reach = (ord, a, b) => { // is a < b implied?
      const seen = new Set([a]), q = [a]; while (q.length) { const x = q.shift(); for (const [u, v] of ord) if (u === x && !seen.has(v)) { if (v === b) return true; seen.add(v); q.push(v); } } return false; };
    const canOrder = (ord, a, b) => a !== b && !reach(ord, b, a);
    const linear = pl => { const ids = pl.steps.map(s => s.id), out = []; const done = new Set(); while (out.length < ids.length) { const nx = ids.find(i => !done.has(i) && pl.ord.every(([u, v]) => v !== i || done.has(u))); if (!nx) break; done.add(nx); out.push(nx); } return out.map(i => pl.steps.find(s => s.id === i)).filter(s => s.op).map(s => s.op.name); };
    const snap = (pl, cap, final) => {
      if (recorded > 220 && !final) return; recorded++;
      steps.push({ caption: cap, blocks: Object.assign(BW.stacksFromState(P.blocks, P.init), { goal: P.goalDraw }),
        lists: [{ label: "STEPS", items: pl.steps.filter(s => s.op).map(s => ({ text: `${s.id}:${s.op.name}`, state: "open" })) },
          { label: "LINKS", items: pl.links.map(([a, p, b]) => ({ text: `${a}→${p}→${b}`, state: "plain" })) },
          { label: "AGENDA", items: pl.agenda.map(([p, s]) => ({ text: `${p}@${s}`, state: "alt" })) }],
        table: { title: "orderings", columns: ["before", "after"], rows: pl.ord.filter(([u, v]) => !(u === "S0" || v === "F")).map(([u, v]) => [u, v]) },
        stats: [{ label: "plans explored", value: explored }, { label: "open conditions", value: pl.agenda.length }] });
    };
    const start = { id: "S0", add: [...P.init], del: [], pre: [], op: null }, finish = { id: "F", add: [], del: [], pre: P.goal.slice(), op: null };
    const init = { steps: [start, finish], ord: [["S0", "F"]], links: [], agenda: P.goal.map(g => [g, "F"]), n: 0 };
    const resolveThreats = (pl, i = 0) => {
      // returns list of consistent plans after resolving all threats (depth-first over choices)
      for (; i < pl.links.length; i++) {
        const [a, p, b] = pl.links[i];
        for (const k of pl.steps) {
          if (k.id === a || k.id === b || !k.del.includes(p)) continue;
          if (reach(pl.ord, k.id, a) || reach(pl.ord, b, k.id)) continue; // already outside
          const out = [];
          if (canOrder(pl.ord, k.id, a) && a !== "S0") out.push(...resolveThreats(Object.assign({}, pl, { ord: pl.ord.concat([[k.id, a]]) }), i));
          if (canOrder(pl.ord, b, k.id) && b !== "F") out.push(...resolveThreats(Object.assign({}, pl, { ord: pl.ord.concat([[b, k.id]]) }), i));
          return out;
        }
      }
      return [pl];
    };
    let maxSteps = 0, record = false;
    const achievers = (pl, p, sid) => {
      const out = [];
      pl.steps.forEach(s => { if (s.id !== sid && s.add.includes(p) && canOrder(pl.ord, s.id, sid)) out.push({ s, isNew: false }); });
      if (pl.n < maxSteps) P.ops.filter(o => o.add.includes(p)).forEach(o => out.push({ s: { id: "S" + (pl.n + 1), add: o.add, del: o.del, pre: o.pre, op: o }, isNew: true }));
      return out;
    };
    const search = pl => {
      if (++explored > limit) return null;
      if (!pl.agenda.length) return pl;
      // most constrained open condition first
      let pick = 0, best = Infinity;
      pl.agenda.forEach(([p, sid], i) => { const k = achievers(pl, p, sid).length; if (k < best) { best = k; pick = i; } });
      const [p, sid] = pl.agenda[pick];
      const rest = pl.agenda.filter((_, i) => i !== pick);
      for (const c of achievers(pl, p, sid)) {
        const np = { steps: c.isNew ? pl.steps.concat([c.s]) : pl.steps, ord: pl.ord.concat([[c.s.id, sid]]).concat(c.isNew ? [["S0", c.s.id], [c.s.id, "F"]] : []), links: pl.links.concat([[c.s.id, p, sid]]),
          agenda: rest.concat(c.isNew ? c.s.pre.map(q => [q, c.s.id]) : []), n: pl.n + (c.isNew ? 1 : 0) };
        if (record) snap(np, `Open condition ${p} of ${sid}: support it with ${c.isNew ? "new step " + c.s.id + ":" + c.s.op.name : "existing step " + c.s.id + (c.s.op ? ":" + c.s.op.name : " (Start)")}`);
        for (const r of resolveThreats(np)) {
          if (record && r.ord.length > np.ord.length) snap(r, `Threat resolved by ordering ${r.ord.slice(np.ord.length).map(([u, v]) => u + " < " + v).join(", ")}`);
          const out = search(r);
          if (out) return out;
        }
        if (record) snap(np, `Dead end: undo ${c.isNew ? "step " + c.s.op.name : "the link from " + c.s.id}`);
      }
      return null;
    };
    const searchID = () => {
      for (maxSteps = 1; maxSteps <= 2 * P.blocks.length * 2 + 2; maxSteps++) {
        explored = 0; record = false;
        if (search(init)) { explored = 0; record = true; recorded = 0; const sol = search(init); sol.bound = maxSteps; return sol; }
      }
      return null;
    };
    snap(init, `Start plan: S0 (initial state) < F (goal ${P.goal.join(" ∧ ")}); every goal is an open condition`);
    const sol = searchID();
    if (!sol) { steps.push({ caption: `No plan found within ${limit} partial plans`, blocks: Object.assign(BW.stacksFromState(P.blocks, P.init), { goal: P.goalDraw }) }); return { steps, result: { plan: null, explored } }; }
    const plan = linear(sol);
    snap(sol, `Complete plan with ${plan.length} steps (iterative deepening on the number of steps): no open conditions, no threats. One linearisation: ${plan.join(", ")}`, true);
    let st = P.init;
    plan.forEach((a, i) => { st = BW.apply(P.ops.find(o => o.name === a), st); steps.push({ caption: `Execute ${i + 1}/${plan.length}: ${a}`, blocks: Object.assign(BW.stacksFromState(P.blocks, st), { goal: P.goalDraw }), lists: [{ label: "PLAN", items: plan.map((x, k) => ({ text: x, state: k === i ? "open" : k < i ? "closed" : "plain" })) }] }); });
    return { steps, result: { plan, explored } };
  },
});
