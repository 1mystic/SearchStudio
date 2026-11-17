// Week 11-12 constraint processing: look-ahead (partial / full / MAC), CBJ, nogood recording, path consistency, logic as propagation.
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const C = Studio.cspLib;
  const satisfies = (P, A) => P.cons.every(c => C.ok(c, c.scope[0], A[c.scope[0]], c.scope[1], A[c.scope[1]]));
  const LA = ["csp-lookahead-partial", "csp-lookahead-full", "csp-lookahead-mac"];
  const NEW = LA.concat(["csp-cbj", "csp-nogood", "csp-path-consistency"]);

  // library: every new algorithm is registered with the right week and family
  const fam = { "csp-lookahead-partial": "Constraint processing · lookahead", "csp-lookahead-full": "Constraint processing · lookahead", "csp-lookahead-mac": "Constraint processing · lookahead", "csp-cbj": "Constraint processing · lookback", "csp-nogood": "Constraint processing · lookback", "csp-path-consistency": "Constraint processing" };
  for (const id of NEW) { const a = Studio.get(id); ok(!!a, `${id} is registered`); if (a) { eq(a.family, fam[id], `${id} family`); eq(a.week, id === "csp-path-consistency" ? 11 : 12, `${id} week`); } }

  // random CSPs (seeded): a few variables, small domains, neq / lt constraints; some unsatisfiable
  const randomCsp = seed => {
    const r = Studio.rng(seed), n = 5 + r.int(2), d = 3;
    const variables = Array.from({ length: n }, (_, i) => ({ id: "V" + (i + 1), domain: Array.from({ length: d }, (_, k) => k + 1), x: Math.cos(i), y: Math.sin(i) }));
    const constraints = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (r() < 0.55) constraints.push({ scope: ["V" + (i + 1), "V" + (j + 1)], rel: r() < 0.7 ? "neq" : "lt" });
    if (!constraints.length) constraints.push({ scope: ["V1", "V2"], rel: "neq" });
    return { id: "rand-csp-" + seed, type: "csp", name: "random CSP " + seed, variables, constraints };
  };
  const brute = P => { const A = {}; const go = i => { if (i === P.ids.length) return satisfies(P, A); for (const a of P.dom[P.ids[i]]) { A[P.ids[i]] = a; if (go(i + 1)) return true; } return false; }; return go(0); };
  const randoms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(randomCsp).concat([Studio.types.csp.generator.make({ n: 5 }), Studio.types.csp.generator.make({ n: 6 })]);
  let sat = 0, unsat = 0;
  for (const p of [ex("csp-australia"), ex("csp-chain"), ex("csp-lookahead-gw"), ex("csp-cbj-jump"), ex("csp-nogood-learn")].concat(randoms)) {
    const Pc = Studio.prepare(p), possible = brute(Pc);
    possible ? sat++ : unsat++;
    const bt = run("csp-backtracking", p).solution;
    for (const id of LA.concat(["csp-cbj", "csp-nogood"])) {
      checkRun(Studio.get(id), p);
      if (LA.includes(id)) checkRun(Studio.get(id), p, { mrv: "mrv" });
      const r = run(id, p), s = r.solution;
      ok(possible ? !!s && satisfies(Pc, s) : s === null, `${id} on ${p.id}: solution satisfies all constraints (or none exists)`);
      if (id === "csp-cbj" || id === "csp-nogood") eq(s, bt, `${id} finds the same solution as backtracking on ${p.id}`);
      if (id === "csp-cbj" || id === "csp-nogood") ok(r.nodes <= run("csp-backtracking", p).nodes, `${id} visits ≤ backtracking nodes on ${p.id}`);
    }
    // look-ahead (given order): never more nodes than forward checking, and MAC ≤ full ≤ forward checking
    const fc = run("csp-forward-checking", p).nodes, nodes = LA.map(id => run(id, p).nodes);
    nodes.forEach((n, i) => ok(n <= fc, `${LA[i]} explores ≤ nodes than forward checking on ${p.id} (${n} vs ${fc})`));
    checkRun(Studio.get("csp-path-consistency"), p);
    const pc = run("csp-path-consistency", p);
    if (possible) ok(!pc.inconsistent, `path consistency does not refute the satisfiable ${p.id}`);
  }
  ok(sat > 0 && unsat > 0, `random set has both satisfiable (${sat}) and unsatisfiable (${unsat}) problems`);

  // ---- the lecturer's example: after G = W, D(E) is empty under look-ahead / AC, forward checking does not see it
  const gw = ex("csp-lookahead-gw"), Pgw = Studio.prepare(gw);
  const after = mode => { const D = Object.fromEntries(Pgw.ids.map(v => [v, Pgw.dom[v].slice()])); return C.lookahead.apply(Pgw, D, {}, "G", "W", mode, Pgw.ids); };
  const fcG = after("fc");
  eq(fcG.wipe, null, "FC after G=W: no domain is empty");
  eq(fcG.D.E, ["R", "Y"], "FC after G=W: D(E) is still {R,Y}");
  eq(fcG.D.N.concat(fcG.D.S), ["R", "Y"], "FC after G=W: N={R}, S={Y}");
  eq(after("partial").wipe, null, "partial look-ahead (E last in the order) does not see the wipe-out at G=W");
  eq(after("full").wipe, { by: "lookahead", v: "E" }, "full look-ahead: D(E) empty after G=W");
  eq(after("mac").wipe, { by: "lookahead", v: "E" }, "MAC: D(E) empty after G=W");
  const fcStep = Studio.run(Studio.get("csp-forward-checking"), gw, {}).steps.find(s => /^G = W/.test(s.caption));
  ok(fcStep && /forward check/.test(fcStep.caption) && !/empties/.test(fcStep.caption) && fcStep.table.rows.find(r => r[0] === "E")[1] === "{R,Y}", "the forward-checking trace accepts G = W with D(E) = {R,Y}");
  for (const [id, n] of [["csp-forward-checking", 7], ["csp-lookahead-partial", 6], ["csp-lookahead-full", 5], ["csp-lookahead-mac", 5]]) eq(run(id, gw).nodes, n, `${id} nodes on the G=W example`);
  const ev = run("csp-lookahead-full", gw).events[0];
  eq([ev.var, ev.value, ev.wipe.by, ev.wipe.v], ["G", "W", "lookahead", "E"], "full look-ahead rejects the very first value G=W because of E");
  eq(run("csp-lookahead-full", gw).lookaheadOnlyDeadEnds, 1, "one dead end seen only by the look-ahead");
  eq(run("csp-lookahead-full", gw).solution, { G: "R", N: "W", S: "W", E: "R" }, "solution of the G=W example");
  // extra pruning is reported separately from forward checking
  const australia = run("csp-lookahead-mac", ex("csp-australia"));
  ok(australia.extraPruned > 0, "MAC prunes values beyond forward checking on Australia");
  const aStep = Studio.run(Studio.get("csp-lookahead-mac"), ex("csp-australia"), {}).steps[1];
  ok(aStep.table.columns.includes("extra pruned") && aStep.stats.some(s => /extra/.test(s.label)), "look-ahead trace shows FC vs extra pruning");

  // ---- conflict-directed backjumping: D → A skipping B and C
  const cj = run("csp-cbj", ex("csp-cbj-jump"));
  eq(cj.jumps.length, 1, "CBJ makes one jump");
  eq([cj.jumps[0].from, cj.jumps[0].to, cj.jumps[0].skipped], ["D", "A", ["B", "C"]], "CBJ jumps from D over B and C to A");
  eq(cj.levelsSkipped, 2, "CBJ skips two levels");
  eq(cj.nodes, 10, "CBJ nodes on the jump example (hand count)");
  eq(cj.solution, { A: "g", B: "x", C: "y", D: "r" }, "CBJ solution");
  ok(run("csp-backtracking", ex("csp-cbj-jump")).nodes > cj.nodes, "CBJ visits fewer nodes than backtracking on the jump example");
  const cjSteps = Studio.run(Studio.get("csp-cbj"), ex("csp-cbj-jump"), {}).steps;
  ok(cjSteps.some(s => /jump back to its deepest member A, skipping B, C/.test(s.caption)), "CBJ caption names the jump target and the skipped variables");

  // ---- nogood recording: {A=r} prunes C=z, B=y, B=z
  const ng = run("csp-nogood", ex("csp-nogood-learn"));
  eq(ng.nogoods, [{ A: "r" }], "nogood {A=r} is the only stored nogood");
  eq(ng.nogoodPrunes, 3, "three values pruned by the stored nogood");
  eq(ng.pruned.map(p => p.var + "=" + p.value), ["C=z", "B=y", "B=z"], "pruned values, in order");
  eq(ng.nodes, 10, "nogood nodes (hand count)");
  eq(ng.solution, run("csp-backtracking", ex("csp-nogood-learn")).solution, "nogood = backtracking solution");
  ok(run("csp-backtracking", ex("csp-nogood-learn")).nodes > ng.nodes, "nogood recording visits fewer nodes than backtracking");

  // ---- path consistency prunes what arc consistency cannot
  const tri = ex("csp-pc-triangle");
  eq(run("csp-ac3", tri).domains, { X: ["a", "b"], Y: ["a", "b"], Z: ["a", "b"] }, "AC-3 deletes nothing on the 2-colour triangle");
  const pc = run("csp-path-consistency", tri);
  eq(pc.inconsistent, true, "path consistency proves the 2-colour triangle unsolvable");
  eq(pc.removed, 2, "two pairs removed before a relation is empty");
  eq(pc.emptyPair, ["Y", "Z"], "first relation to become empty");
  eq(run("csp-backtracking", tri).solution, null, "backtracking agrees: no solution");
  const ch = run("csp-path-consistency", ex("csp-chain"));
  eq(ch.domains, { X: [1], Y: [2], Z: [3] }, "PC + AC on the chain X<Y<Z pins every variable");
  eq(ch.induced.includes("X-Z"), true, "PC induces a constraint between X and Z (never constrained directly)");

  // ---- logic as propagation
  const lg = ex("csp-logic-chain");
  eq(run("csp-ac3", lg).domains, { P: [1], Q: [1], R: [1], S: [1] }, "AC-3 propagates P=true to Q=R=S=true");
  eq(run("csp-ac3", lg, { algo: "ac1" }).domains, { P: [1], Q: [1], R: [1], S: [1] }, "AC-1 agrees");
};
