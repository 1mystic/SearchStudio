/* Goal Stack Planning (STRIPS-style, linear planner). */
Studio.register({
  id: "plan-gsp",
  name: "Goal Stack Planning",
  family: "Planning",
  week: 8,
  problem: "planning",
  order: 30,
  summary: "Keep a stack of goals and actions. Pop satisfied goals; replace an unsatisfied goal by an action that achieves it plus that action's preconditions; when an action reaches the top its preconditions hold, so apply it. Goals are solved one at a time, which is why the Sussman anomaly makes it undo its own work.",
  pseudocode: `push the conjunct goal, then each goal in it
while the stack is not empty
    x ← top
    if x is a goal that holds in the state: pop
    elif x is an unsatisfied goal: push an action O that achieves it, then O's preconditions (conjunct and each)
    elif x is a conjunct: if all hold pop, else push its unsatisfied goals again
    elif x is an action: pop, apply it to the state, append it to the plan`,
  complexity: "Linear in plan length when goals are independent; may produce long plans with redundant steps",
  learn: {
    "intro": "A planning problem gives an initial state, a goal and operators described in STRIPS form: each operator has preconditions, an add list and a delete list. In the blocks world the operators are pickup, putdown, stack and unstack, and AE means the arm is empty. Goal Stack Planning, the strategy of STRIPS, works through the goals one at a time using a stack.",
    "definition": "Push the conjunctive goal and its parts. Pop goals that hold. Replace an unsatisfied goal with an operator that achieves it and that operator's preconditions. When an operator reaches the top, apply it and add it to the plan. Re-check conjunctions, because later actions can undo earlier goals.",
    "steps": [
      [
        "push conjunct and each goal",
        "The order of the goals matters."
      ],
      [
        "goal holds → pop",
        ""
      ],
      [
        "goal fails → push operator + preconditions",
        "Heuristic choice: stack for on, unstack the block on top for clear, and so on."
      ],
      [
        "operator on top → apply, record",
        "Its preconditions were just achieved."
      ],
      [
        "conjunct broken → push its goals again",
        "This is where the Sussman anomaly costs extra steps."
      ]
    ],
    "formulas": [
      {
        "f": "linear planning: solve g₁, then g₂, … in order",
        "read": "one goal at a time",
        "why": "Fine for independent goals; interacting goals (Sussman anomaly) make it undo its own work."
      }
    ],
    "why": "Fast and easy to trace, but not optimal and sensitive to goal order: on the Sussman anomaly it needs 10 steps where 6 suffice.",
    "traps": [
      "Push preconditions so that the one to achieve first is on top.",
      "Always re-check the conjunct goal after its parts are popped."
    ],
    "props": {
      "complete": "no",
      "optimal": "no",
      "time": "linear in plan length (when it works)",
      "space": "O(plan length)"
    }
  },
  params: [{ key: "goalOrder", label: "Goal order", type: "select", default: "given", options: [["given", "as written (first goal on top)"], ["reversed", "reversed"]] }],
  run(P, { goalOrder }) {
    const BW = Studio.blocks, steps = [];
    let S = new Set(P.init);
    const plan = [];
    const goals = goalOrder === "reversed" ? P.goal.slice().reverse() : P.goal.slice();
    const stack = [{ kind: "conj", goals: goals.slice() }];
    goals.slice().reverse().forEach(g => stack.push({ kind: "goal", g }));
    const show = x => (x.kind === "goal" ? x.g : x.kind === "conj" ? x.goals.join(" ∧ ") : x.op.name);
    const choose = g => {
      let m;
      if ((m = g.match(/^on\((\w+),(\w+)\)$/))) return P.ops.find(o => o.name === `stack(${m[1]},${m[2]})`);
      if ((m = g.match(/^ontable\((\w+)\)$/))) return P.ops.find(o => o.name === `putdown(${m[1]})`);
      if ((m = g.match(/^clear\((\w+)\)$/))) { const top = P.blocks.find(b => S.has(`on(${b},${m[1]})`)); if (top) return P.ops.find(o => o.name === `unstack(${top},${m[1]})`); const h = S.has(`holding(${m[1]})`); return h ? P.ops.find(o => o.name === `putdown(${m[1]})`) : null; }
      if ((m = g.match(/^holding\((\w+)\)$/))) { const under = P.blocks.find(b => S.has(`on(${m[1]},${b})`)); return under ? P.ops.find(o => o.name === `unstack(${m[1]},${under})`) : P.ops.find(o => o.name === `pickup(${m[1]})`); }
      if (g === "AE") { const h = P.blocks.find(b => S.has(`holding(${b})`)); return h ? P.ops.find(o => o.name === `putdown(${h})`) : null; }
      return null;
    };
    const snap = cap => steps.push({ caption: cap, blocks: Object.assign(BW.stacksFromState(P.blocks, S), { goal: P.goalDraw }),
      lists: [{ label: "STACK", items: stack.slice().reverse().map((x, i) => ({ text: show(x), state: i === 0 ? "open" : x.kind === "op" ? "alt" : "plain" })) }, { label: "PLAN", items: plan.map(a => ({ text: a, state: "closed" })) }],
      stats: [{ label: "plan length", value: plan.length }, { label: "stack depth", value: stack.length }] });
    snap(`Push the goal ${goals.join(" ∧ ")} and each conjunct; the top is ${show(stack[stack.length - 1])}`);
    for (let guard = 0; guard < 300 && stack.length; guard++) {
      const x = stack[stack.length - 1];
      if (x.kind === "goal") {
        if (S.has(x.g)) { stack.pop(); snap(`${x.g} holds: pop it`); continue; }
        const op = choose(x.g);
        if (!op) { snap(`No operator achieves ${x.g}: Goal Stack Planning fails`); return { steps, result: { plan: null } }; }
        stack.push({ kind: "op", op });
        stack.push({ kind: "conj", goals: op.pre.slice() });
        op.pre.slice().reverse().forEach(g => stack.push({ kind: "goal", g }));
        snap(`${x.g} does not hold: push ${op.name} and its preconditions ${op.pre.join(" ∧ ")}`);
      } else if (x.kind === "conj") {
        const miss = x.goals.filter(g => !S.has(g));
        if (!miss.length) { stack.pop(); snap(`All of ${x.goals.join(" ∧ ")} hold: pop the conjunct`); }
        else { miss.slice().reverse().forEach(g => stack.push({ kind: "goal", g })); snap(`Conjunct ${x.goals.join(" ∧ ")} broken (${miss.join(", ")} undone by later actions): push them again`); }
      } else {
        stack.pop();
        if (!BW.applicable(x.op, S)) { snap(`${x.op.name} is not applicable: preconditions were undone; Goal Stack Planning fails`); return { steps, result: { plan: null } }; }
        S = BW.apply(x.op, S); plan.push(x.op.name);
        snap(`Apply ${x.op.name}; plan length ${plan.length}`);
      }
    }
    const ok = [...P.goalSet].every(g => S.has(g));
    snap(ok ? `Done: ${plan.length}-step plan ${plan.join(", ")}` : "Stopped without achieving the goal");
    return { steps, result: { plan: ok ? plan : null } };
  },
});
