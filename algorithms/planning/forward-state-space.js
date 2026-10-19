/* Forward state-space planning: breadth-first search from the initial state, applying STRIPS operators. */
Studio.register({
  id: "plan-forward",
  name: "Forward state-space planning",
  family: "Planning",
  week: 8,
  problem: "planning",
  order: 10,
  summary: "Search forward from the initial state: every applicable operator gives a successor state. Breadth-first search returns a shortest plan, but the branching factor is the number of applicable actions.",
  pseudocode: `OPEN ← [(init, plan = [ ])];  seen ← {init}
while OPEN not empty
    (S, plan) ← head(OPEN)
    if goal ⊆ S: return plan
    for each operator O with pre(O) ⊆ S
        S' ← (S − del(O)) ∪ add(O)
        if S' not seen: append (S', plan + [O])
return failure`,
  complexity: "Breadth-first in the state space: O(b^d) for plan length d",
  learn: {
    "intro": "A planning problem gives an initial state, a goal and operators described in STRIPS form: each operator has preconditions, an add list and a delete list. In the blocks world the operators are pickup, putdown, stack and unstack, and AE means the arm is empty. Forward planning simply searches the state space from the initial state.",
    "definition": "Breadth-first search where a node is a state (a set of facts) and an edge applies an operator whose preconditions hold: S' = (S − delete) ∪ add.",
    "steps": [
      [
        "start from the initial state",
        ""
      ],
      [
        "apply every applicable operator",
        "Preconditions must all be true in the state."
      ],
      [
        "S' = (S − del) ∪ add",
        "STRIPS semantics: everything not deleted stays true."
      ],
      [
        "stop when the goal facts all hold",
        "BFS gives a shortest plan."
      ]
    ],
    "formulas": [
      {
        "f": "S' = (S − del(O)) ∪ add(O)",
        "read": "remove the delete list, add the add list",
        "why": "The STRIPS assumption: an action changes only what it explicitly says."
      }
    ],
    "why": "Simple and complete, but the branching factor is every applicable action, most of them irrelevant to the goal.",
    "traps": [
      "Applicable is not the same as relevant: forward search wastes effort on irrelevant actions."
    ],
    "props": {
      "complete": "yes",
      "optimal": "shortest plan (BFS)",
      "time": "O(b^d)",
      "space": "O(b^d)"
    }
  },
  params: [{ key: "limit", label: "Stop after expanding", type: "int", default: 400 }],
  run(P, { limit }) {
    const BW = Studio.blocks, steps = [];
    const OPEN = [{ s: P.init, plan: [] }], seen = new Set([BW.key(P.init)]);
    let exp = 0;
    while (OPEN.length && exp < limit) {
      const { s, plan } = OPEN.shift();
      const draw = BW.stacksFromState(P.blocks, s);
      if ([...P.goalSet].every(g => s.has(g))) {
        steps.push({ caption: `Goal reached after ${exp} expansions. Plan (${plan.length} steps): ${plan.join(", ")}`, blocks: Object.assign(draw, { goal: P.goalDraw }),
          lists: [{ label: "PLAN", items: plan.map(x => ({ text: x, state: "open" })) }], stats: [{ label: "plan length", value: plan.length, state: "ok" }, { label: "expanded", value: exp }] });
        // replay the plan
        let st = P.init;
        plan.forEach((a, i) => { const op = P.ops.find(o => o.name === a); st = BW.apply(op, st); steps.push({ caption: `Replay ${i + 1}/${plan.length}: ${a}`, blocks: Object.assign(BW.stacksFromState(P.blocks, st), { goal: P.goalDraw }), lists: [{ label: "PLAN", items: plan.map((x, k) => ({ text: x, state: k === i ? "open" : k < i ? "closed" : "plain" })) }] }); });
        return { steps, result: { plan, expanded: exp } };
      }
      exp++;
      const app = P.ops.filter(o => BW.applicable(o, s));
      const added = [];
      app.forEach(o => { const n = BW.apply(o, s), k = BW.key(n); if (!seen.has(k)) { seen.add(k); OPEN.push({ s: n, plan: plan.concat([o.name]) }); added.push(o.name); } });
      if (exp <= 40 || OPEN.length === 0) steps.push({ caption: `Expand state #${exp} (plan so far: ${plan.join(", ") || "none"}): applicable ${app.map(o => o.name).join(", ")}; ${added.length} new states`,
        blocks: Object.assign(draw, { goal: P.goalDraw }), lists: [{ label: "STATE", items: [...s].sort().map(f => ({ text: f, state: P.goalSet.has(f) ? "open" : "plain" })) }],
        stats: [{ label: "expanded", value: exp }, { label: "OPEN", value: OPEN.length }] });
    }
    steps.push({ caption: `Stopped after ${exp} expansions without reaching the goal`, blocks: Object.assign(BW.stacksFromState(P.blocks, P.init), { goal: P.goalDraw }) });
    return { steps, result: { plan: null, expanded: exp } };
  },
});
