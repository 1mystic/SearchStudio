/* Multi-arm scheduling of a blocks-world plan: a plan from another planner is scheduled onto k arms to shorten the makespan. Week 8. */
Studio.register({
  id: "plan-multi-arm",
  name: "Multi-arm plan scheduling (makespan)",
  family: "Planning",
  week: 8,
  problem: "planning",
  order: 70,
  defaultExample: "plan-parallel-towers",
  summary: "Take a sequential plan from forward, backward or goal-stack planning and run it on k arms at once. Two moves may overlap only if they touch different blocks; moves that share a block keep their order. The number of time steps is the makespan.",
  pseudocode: `plan ← plan from another planner;  group each pick-up with the put-down that follows it into one move
move B must wait for every earlier move A that shares a block with it
for t = 1, 2, 3, ...
    for each free arm, in order:
        take the first not-yet-started move (in plan order) whose earlier moves have all finished
        start it on this arm: pick-up at t, put-down at t + 1
makespan ← last time step used`,
  complexity: "O(m²) for m moves (dependency check between every pair)",
  learn: {
    "intro": "A sequential plan does one action per time step with a single arm. If the robot has k arms, some actions can happen at the same time, and what matters is the makespan: the number of time steps until the goal holds. The question is which actions may overlap. An action can run only when its preconditions hold, and two arms must not work on the same blocks at once. Moves that share no block are independent and can run in parallel; moves that share a block must keep the order the plan gave them.",
    "definition": "A move is a pick-up (pickup or unstack) together with the put-down (putdown or stack) that follows it: the arm is busy for both steps. Move B depends on an earlier move A if they mention a common block. A schedule gives every move a start step and an arm such that dependent moves do not overlap, no arm is asked to do two things at once, and each action's preconditions hold when it runs. The makespan is the number of time steps used. (Scheduling a plan onto several arms is not part of the course notes: this is an extension of the course's single-arm STRIPS operators.)",
    "steps": [
      ["group pick-up and put-down into moves", "The arm is occupied while it holds a block, so the two actions belong together."],
      ["a move depends on earlier moves sharing a block", "They change the same facts (on, clear, holding), so their order matters."],
      ["each time step, give every free arm a ready move", "Ready means all moves it depends on have finished."],
      ["makespan = last time step used", "Compare with the sequential plan length, which is the makespan with one arm."]
    ],
    "formulas": [
      { "f": "makespan ≤ sequential length;  makespan ≥ longest dependency chain", "read": "parallel arms never hurt, and cannot beat the chain of forced orderings", "why": "At every step at least one ready move can run, so no step is wasted; but moves that depend on each other must follow one another whatever the number of arms." },
      { "f": "with k = 1 arm: makespan = sequential length", "read": "one arm does one action per step", "why": "A sanity check: with one arm the schedule collapses to the original plan." }
    ],
    "why": "Plans are not only about getting to the goal: in practice time matters. Splitting the work over several arms shows which parts of a plan are really independent. It also shows why some plans cannot be sped up: the Sussman anomaly is one chain of dependent moves, so extra arms do not help.",
    "traps": [
      "Shared blocks are what link moves: moving C and moving B look separate, but if B must land on C, the second move waits for the first.",
      "More arms do not always help. The longest chain of dependent moves is a lower bound on the makespan.",
      "The plan itself is not changed, only when its actions run. A different plan (for example from goal-stack planning) can leave more room for parallel work than the shortest plan.",
      "This simple scheduler starts moves in plan order. It always meets the sequential bound, but it is not guaranteed to find the shortest possible schedule."
    ],
    "props": { "complete": "yes (always produces a valid schedule)", "optimal": "no (greedy list scheduling)", "time": "O(m²)", "space": "O(m)" }
  },
  params: [
    { key: "k", label: "Arms (k)", type: "int", default: 2, min: 1, max: 4 },
    { key: "planner", label: "Plan from", type: "select", default: "plan-forward", options: [["plan-forward", "Forward state-space planning (shortest)"], ["plan-backward", "Backward state-space planning"], ["plan-gsp", "Goal stack planning"]] },
  ],
  run(P, { k, planner }) {
    const BW = Studio.blocks, steps = [];
    const K = Math.max(1, Math.min(4, Math.round(k) || 2));
    const origin = { id: P.id, type: "planning", name: P.name, blocks: P.blocks, init: BW.stacksFromState(P.blocks, P.init).stacks, goal: P.goal };
    const base = Studio.get(planner) || Studio.get("plan-forward");
    const found = Studio.run(base, origin, { limit: 2000 });
    const plan = found.result.plan;
    const goalView = st => Object.assign(BW.stacksFromState(P.blocks, st), { goal: P.goalDraw });
    if (!plan) {
      steps.push({ caption: `${base.name} did not find a plan for this problem, so there is nothing to schedule. Try another planner or a simpler problem.`, blocks: goalView(P.init) });
      return { steps, result: { plan: null, k: K, planner: base.id } };
    }
    const opOf = n => P.ops.find(o => o.name === n);
    const blocksOf = n => (n.match(/\((\w+)(?:,(\w+))?\)/) || []).slice(1).filter(Boolean);
    // group each pick-up with the put-down that follows it
    const moves = [];
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i], m = a.match(/^(pickup|unstack)\((\w+)/), nx = plan[i + 1];
      if (m && nx && /^(putdown|stack)\(/.test(nx) && blocksOf(nx)[0] === m[2]) { moves.push({ acts: [a, nx] }); i++; }
      else moves.push({ acts: [a] });
    }
    moves.forEach((m, i) => { m.id = i + 1; m.blocks = [...new Set([].concat(...m.acts.map(blocksOf)))].sort(); m.dur = m.acts.length; m.label = m.acts.join(" → "); });
    moves.forEach((m, i) => (m.preds = moves.slice(0, i).filter(o => o.blocks.some(b => m.blocks.includes(b)))));
    const finish = {}; moves.forEach(m => (finish[m.id] = m.dur + Math.max(0, ...m.preds.map(p => finish[p.id]))));
    const critical = Math.max(...moves.map(m => finish[m.id]));
    const n = plan.length;
    steps.push({ caption: `${base.name} found a plan of ${n} actions: ${plan.join(", ")}. With one arm, one action per time step, the makespan is ${n}. With ${K} arm${K === 1 ? "" : "s"}, which of these actions can happen at the same time?`,
      blocks: goalView(P.init), lists: [{ label: "PLAN", items: plan.map(x => ({ text: x, state: "open" })) }], stats: [{ label: "sequential length", value: n }, { label: "arms", value: K }] });
    steps.push({ caption: `Group each pick-up with the put-down after it into a move (the arm is busy while it holds the block): ${moves.length} move${moves.length === 1 ? "" : "s"}. A move must wait for every earlier move that shares a block with it, because they change the same facts. Moves on different blocks are independent. The longest chain of waiting moves takes ${critical} step${critical === 1 ? "" : "s"}, so no number of arms can beat ${critical}.`,
      blocks: goalView(P.init), table: { title: "moves and what they wait for", columns: ["move", "actions", "blocks", "waits for move"], rows: moves.map(m => [m.id, m.label, m.blocks.join(","), m.preds.length ? m.preds.map(p => p.id).join(",") : { t: "nothing", s: "ok" }]) },
      stats: [{ label: "moves", value: moves.length }, { label: "longest chain", value: critical }] });
    // list scheduling in plan order
    const free = Array(K).fill(0), sched = [], start = {}, arm = {};
    const done = m => start[m.id] !== undefined, endOf = m => start[m.id] + m.dur - 1;
    let st = P.init, t = 0, valid = true;
    const grid = [];   // grid[t-1][a] = action text
    while (moves.some(m => !done(m) || endOf(m) > t) && t < 4 * n + 4) {
      t++;
      const row = Array(K).fill(null), notes = [], touched = [];
      // arms in the middle of a move do the put-down now
      for (let a = 0; a < K; a++) if (free[a] >= t) { const m = moves.find(x => arm[x.id] === a && start[x.id] + x.dur - 1 >= t && start[x.id] < t); if (m) { row[a] = { act: m.acts[t - start[m.id]], note: "put the held block down" }; touched.push(m); } }
      for (let a = 0; a < K; a++) {
        if (row[a] || free[a] >= t) continue;
        const m = moves.find(x => !done(x) && x.preds.every(p => done(p) && endOf(p) < t));
        if (!m) continue;
        start[m.id] = t; arm[m.id] = a; free[a] = t + m.dur - 1;
        row[a] = { act: m.acts[0], note: m.acts.length > 1 ? `starts move ${m.id}` : `move ${m.id}` };
      }
      // execute this time step (actions of one step touch different blocks, so their order does not matter)
      const acts = [];
      for (let a = 0; a < K; a++) if (row[a]) {
        const op = opOf(row[a].act), pre = op.pre.filter(f => f !== "AE");
        const hold = pre.every(f => st.has(f));
        if (!hold) valid = false;
        notes.push(`arm ${a + 1} does ${row[a].act}${row[a].note === "put the held block down" ? " (the block it holds goes down)" : pre.length ? ` (needs ${pre.join(", ")}: ${hold ? "all true" : "NOT all true"})` : ""}`);
        acts.push(op); sched.push({ t, arm: a + 1, action: row[a].act });
      }
      acts.forEach(op => (st = BW.apply(op, st)));
      grid.push(row.map(c => (c ? c.act : "")));
      const waiting = moves.find(x => !done(x));
      const blockers = waiting ? waiting.preds.filter(p => !(done(p) && endOf(p) < t)) : [];
      const idleWhy = !waiting ? "nothing is left to do" : blockers.length ? `move ${waiting.id} (${waiting.label}) must wait for move${blockers.length === 1 ? "" : "s"} ${blockers.map(p => p.id).join(", ")}, which ${blockers.length === 1 ? "shares" : "share"} a block with it` : "no further move is ready";
      const idle = []; for (let a = 0; a < K; a++) if (!row[a]) idle.push(`arm ${a + 1} is idle: ${idleWhy}`);
      const dr = BW.stacksFromState(P.blocks, st), held = P.blocks.filter(b => st.has(`holding(${b})`));
      steps.push({ caption: `Time step ${t}: ${notes.join("; ")}.${idle.length ? " " + idle.join("; ") + "." : ""}`,
        blocks: Object.assign(dr, { holding: held.length ? held.join("+") : null, goal: P.goalDraw }),
        table: { title: "schedule so far (time × arm)", columns: ["t"].concat(Array.from({ length: K }, (_, a) => `arm ${a + 1}`)), rows: grid.map((r, i) => [i + 1].concat(r.map(c => c || "—"))), rowStates: grid.map((_, i) => (i === grid.length - 1 ? "cur" : "")) },
        stats: [{ label: "time step", value: t }, { label: "actions done", value: sched.length + " / " + n }, { label: "sequential length", value: n }] });
    }
    const makespan = t, reaches = P.goal.every(g => st.has(g));
    steps.push({ caption: `Makespan ${makespan} with ${K} arm${K === 1 ? "" : "s"} against ${n} for one arm${makespan < n ? `: ${n - makespan} step${n - makespan === 1 ? "" : "s"} saved (speed-up ${(n / makespan).toFixed(2)}×)` : ": no saving"}. ${makespan === critical ? `This equals the longest dependency chain (${critical}), so no schedule could be faster.` : `The longest dependency chain is ${critical}, so the best possible would be at least ${critical}.`} ${K > 1 && makespan === n ? "Every move waits for the one before it, so extra arms cannot help this plan." : ""}${reaches && valid ? " Executing the schedule in time order reaches the goal." : " Warning: the schedule did not reach the goal."}`,
      blocks: goalView(st), table: { title: "final schedule (time × arm)", columns: ["t"].concat(Array.from({ length: K }, (_, a) => `arm ${a + 1}`)), rows: grid.map((r, i) => [i + 1].concat(r.map(c => c || "—"))), rowStates: grid.map(() => "") },
      stats: [{ label: "makespan", value: makespan, state: makespan < n ? "ok" : "" }, { label: "sequential length", value: n }, { label: "longest chain", value: critical }] });
    return { steps, result: { plan, k: K, planner: base.id, moves: moves.map(m => ({ id: m.id, actions: m.acts, blocks: m.blocks, after: m.preds.map(p => p.id), start: start[m.id], arm: arm[m.id] + 1 })), schedule: sched, makespan, sequential: n, critical, valid: valid && reaches } };
  },
});
