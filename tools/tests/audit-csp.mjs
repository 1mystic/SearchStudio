// Audit of the constraint-processing area: every taught property is shown by a shipped example (hand-counted numbers).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const nodes = (id, p, q) => run(id, p, q).nodes;

  // ---- default examples exist and suit the algorithm
  const defaults = { "csp-backtracking": "csp-thrashing", "csp-forward-checking": "csp-thrashing", "csp-ac3": "csp-chain", "csp-path-consistency": "csp-pc-triangle", "csp-cbj": "csp-cbj-jump",
    "csp-nogood": "csp-nogood-learn", "csp-waltz": "waltz-cube", "csp-diagnosis": "circuit-polybox", "csp-lookahead-partial": "csp-lookahead-gw", "csp-lookahead-full": "csp-lookahead-gw", "csp-lookahead-mac": "csp-lookahead-ladder" };
  for (const [a, e] of Object.entries(defaults)) { eq(Studio.get(a).defaultExample, e, `${a} default example`); ok(!!ex(e) && ex(e).type === Studio.get(a).problem, `${a}: default example ${e} exists and has the right type`); }

  // ---- thrashing: plain backtracking vs forward checking (hand count: 3+9+18+6 = 36 values under A=r, 1 for A=r itself,
  //      then A=g needs 1+1+2+3+1 = 8 more -> 45)
  const th = ex("csp-thrashing");
  eq(nodes("csp-backtracking", th), 45, "thrashing: backtracking tries 45 values");
  eq(nodes("csp-forward-checking", th), 6, "thrashing: forward checking tries 6 (A = r empties D(E) at once)");
  eq(run("csp-forward-checking", th).solution, run("csp-backtracking", th).solution, "thrashing: same solution");
  eq(run("csp-backtracking", th).solution, { A: "g", B: "x", C: "y", D: "z", E: "r" }, "thrashing: solution");
  eq(nodes("csp-cbj", th), 16, "thrashing: CBJ jumps E -> A, 16 values");
  eq(run("csp-cbj", th).jumps.map(j => [j.from, j.to, j.skipped.join("")]), [["E", "A", "BCD"]], "thrashing: CBJ jump over B, C, D");
  ok(Studio.run(Studio.get("csp-forward-checking"), th, {}).steps.some(s => /A = r empties the domain of E/.test(s.caption)), "FC caption names the wipe-out at A = r");

  // ---- variable ordering: fixed order vs most-constrained-first / MRV
  const od = ex("csp-ordering");
  eq(nodes("csp-backtracking", od), 58, "ordering: backtracking, given order");
  eq(nodes("csp-backtracking", od, { order: "degree" }), 7, "ordering: backtracking, most constraints first (hand count D, E, A, B, C = 1+2+2+1+1)");
  eq(nodes("csp-forward-checking", od), 27, "ordering: forward checking, given order");
  eq(nodes("csp-forward-checking", od, { mrv: "mrv" }), 6, "ordering: forward checking with MRV (hand count: C=1, E=1 rejected, E=2, D=1, A=2, B=1)");
  eq(run("csp-forward-checking", od, { mrv: "mrv" }).solution, { C: 1, E: 2, D: 1, A: 2, B: 1 }, "ordering: MRV solution (assigned in the order C, E, D, A, B)");
  for (const id of ["csp-lookahead-partial", "csp-lookahead-full", "csp-lookahead-mac"]) ok(nodes(id, od, { mrv: "mrv" }) <= nodes(id, od), `${id}: MRV does not hurt on the ordering example`);
  // ordering is a heuristic, not a guarantee: the degree order is worse on Australia
  ok(nodes("csp-backtracking", ex("csp-australia"), { order: "degree" }) > nodes("csp-backtracking", ex("csp-australia")), "degree order is not always better (Australia)");

  // ---- arc consistency: solves the chain, prunes without solving (ordering), deletes nothing (Australia), misses the triangle
  eq(run("csp-ac3", ex("csp-chain")).domains, { X: [1], Y: [2], Z: [3] }, "AC-3 solves the chain without search");
  eq(run("csp-ac3", od).domains, { A: [2, 3], B: [1, 3], C: [1, 2], D: [1], E: [2] }, "AC-3 on the ordering example: pruned but ambiguous");
  const au = run("csp-ac3", ex("csp-australia"));
  ok(Object.values(au.domains).every(d => d.length === 3), "AC-3 deletes nothing on Australia");
  const fin = id => Studio.run(Studio.get("csp-ac3"), ex(id), {}).steps.at(-1).caption;
  ok(/single value/.test(fin("csp-chain")) && /search is still needed/.test(fin("csp-ordering")) && /search is still needed/.test(fin("csp-australia")), "AC-3 final captions say solved vs search needed");
  for (const id of ["csp-chain", "csp-ordering", "csp-australia", "csp-pc-triangle", "csp-lookahead-gw"]) {
    const a3 = run("csp-ac3", ex(id)), a1 = run("csp-ac3", ex(id), { algo: "ac1" });
    eq(a1.domains, a3.domains, `AC-1 and AC-3 delete the same values on ${id}`);
    ok(a3.revisions <= a1.revisions, `AC-3 needs no more revisions than AC-1 on ${id} (${a3.revisions} vs ${a1.revisions})`);
  }
  eq(run("csp-ac3", ex("csp-pc-triangle")).domains, { X: ["a", "b"], Y: ["a", "b"], Z: ["a", "b"] }, "AC-3 deletes nothing on the unsolvable triangle");
  eq(run("csp-path-consistency", ex("csp-pc-triangle")).inconsistent, true, "path consistency detects the triangle");
  eq(run("csp-path-consistency", ex("csp-pc-triangle")).removed, 2, "path consistency: two pairs removed");
  eq(run("csp-ac3", ex("csp-lookahead-ladder")).domains, { A: [1, 3], B: [], C: [1], D: [2] }, "AC-3 on the ladder example empties D(B): arc consistency does detect this inconsistency");

  // ---- look-ahead ladder: FC > partial > full > MAC, same conclusion
  const ld = ex("csp-lookahead-ladder"), LA = ["csp-lookahead-partial", "csp-lookahead-full", "csp-lookahead-mac"];
  const ladder = [nodes("csp-forward-checking", ld)].concat(LA.map(id => nodes(id, ld)));
  eq(ladder, [17, 6, 5, 3], "ladder: values tried by FC, partial, full, MAC");
  for (const a of ["csp-backtracking", "csp-forward-checking"].concat(LA)) eq(run(a, ld).solution, null, `ladder: ${a} finds no solution`);
  // pruning after the first assignment A = 1 only (domains B{1,2} C{1,2,3} D{1,2}), strictly more with each stronger look-ahead
  const Pl = Studio.prepare(ld), pruned = mode => { const D = Object.fromEntries(Pl.ids.map(v => [v, Pl.dom[v].slice()])); const r = Studio.cspLib.lookahead.apply(Pl, D, {}, "A", 1, mode, Pl.ids); return Pl.ids.reduce((s, v) => s + (Pl.dom[v].length - r.D[v].length), 0); };
  const pr = ["fc", "partial", "full", "mac"].map(pruned);
  eq(pr, [3, 6, 7, 7], "values pruned right after A = 1 by FC, partial, full, MAC (A loses 2 own values, FC also removes 1 from D(D); partial adds C=2,B... never fewer)");
  const gw = ex("csp-lookahead-gw");
  eq([nodes("csp-forward-checking", gw)].concat(LA.map(id => nodes(id, gw))), [7, 6, 5, 5], "G=W example: FC, partial, full, MAC");

  // ---- CBJ and nogoods (existing hand-counted examples)
  eq([nodes("csp-backtracking", ex("csp-cbj-jump")), nodes("csp-cbj", ex("csp-cbj-jump"))], [24, 10], "jump example: backtracking 24 vs CBJ 10");
  eq([nodes("csp-backtracking", ex("csp-nogood-learn")), nodes("csp-nogood", ex("csp-nogood-learn"))], [24, 10], "nogood example: backtracking 24 vs nogood recording 10");
  eq(run("csp-nogood", th).nogoods, [{ A: "r" }], "thrashing: the nogood {A=r} is learned once");

  // ---- Waltz
  const wc = run("csp-waltz", ex("waltz-cube")), wf = run("csp-waltz", ex("waltz-cube-free"));
  eq(wc.unique, true, "Waltz: cube with background is unique");
  eq(wf.labellings, { O: 1, P: 2, Q: 3, R: 2, S: 3, T: 2, U: 3 }, "Waltz: cube without background keeps 2-3 labellings per outer junction");
  eq(Studio.run(Studio.get("csp-waltz"), ex("waltz-cube"), {}).steps.at(-1).caption, "Every junction has a single labelling: one consistent interpretation of the drawing", "Waltz final caption (unique)");
  ok(/more than one interpretation/.test(Studio.run(Studio.get("csp-waltz"), ex("waltz-cube-free"), {}).steps.at(-1).caption), "Waltz final caption (ambiguous)");

  // ---- model-based diagnosis: single and double faults
  const pb = run("csp-diagnosis", ex("circuit-polybox")), both = run("csp-diagnosis", ex("circuit-polybox-both"));
  eq(pb.conflicts, [["M1", "M2", "A1"], ["M1", "M3", "A1", "A2"]], "polybox conflicts");
  eq(pb.diagnoses.map(d => d.length), [1, 1, 2, 2], "polybox: two single and two double faults");
  eq(both.conflicts, [["M1", "M2", "A1"], ["M2", "M3", "A2"]], "both-wrong conflicts (hand derived: X=6,Y=6 gives F=12; Y=6,Z=6 gives G=12)");
  eq(both.diagnoses, [["M2"], ["M1", "M3"], ["M3", "A1"], ["M1", "A2"], ["A1", "A2"]], "both-wrong diagnoses: M2 alone, four double faults");
  // every diagnosis hits every conflict and is minimal
  for (const r of [pb, both]) for (const d of r.diagnoses) {
    ok(r.conflicts.every(c => c.some(x => d.includes(x))), `diagnosis {${d}} hits every conflict`);
    ok(d.every(x => !r.diagnoses.some(o => o !== d && o.length < d.length && o.every(y => d.includes(y)))), `diagnosis {${d}} is minimal`);
  }
  // no symptoms: the empty diagnosis (bug fix: used to list every single component)
  const healthy = Object.assign({}, ex("circuit-polybox"), { id: "healthy", observed: { F: 12, G: 12 } });
  eq(run("csp-diagnosis", healthy).conflicts, [], "healthy circuit: no conflicts");
  eq(run("csp-diagnosis", healthy).diagnoses, [[]], "healthy circuit: the empty diagnosis only");
  checkRun(Studio.get("csp-diagnosis"), healthy); checkRun(Studio.get("csp-diagnosis"), ex("circuit-polybox-both"));
  ok(/single-fault/.test(Studio.run(Studio.get("csp-diagnosis"), ex("circuit-polybox-both"), {}).steps.at(-1).caption), "diagnosis final caption counts single faults");
};
