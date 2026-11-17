// Stream H: backward chaining (goal tree) and expectiminimax (chance nodes).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const L = Studio.rulesLib;
  const bc = Studio.get("rules-backward-chaining");
  const fam = ex("rules-family"), ani = ex("rules-animals");
  for (const p of [fam, ani]) {
    const fc = new Set(run("rules-forward-chaining", p).facts);
    ok(!!checkRun(bc, p), `backward chaining runs on ${p.id}`);
    const r0 = run("rules-backward-chaining", p);
    ok(r0.proved && fc.has(r0.answer), `${p.id}: the stored goal is proved and is a forward-chaining fact (${r0.answer})`);
    // completeness on ground goals: every derived fact is proved backward
    for (const f of fc) { const r = run("rules-backward-chaining", p, { goal: f }); ok(r.proved && r.answer === f, `${p.id}: derived fact ${f} is proved backward`); }
    // soundness: with the last argument left as a variable, any answer is a forward-chaining fact
    for (const f of fc) {
      const t = L.parse(f), g = "(" + t.map((x, i) => (i === t.length - 1 ? "?v" : x)).join(" ") + ")";
      const r = run("rules-backward-chaining", p, { goal: g });
      ok(r.proved && fc.has(r.answer), `${p.id}: ${g} answered with a derivable fact (${r.answer})`);
    }
  }
  eq(run("rules-backward-chaining", fam, { goal: "(grandfather tom ?who)" }).answer, "(grandfather tom ann)", "grandfather tom: first answer ann (by hand: parent tom bob, parent bob ann, male tom)");
  eq(run("rules-backward-chaining", fam, { goal: "(grandfather tom ann)" }).rules.slice().sort(), ["R1", "R3"], "grandfather tom ann uses R3 and R1");
  eq(run("rules-backward-chaining", ani, { goal: "(is cheetah rex)" }).rules.slice().sort(), ["Z1", "Z3", "Z4"], "cheetah rex uses Z4, Z3, Z1");
  for (const [p, g] of [[fam, "(grandfather bob tom)"], [fam, "(father jim ?x)"], [ani, "(is cheetah tweety)"], [ani, "(can migrate rex)"], [ani, "(is zebra rex)"]]) {
    const r = run("rules-backward-chaining", p, { goal: g });
    ok(r.proved === false && r.answer === null, `${p.id}: ${g} is not derivable and is reported unproved`);
    ok(!new Set(run("rules-forward-chaining", p).facts).has(g), `${p.id}: ${g} really is not a forward-chaining fact`);
  }
  // a recursive rule base must terminate (ancestor check)
  const loop = { id: "t-loop", type: "rules", name: "loop", facts: ["(edge a b)", "(edge b c)"], rules: [{ name: "T1", if: ["(edge ?x ?y)"], then: ["(path ?x ?y)"] }, { name: "T2", if: ["(path ?x ?y)", "(path ?y ?z)"], then: ["(path ?x ?z)"] }] };
  ok(run("rules-backward-chaining", loop, { goal: "(path a c)" }).proved, "recursive rules: (path a c) proved");
  ok(!run("rules-backward-chaining", loop, { goal: "(path c a)" }).proved, "recursive rules: (path c a) unproved, and it terminates");
  // the text format keeps the optional goal; problems without a goal still work
  const RT = Studio.types.rules;
  eq(RT.fromText(RT.toText(fam), fam).goal, fam.goal, "goal survives toText/fromText");
  ok(run("rules-backward-chaining", Object.assign({}, fam, { goal: undefined })).proved, "no goal field: falls back to the head of the last rule");

  // ---------- expectiminimax (supplementary) ----------
  const chance = ex("game-chance"), em = "game-expectiminimax";
  ok(!!chance, "game-chance example exists");
  ok(!!checkRun(Studio.get(em), chance), "expectiminimax runs on game-chance");
  // hand-verified: chance node B = 0.5*min(2,8) + 0.5*min(4,6) = 3; chance node C = 0.7*min(5,9) + 0.3*min(0,10) = 3.5; MAX takes C
  const rc = run(em, chance);
  eq(rc.value, 3.5, "expectiminimax value of game-chance is 3.5");
  eq(rc.move, "C", "MAX moves to the second chance node");
  for (const a of ["game-minimax", "game-alpha-beta", "game-sss-star"]) {
    let msg = ""; try { Studio.run(Studio.get(a), chance, {}); } catch (e) { msg = e.message; }
    ok(/chance/.test(msg), `${a} declines the chance tree (${msg || "no error"})`);
  }
  for (const id of ["game-three-ply", "game-four-ply"]) eq(run(em, ex(id)).value, run("game-minimax", ex(id)).value, `expectiminimax = minimax without chance nodes (${id})`);
  eq(run(em, ex("game-three-ply")).value, 3, "expectiminimax on the classic tree is 3");
  for (const seed of [1, 4, 9]) { const g = Studio.types.game.generator.make({ b: 3, d: 3, seed }); checkRun(Studio.get(em), g); eq(run(em, g).value, run("game-minimax", g).value, `expectiminimax = minimax on random tree ${seed}`); }
  let bad = false; try { Studio.prepare({ id: "x", type: "game", root: "MAX", tree: [{ chance: [[0.5, 1], [0.4, 2]] }] }); } catch (e) { bad = true; }
  ok(bad, "chance probabilities that do not sum to 1 are rejected");
  // MIN root over chance nodes: min(0.5*4+0.5*8, 0.25*0+0.75*10) = min(6, 7.5) = 6
  eq(run(em, { id: "t-chance-min", type: "game", root: "MIN", tree: [{ chance: [[0.5, 4], [0.5, 8]] }, { chance: [[0.25, 0], [0.75, 10]] }] }).value, 6, "MIN root over chance nodes");
  const GT = Studio.types.game;
  eq(GT.fromText(GT.toText(chance), chance).tree, chance.tree, "chance tree survives toText/fromText");
};
