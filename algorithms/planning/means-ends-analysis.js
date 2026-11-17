/* Means-ends analysis (GPS style) on the blocks world: difference table, most important difference first, recursive sub-goaling. */
Studio.register({
  id: "plan-mea",
  name: "Means-ends analysis",
  family: "Planning",
  week: 8,
  problem: "planning",
  order: 50,
  summary: "Compare the current state with the goal, pick the most important difference, look up an operator that removes it in the difference table, and recursively make that operator's preconditions true first. No protection of earlier achievements, so interacting goals (Sussman) defeat it.",
  pseudocode: `MEA(state, goal):
    while goal ⊄ state
        d ← the most important difference (goal fact not in state)
        O ← operator that adds d            // from the difference table
        MEA(state, pre(O))                  // sub-goal: make O applicable
        if O is not applicable: fail
        state ← apply(O, state)
    return`,
  complexity: "Depends on the difference table; no guarantee of termination without a loop check",
  learn: {
    "intro": "Means-ends analysis (the idea behind Newell and Simon's General Problem Solver) works from differences. Compare the current state with the goal, choose the most important difference, and find an operator that reduces it. If the operator cannot be applied yet, its preconditions become a new sub-goal, solved by the same procedure. The difference table says which operator removes which kind of difference.",
    "definition": "Difference table for the blocks world: on(x,y) is removed by stack(x,y); ontable(x) by putdown(x); clear(x) by unstack(z,x) for the block z on x; holding(x) by pickup(x) (x on the table) or unstack(x,y); AE by putdown of the held block. Importance: positional differences first, lower blocks of the goal tower before higher ones (a tower is built from the bottom), then clear, then AE, then holding. Sub-goals are solved in the same importance order. Because MEA never protects facts it has already achieved, a later sub-goal can undo an earlier one: on the Sussman anomaly it keeps destroying and re-making the same facts and the loop check stops it.",
    "steps": [
      ["list the differences between state and goal", "Goal facts that do not hold."],
      ["choose the most important difference", "Build the goal tower from its bottom upwards."],
      ["look up an operator in the difference table", "Operators whose add list contains the difference."],
      ["make its preconditions true (recursion)", "Sub-goaling: the unmet preconditions are a smaller goal."],
      ["apply the operator and repeat", "Re-compute the differences: earlier ones may have come back."]
    ],
    "formulas": [
      { "f": "difference = goal − state", "read": "goal facts not currently true", "why": "These are exactly what remains to be achieved." }
    ],
    "why": "It is the first goal-directed planner: instead of blind search it only considers operators relevant to a difference. Its failure on interacting goals motivates goal protection, partial-order planning and Graphplan.",
    "traps": [
      "MEA is not complete: it does not protect earlier achievements, so it can undo its own work and cycle (the Sussman anomaly).",
      "The result depends on the importance ordering and on the difference table; a different table can succeed where this one fails.",
      "A sub-goal may clobber a fact achieved earlier: after each operator, recompute all differences."
    ],
    "props": { "complete": "no", "optimal": "no", "time": "depends on the differences", "space": "depth of sub-goaling" }
  },
  params: [{ key: "maxOps", label: "Operator limit", type: "int", default: 40 }],
  run(P, { maxOps }) {
    const BW = Studio.blocks, steps = [];
    const goals = [...new Set(P.goal)];
    const height = {}; // goal tower height of x in on(x,y): 1 + height(y)
    const supp = {}; goals.forEach(g => { const m = g.match(/^on\((\w+),(\w+)\)$/); if (m) supp[m[1]] = m[2]; });
    const hgt = x => (supp[x] ? 1 + hgt(supp[x]) : 0);
    const rank = d => { const m = d.match(/^on\((\w+),/); if (m) return hgt(m[1]); if (/^ontable/.test(d)) return 0; if (/^clear/.test(d)) return 20; if (d === "AE") return 30; return 40; };
    const order = ds => ds.slice().sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
    let st = P.init; const plan = [], seen = new Set([BW.key(st)]), stack = [];
    const opByName = n => P.ops.find(o => o.name === n);
    const choose = (d, s) => {
      let m;
      if ((m = d.match(/^on\((\w+),(\w+)\)$/))) return `stack(${m[1]},${m[2]})`;
      if ((m = d.match(/^ontable\((\w+)\)$/))) return `putdown(${m[1]})`;
      if ((m = d.match(/^clear\((\w+)\)$/))) { const z = P.blocks.find(b => s.has(`on(${b},${m[1]})`)); return z ? `unstack(${z},${m[1]})` : s.has(`holding(${m[1]})`) ? `putdown(${m[1]})` : null; }
      if ((m = d.match(/^holding\((\w+)\)$/))) { const x = m[1]; if (s.has(`ontable(${x})`)) return `pickup(${x})`; const y = P.blocks.find(b => s.has(`on(${x},${b})`)); return y ? `unstack(${x},${y})` : null; }
      if (d === "AE") { const h = P.blocks.find(b => s.has(`holding(${b})`)); return h ? `putdown(${h})` : null; }
      return null;
    };
    const diffTable = (target, s, chosen) => ({ title: "Difference table (importance order)", columns: ["difference", "importance", "operator that removes it", "preconditions not yet true"],
      rows: order(target.filter(f => !s.has(f))).map(d => { const o = choose(d, s), op = o && opByName(o); return [{ t: d, s: d === chosen ? "warn" : "" }, rank(d), o || "none", op ? op.pre.filter(f => !s.has(f)).join(" ") || "none: applicable" : ""]; }) });
    const view = () => ({ blocks: Object.assign(BW.stacksFromState(P.blocks, st), { goal: P.goalDraw }), lists: [{ label: "SUB-GOAL STACK", items: stack.map((d, i) => ({ text: "  ".repeat(i) + d, state: i === stack.length - 1 ? "open" : "plain" })) }].concat([{ label: "PLAN", items: plan.map(x => ({ text: x, state: "closed" })) }]) });
    let failure = null;
    const achieve = (target, label) => {
      for (let guard = 0; guard < 20; guard++) {
        const diffs = order(target.filter(f => !st.has(f)));
        if (!diffs.length) return true;
        const d = diffs[0], name = choose(d, st);
        if (!name) { failure = `no operator in the difference table removes ${d} in this state`; return false; }
        if (stack.includes(d)) { failure = `sub-goal ${d} is already being pursued higher up the stack: MEA is going round in a circle`; steps.push(Object.assign({ caption: `${label}: difference ${d} again, but ${d} is already on the sub-goal stack, so the recursion loops. Means-ends analysis has no way out and gives up.`, table: diffTable(target, st, d) }, view())); return false; }
        const op = opByName(name);
        steps.push(Object.assign({ caption: `${label}: differences ${diffs.join(", ")}. ${d} is the most important; the difference table says ${name} removes it${op.pre.every(f => st.has(f)) ? " and it is applicable now." : `, but ${op.pre.filter(f => !st.has(f)).join(", ")} must be made true first: sub-goal.`}`, table: diffTable(target, st, d) }, view()));
        stack.push(d);
        const okp = achieve(op.pre, `Sub-goal for ${name}`);
        stack.pop();
        if (!okp) return false;
        if (!BW.applicable(op, st)) { failure = `${name} is not applicable after its sub-goals were solved (they undid each other)`; return false; }
        if (plan.length >= maxOps) { failure = `operator limit (${maxOps}) reached`; return false; }
        st = BW.apply(op, st); plan.push(name);
        const k = BW.key(st);
        steps.push(Object.assign({ caption: `Apply ${name}: ${d} now holds. Recompute the differences: earlier ones may have come back.${seen.has(k) ? " This state was seen before: the procedure is repeating itself." : ""}` }, view()));
        if (seen.has(k)) { failure = "the same state was reached twice: MEA is cycling because later sub-goals undo earlier achievements"; return false; }
        seen.add(k);
      }
      failure = "no progress after 20 rounds"; return false;
    };
    steps.push({ caption: `Start: goal ${goals.join(", ")}. Means-ends analysis compares state and goal, picks the most important difference and works on it, building the goal tower from the bottom.`, ...view() });
    const success = achieve(goals, "Goal");
    if (success) { steps.push(Object.assign({ caption: `No differences remain: goal reached with ${plan.length} operators: ${plan.join(", ")}.` }, view(), { stats: [{ label: "plan length", value: plan.length, state: "ok" }] })); return { steps, result: { plan, solved: true } }; }
    steps.push(Object.assign({ caption: `Failure: ${failure}. Operators tried so far: ${plan.join(", ") || "none"}.` }, view(), { stats: [{ label: "operators applied", value: plan.length, state: "bad" }] }));
    return { steps, result: { plan: null, solved: false, attempt: plan, failure } };
  },
});
