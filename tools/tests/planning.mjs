// Stream E: Graphplan, blocks-world hill climbing (h1 vs h2), means-ends analysis.
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const BW = Studio.blocks;
  const executes = (id, plan) => {
    const Pp = Studio.prepare(ex(id)); let st = Pp.init;
    for (const n of plan) { const o = Pp.ops.find(x => x.name === n); if (!o || !BW.applicable(o, st)) return false; st = BW.apply(o, st); }
    return Pp.goal.every(g => st.has(g));
  };
  const plans = Studio.examples.filter(e => e.type === "planning");
  for (const p of plans) {
    for (const a of ["plan-graphplan", "plan-mea"]) checkRun(Studio.get(a), p);
    for (const h of ["h1", "h2"]) checkRun(Studio.get("plan-hill-climbing"), p, { heuristic: h });
  }

  // Graphplan: executable plans; the number of layers equals the optimal (breadth-first) plan length
  for (const id of ["plan-sussman", "plan-reverse", "plan-hill-terrain"]) {
    const g = run("plan-graphplan", ex(id)), f = run("plan-forward", ex(id));
    ok(!!g.plan && executes(id, g.plan), `Graphplan plan for ${id} executes and reaches the goal`);
    eq(g.levels, f.plan.length, `Graphplan layers on ${id} = breadth-first optimal plan length`);
    eq(g.firstLevel, g.levels, `Graphplan on ${id}: goals first non-mutex at the layer where extraction succeeds`);
  }
  eq(run("plan-graphplan", ex("plan-sussman")).levels, 6, "Graphplan: Sussman anomaly needs 6 layers");
  eq(run("plan-graphplan", ex("plan-reverse")).levels, 6, "Graphplan: tower reversal needs 6 layers");
  eq(run("plan-graphplan", ex("plan-sussman")).plan.length, 6, "Graphplan: Sussman plan has 6 actions");
  const gpSteps = Studio.run(Studio.get("plan-graphplan"), ex("plan-sussman"), {}).steps;
  ok(gpSteps.some(s => /inconsistent effects/.test(s.caption)) && gpSteps.some(s => /interference/.test(s.caption)) && gpSteps.some(s => /competing needs/.test(s.caption)) && gpSteps.some(s => /inconsistent support/.test(s.caption)), "Graphplan captions name all four mutex rules");
  eq(run("plan-graphplan", ex("plan-sussman"), { maxLevels: 3 }).plan, null, "Graphplan stops at the layer limit");

  // Hill climbing: the course example (h1 stuck at +1, h2 reaches the goal in 3 moves)
  const h1 = run("plan-hill-climbing", ex("plan-hill-terrain"), { heuristic: "h1" }), h2 = run("plan-hill-climbing", ex("plan-hill-terrain"), { heuristic: "h2" });
  eq([h1.stuck, h1.reached, h1.finalH, h1.moves.length], [true, false, 1, 0], "h1 gets stuck at +1");
  eq([h2.reached, h2.moves.length], [true, 3], "h2 reaches the goal in 3 moves");
  eq(h2.trace, [-2, -1, 2, 6], "h2 values along the climb");
  eq(h2.moves, ["move(C,table)", "move(B,A)", "move(C,B)"], "h2 moves");

  // Means-ends analysis: works on towers, fails honestly on the Sussman anomaly
  for (const id of ["plan-reverse", "plan-hill-terrain"]) { const m = run("plan-mea", ex(id)); ok(!!m.plan && executes(id, m.plan), `MEA plan for ${id} executes and reaches the goal`); }
  const ms = run("plan-mea", ex("plan-sussman"));
  eq([ms.solved, ms.plan], [false, null], "MEA fails on the Sussman anomaly (undoes its own achievement)");
  ok(/same state/.test(ms.failure), "MEA reports the cycle");
};
