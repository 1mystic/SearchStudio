// SAT problem type and the deterministic SAT methods (Week 3). Loaded by tools/test.mjs.
// Known answers: course notes Week 3 §8.6, example 3a (four variables a b c d), start 0000, ties → lowest bit.
// Validated independently by a throwaway script that evaluates h over all 16 strings (not by the tracer).
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const T = Studio.types.sat, four = ex("sat-four-var"), rnd = ex("sat-random-3sat");
  const algo = id => Studio.get(id);
  const P4 = Studio.prepare(four);

  // ---- problem type
  eq(P4.h("0000"), 4, "h(0000) = 4"); eq(P4.h("1000"), 5, "h(1000) = 5"); eq(P4.h("1101"), 6, "h(1101) = 6");
  eq(P4.nbrs("0000", 1).map(x => x.bits + ":" + x.h), ["1000:5", "0100:4", "0010:4", "0001:4"], "N1(0000) in lowest-bit-first order");
  eq([1, 2, 3, 4].map(k => P4.nbrs("1000", k).length), [4, 6, 4, 1], "|Nk| = C(4,k)");
  eq(P4.nbrs("1000", 2).map(x => x.move), ["a,b", "a,c", "a,d", "b,c", "b,d", "c,d"], "N2 order");
  eq(P4.nbrsUpTo("1000", 2).length, 10, "|N1–2| = 10");
  eq(P4.satisfied("0000"), [true, true, true, false, false, true], "clause truth values at 0000");
  eq(P4.flipSet("0000", [1, 3]), "0101", "flipSet");
  // text format round trip
  const txt = T.toText(four), back = T.fromText(txt, { id: four.id, name: four.name });
  eq(back.vars, four.vars, "text round trip: vars"); eq(back.clauses, four.clauses, "text round trip: clauses"); eq(back.start, "0000", "text round trip: start");
  eq(T.fromText("a b c\n(-a ∨ b) , c\n¬c a\n# comment\nstart = 101", { id: "x", name: "x" }).clauses, [["-a", "b", "c"], ["-c", "a"]], "text parser accepts ∨, commas, ¬, parentheses");
  for (const bad of [{ vars: ["a"], clauses: [["b"]] }, { vars: [], clauses: [["a"]] }, { vars: ["a", "a"], clauses: [["a"]] }, { vars: ["a"], clauses: [] }, { vars: ["a"], clauses: [["a"]], start: "01" }]) {
    let threw = false; try { T.validate(Object.assign({ id: "bad", type: "sat" }, bad)); } catch (e) { threw = true; } ok(threw, `validate rejects ${JSON.stringify(bad)}`);
  }
  eq(Studio.rng(1)() === Studio.rng(1)(), true, "rng repeatable");
  eq(JSON.stringify(T.generator.make({ n: 6, m: 20, seed: 4 })), JSON.stringify(T.generator.make({ n: 6, m: 20, seed: 4 })), "generator is deterministic for a seed");
  ok(JSON.stringify(T.generator.make({ n: 6, m: 20, seed: 4 })) !== JSON.stringify(T.generator.make({ n: 6, m: 20, seed: 5 })), "different seed, different instance");

  // ---- course known answers (example 3a, start 0000)
  const hc = run("sat-hill-climbing", four, { start: "0000" });
  eq(hc.path, ["0000", "1000"], "HC path 0000 → 1000"); eq(hc.h, 5, "HC stops at h 5"); eq(hc.solved, false, "HC does not solve it");
  const vnd = run("sat-vnd", four, { start: "0000" });
  eq(vnd.bits, "1101", "VND reaches 1101"); eq(vnd.h, 6, "VND h = 6"); eq(vnd.path, ["0000", "1000", "1101"], "VND path"); eq(vnd.maxK, 2, "VND needed N1–2");
  const vsteps = Studio.run(algo("sat-vnd"), four, { start: "0000" }).steps.map(s => s.caption).join("\n");
  ok(/N1–2 of 1000/.test(vsteps), "VND switches to N1–2 at 1000");
  const tb = run("sat-tabu", four, { start: "0000", tenure: 2, iters: 8 });
  eq(tb.path, ["0000", "1000", "1100", "1101"], "tabu tt=2 path"); eq(tb.flips, ["a", "b", "d"], "tabu flips a, b, d"); eq(tb.bits, "1101", "tabu reaches 1101");
  const bf = run("sat-brute-force", four);
  eq(bf.solutions, ["1101"], "1101 is the unique solution"); eq(bf.evaluated, 16, "brute force evaluates 2^4 rows");

  // ---- other behaviours
  eq(run("sat-hill-climbing", four, { start: "1101" }).moves, 0, "HC at a solution makes no move");
  eq(run("sat-hill-climbing", four, { start: "garbage" }).path[0], "0000", "bad start falls back to the problem's start");
  eq(run("sat-beam", four, { start: "0000", w: 1 }).bits, hc.bits, "beam w = 1 behaves like hill climbing");
  eq(run("sat-beam", four, { start: "0000", w: 2 }).h, 5, "beam w = 2 also stops on the h = 5 plateau");
  const bn = run("sat-best-neighbour", four, { start: "0000", moves: 8, stop: "no" });
  eq(bn.visited.slice(0, 5), ["0000", "1000", "1100", "1101", "0101"], "best neighbour walk 0000 → 1000 → 1100 → 1101 → 0101");
  eq(bn.cycled, true, "best neighbour walk cycles"); eq(bn.bits, "1101", "bestSeen is 1101"); eq(bn.cycleAt, 5, "cycle detected at move 5 (1101 revisited)");
  eq(run("sat-best-neighbour", four, { start: "0000", moves: 8, stop: "yes" }).visited, ["0000", "1000", "1100", "1101"], "stop at the solution when asked");
  eq(run("sat-tabu", four, { start: "0000", tenure: 1, iters: 8, aspiration: "no" }).bits, "1101", "tabu tt=1 also gets there");
  ok(run("sat-tabu", four, { start: "0000", tenure: 2, iters: 8, lambda: 1 }).h >= 5, "tabu with a frequency penalty runs");

  // ---- random 3-SAT: tracers agree with the truth table; every algorithm passes checkRun on generated problems
  const gens = [[4, 8, 1], [5, 12, 2], [6, 20, 3], [6, 26, 10], [6, 26, 2], [3, 5, 7]].map(([n, m, seed]) => T.generator.make({ n, m, seed }));
  const bfr = run("sat-brute-force", rnd);
  eq(bfr.solutions, ["010010"], "random example: unique solution 010010"); eq(bfr.h, 26, "random example: max h 26");
  for (const p of gens.concat([rnd, four])) {
    const best = run("sat-brute-force", p), Pp = Studio.prepare(p);
    for (const a of Studio.algorithms.filter(x => x.problem === "sat")) {
      for (const params of [{}, { start: "1".repeat(Pp.n) }, a.id === "sat-beam" ? { w: 3 } : a.id === "sat-tabu" ? { tenure: 3, iters: 12, lambda: 0.5 } : a.id === "sat-vnd" ? { kmax: 2 } : {}]) {
        const r = checkRun(a, p, params);
        if (r && r.result.bits) { ok(Pp.h(r.result.bits) === r.result.h, `${a.id} on ${p.id}: reported h ${r.result.h} = recomputed ${Pp.h(r.result.bits)}`); ok(r.result.h <= best.h, `${a.id} on ${p.id}: h ≤ truth-table maximum`); }
      }
    }
    const v = run("sat-vnd", p, { kmax: 0 });
    eq(v.h, best.h, `VND up to N1–n reaches the global maximum on ${p.id}`);
    if (p !== rnd) eq(best.solved, best.h === Pp.m, `brute force solved flag on ${p.id}`);
  }
  // brute force refuses more than 6 variables (checkRun treats "limited to" as a skip)
  let msg = ""; try { Studio.run(algo("sat-brute-force"), T.generator.make({ n: 8, m: 10, seed: 1 }), {}); } catch (e) { msg = e.message; }
  ok(/limited to 6 variables/.test(msg), "brute force limited to 6 variables");
  checkRun(algo("sat-hill-climbing"), T.generator.make({ n: 10, m: 30, seed: 5 }), {});
};
