// Audit: planning, game trees, AND-OR (AO*), rule-based systems. Every property is demonstrated by a shipped example.
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  const BW = Studio.blocks, full = (a, p, q = {}) => Studio.run(Studio.get(a), typeof p === "string" ? ex(p) : p, q);
  const caps = r => r.steps.map(s => s.caption);
  const executes = (p, plan) => { const Pp = Studio.prepare(p); let st = Pp.init; for (const n of plan) { const o = Pp.ops.find(x => x.name === n); if (!o || !BW.applicable(o, st)) return false; st = BW.apply(o, st); } return Pp.goal.every(g => st.has(g)); };

  // ---------- speed: no planning algorithm may need ~1 s on a shipped example (POP declines more than 4 blocks)
  for (const p of Studio.examples.filter(e => e.type === "planning")) for (const a of Studio.algorithms.filter(a => a.problem === "planning")) {
    const t = Date.now(); let declined = false;
    try { Studio.run(a, p, {}); } catch (e) { if (/limited to/.test(e.message)) declined = true; else throw e; }
    ok(Date.now() - t < 1000, `${a.id} on ${p.id} takes ${Date.now() - t} ms`);
    if (a.id === "plan-pop") eq(declined, p.blocks.length > 4, `POP declines exactly the problems with more than 4 blocks (${p.id})`);
  }

  // ---------- Graphplan: nogoods, mutex types, termination bug fix
  const gp = full("plan-graphplan", "plan-graphplan-nogoods"), gc = caps(gp);
  eq([gp.result.levels, gp.result.firstLevel, gp.result.plan.length], [6, 4, 6], "nogoods example: goals non-mutex at P4, plan needs 6 layers");
  ok(executes(ex("plan-graphplan-nogoods"), gp.result.plan), "nogoods example: plan executes");
  ok(gp.result.nogoods >= 3, `nogood table filled (${gp.result.nogoods})`);
  ok(gc.some(c => /as a nogood/.test(c)), "extraction failures are recorded as nogoods");
  ok(gc.filter(c => /already in the nogood table/.test(c)).length >= 2, "memoised nogoods cut repeated goal sets");
  for (const rule of ["inconsistent effects", "interference", "competing needs", "inconsistent support"]) ok(gc.some(c => c.includes(rule)) || gp.steps.some(s => (s.lists || []).some(l => l.label.includes(rule))), `mutex rule shown: ${rule}`);
  eq(full("plan-forward", "plan-graphplan-nogoods").result.plan.length, 6, "breadth-first plan length = Graphplan layers");
  // regression: Graphplan used to declare 'no plan' on this solvable 4-block problem (it compared the wrong nogood table)
  const hard = { id: "t-gp", type: "planning", name: "t", blocks: ["A", "B", "C", "D"], init: [["B", "C"], ["D", "A"]], goal: ["ontable(C)", "on(B,C)", "on(D,B)", "on(A,D)"] };
  const gh = full("plan-graphplan", hard), fh = full("plan-forward", hard);
  ok(!!gh.result.plan && executes(hard, gh.result.plan), "Graphplan solves the 10-step problem it used to give up on");
  eq(gh.result.plan.length, fh.result.plan.length, "Graphplan length = optimal length on the former failure");

  // ---------- Sussman anomaly: GSP clobbers, POP and Graphplan do not, MEA fails
  const gsp = full("plan-gsp", "plan-sussman");
  eq(gsp.result.plan.length, 10, "GSP: 10 steps"); ok(gsp.result.clobbered >= 1, "GSP reports goal clobbering");
  ok(caps(gsp).some(c => /Goal clobbering/.test(c)) && /Goal clobbering happened/.test(caps(gsp).pop()), "GSP captions name the clobbering and the final caption states the property");
  eq(full("plan-pop", "plan-sussman").result.plan.length, 6, "POP: 6 steps");
  eq(full("plan-mea", "plan-sussman").result.solved, false, "MEA fails on the interacting goals");
  eq(full("plan-gsp", "plan-hill-terrain").result.clobbered, 0, "no clobbering when goals are independent (hill-terrain)");
  eq(Studio.get("plan-pop").defaultExample, "plan-sussman", "POP default example");

  // ---------- games
  const T3 = "game-three-ply", T4 = "game-four-ply", AB = (id, o) => run("game-alpha-beta", ex(id), { order: o }).leaves;
  eq(["given", "best", "worst"].map(o => AB(T3, o)), [7, 5, 9], "alpha-beta leaves on the classic tree: given / best / worst");
  eq(["given", "best", "worst"].map(o => AB(T4, o)), [10, 7, 15], "alpha-beta leaves on the four-ply tree: given / best / worst");
  eq(run("game-sss-star", ex(T4)), { value: 8, leaves: 8 }, "SSS* evaluates 8 leaves on the four-ply tree");
  ok(run("game-sss-star", ex(T4)).leaves < AB(T4, "given"), "SSS* evaluates fewer leaves than alpha-beta");
  for (const o of ["given", "best", "worst"]) eq(run("game-alpha-beta", ex(T4), { order: o }).value, 8, `value does not depend on the order (${o})`);
  const gam = run("game-expectiminimax", ex("game-chance-gamble"));
  eq([gam.value, gam.move], [6.5, "C"], "gamble tree: expectiminimax 0.25*2 + 0.75*8 = 6.5, MAX gambles");
  eq(gam.naive, { asMin: { value: 4, move: "B" }, asMax: { value: 8, move: "C" }, asAverage: { value: 5, move: "C" } }, "naive treatments of the chance node give other values (and, as MIN, another move)");
  ok(/plain minimax that treats/.test(caps(full("game-expectiminimax", "game-chance-gamble")).pop()), "last caption lists the naive values");

  // ---------- AO*
  const ao = full("andor-ao-star", "andor-revision");
  eq([ao.result.cost, ao.result.solution], [3, ["A", "B", "E", "K"]], "revision example: different solution than the first marked one");
  eq(caps(ao).filter(c => /change of mind/.test(c)).length, 2, "revision example: the marked connector of A changes twice");
  const fu = full("andor-ao-star", "andor-futility");
  eq([fu.result.solved, fu.result.cost, fu.result.solution.slice().sort()], [true, 4, ["A", "C", "D", "K1", "K2"]], "futility example: dead end B abandoned, AND{C,D} solved at cost 4");
  ok(caps(fu).some(c => /dead end/.test(c)) && caps(fu).some(c => /change of mind/.test(c)), "futility is explained and A changes its mind");
  const dead = { id: "t-dead", type: "andor", name: "t", start: "A", edgeCost: 1, nodes: [{ id: "A", h: 1 }, { id: "B", h: 1 }], connectors: [{ from: "A", to: ["B"] }] };
  eq(full("andor-ao-star", dead).result.solved, false, "only a dead end: AO* reports no solution");

  // ---------- forward chaining: conflict resolution
  const orders = s => run("rules-forward-chaining", ex("rules-conflict"), { strategy: s });
  eq(["order", "recency", "specificity"].map(s => orders(s).order[0]), ["R1 ?p=ann", "R3 ?p=bob", "R2 ?p=ann"], "first firing per strategy: rule order / recency / specificity");
  const ord = ["order", "recency", "specificity"].map(s => orders(s).order.join(">"));
  eq(new Set(ord).size, 3, "the three strategies give three different firing orders");
  eq(orders("recency").order, ["R3 ?p=bob", "R2 ?p=ann", "R1 ?p=ann", "R4 ?p=ann"], "recency firing order");
  eq(new Set(["order", "recency", "specificity"].map(s => orders(s).facts.slice().sort().join("|"))).size, 1, "all strategies derive the same facts");
  ok(/Firing order under the/.test(caps(full("rules-forward-chaining", "rules-conflict")).pop()), "final caption states the firing order");

  // ---------- Rete: negative patterns (and agreement with forward chaining)
  const neg = full("rules-rete", "rules-negation"), fcn = full("rules-forward-chaining", "rules-negation");
  eq(neg.result.facts.slice().sort(), fcn.result.facts.slice().sort(), "Rete with NOT = forward chaining facts");
  ok(neg.result.facts.includes("(flies tweety)") && !neg.result.facts.includes("(flies opus)"), "tweety flies, the penguin opus does not");
  eq(neg.result.order, ["R1 ?x=opus", "R2 ?x=tweety"], "R2 opus is withdrawn before it can fire");
  ok(caps(neg).some(c => /withdrawn from the conflict set/.test(c)), "the withdrawal is explained");
  const T = (id, facts, rules) => ({ id, type: "rules", name: id, facts, rules });
  const same = (p, msg) => { const a = run("rules-rete", p), b = run("rules-forward-chaining", p); eq(a.facts.slice().sort(), b.facts.slice().sort(), msg); eq(a.order, b.order, msg + " (same firing order)"); };
  same(T("t-remove", ["(token a)", "(token b)", "(door open)"], [{ name: "R1", if: ["(token ?x)", "(door open)"], then: ["remove (door open)", "(entered ?x)"] }]), "Rete retracts: only one token gets through the door");
  same(T("t-neg-first", ["(a 1)", "(a 2)", "(b 2)"], [{ name: "R1", if: ["not (b ?x)", "(a ?x)"], then: ["(lonely ?x)"] }]), "Rete: rule starting with a negated condition");
  same(T("t-unblock", ["(guard on)", "(x 1)"], [{ name: "R1", if: ["(x ?v)", "not (guard on)"], then: ["(go ?v)"] }, { name: "R0", if: ["(guard on)"], then: ["remove (guard on)"] }]), "Rete: removing a blocking fact releases the match");
  for (const id of ["rules-family", "rules-animals", "rules-conflict", "rules-negation", "rules-backtrack"]) same(ex(id), `Rete = forward chaining on ${id}`);
  ok(!!checkRun(Studio.get("rules-rete"), ex("rules-negation")), "Rete steps are well formed with NOT nodes");

  // ---------- backward chaining: failed rule, then an alternative
  const bc = full("rules-backward-chaining", "rules-backtrack");
  eq([bc.result.proved, bc.result.rules.slice().sort()], [true, ["B1", "F2"]], "F2 (via B1) proves the goal");
  const bcc = caps(bc), iF1 = bcc.findIndex(c => /Rule F1/.test(c)), iFail = bcc.findIndex(c => /No fact and no rule can prove \(heavy tweety\)/.test(c)), iF2 = bcc.findIndex(c => /Rule F2/.test(c));
  ok(iF1 >= 0 && iF1 < iFail && iFail < iF2, "F1 is tried, fails on (heavy tweety), then F2 is tried");
};
