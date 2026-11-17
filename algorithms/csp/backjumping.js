/* Week 12: conflict-directed backjumping (look-back). Same value/variable order as backtracking, but a dead end jumps to the deepest variable in its conflict set. */
Studio.register({
  id: "csp-cbj",
  name: "Conflict-directed backjumping",
  family: "Constraint processing · lookback",
  week: 12,
  problem: "csp",
  order: 60,
  summary: "Backtracking that remembers WHY each variable failed. Every variable keeps a conflict set (the earlier variables whose values ruled out its values). When a variable runs out of values, jump straight back to the deepest variable in its conflict set instead of the previous one, skipping variables that played no part in the failure.",
  pseudocode: `CBJ(i):                                  # variables X₁…Xₙ in a fixed order
    conf(Xᵢ) ← { }
    for each value a in D(Xᵢ)
        if a clashes with an assigned Xⱼ (j < i): add Xⱼ to conf(Xᵢ); try next value
        else assign Xᵢ = a; r ← CBJ(i + 1); if r = success: return success
             if r jumps to h < i: unassign Xᵢ; return r        # Xᵢ is skipped
    h ← deepest variable in conf(Xᵢ)         # no value left
    conf(h) ← conf(h) ∪ conf(Xᵢ) − {h}
    return jump to h`,
  complexity: "Never visits more nodes than backtracking; same worst case O(dⁿ)",
  learn: {
    "intro": "Chronological backtracking returns to the previous variable even when that variable has nothing to do with the failure. Conflict-directed backjumping is a look-back method: it analyses the failure and jumps back to the variable that is actually responsible.",
    "definition": "Each variable Xᵢ carries a conflict set conf(Xᵢ): the earlier variables whose current values rejected some value of Xᵢ. When Xᵢ has no value left, jump to the deepest variable h in conf(Xᵢ), unassign everything in between, merge conf(Xᵢ) − {h} into conf(h), and let h try its next value.",
    "steps": [["try a value of Xᵢ", ""], ["clash with an earlier Xⱼ", "Record Xⱼ in conf(Xᵢ): it is a culprit."], ["no value left", "Dead end for Xᵢ."], ["jump to the deepest variable in conf(Xᵢ)", "Variables between h and Xᵢ are skipped: changing them cannot repair the failure."], ["merge the conflict sets", "h inherits the other culprits, so that if h fails too the jump is still correct."]],
    "formulas": [{ "f": "h = max { j : Xⱼ ∈ conf(Xᵢ) }", "read": "the jump target is the latest culprit", "why": "Every value of Xᵢ clashes with something in conf(Xᵢ); changing a variable outside it cannot help, and the latest culprit is the nearest place where a change might help." }, { "f": "conf(h) ← conf(h) ∪ conf(Xᵢ) − {h}", "read": "pass the blame on", "why": "If h fails after its other values are tried, the earlier culprits of Xᵢ are also culprits for h." }],
    "why": "Finds exactly the same first solution as chronological backtracking, with the same orders, in fewer or equal nodes: jumping over a variable never skips a solution.",
    "traps": ["A jump over a level is only possible when the failing variable has no conflict with the intermediate variables.", "Conflict sets are only extended by the variables that clashed, not by every earlier variable.", "The culprit recorded for each value here is the first clashing variable in the ordering (the usual Prosser formulation); other books record all of them. Both are sound; the choice of culprit is **supplementary** to the lecture."],
    "props": { "complete": "yes", "optimal": "n/a", "time": "O(dⁿ) worst case, ≤ backtracking", "space": "O(n²) for conflict sets" },
  },
  params: [],
  run(P) {
    const C = Studio.cspLib, steps = [], A = {}, vars = P.ids.slice(), conf = {}, jumps = [];
    let nodes = 0, backs = 0, skipped = 0;
    const rows = [];
    const show = s => "{" + [...s].join(",") + "}";
    const snap = (cur, cap, hot = [], jump = null) => steps.push({ caption: cap,
      nodes: Object.fromEntries(P.ids.map(v => [v, { state: v === cur ? "current" : hot.includes(v) ? "open" : v in A ? "path" : "plain", label: v in A ? `${v}=${A[v]}` : v, sub: "{" + P.dom[v].join(",") + "}" }])),
      edges: P.cons.map(c => ({ u: c.scope[0], v: c.scope[1], state: jump && c.scope.includes(jump.from) && c.scope.includes(jump.to) ? "rejected" : "faint", label: c.rel === "neq" ? "" : C.relText(c) })),
      lists: jumps.length ? [{ label: "JUMPS", items: jumps.map(j => ({ text: `${j.from} → ${j.to}${j.skipped.length ? " (skips " + j.skipped.join(",") + ")" : ""}`, state: j.skipped.length ? "warn" : "open" })) }] : [],
      table: { title: "conflict sets", columns: ["variable", "value", "conflict set", "status"], rows: vars.map(v => [v, v in A ? A[v] : "", conf[v] ? show(conf[v]) : "", v === cur ? (jump ? "dead end → jump to " + jump.to : "current") : v in A ? "assigned" : ""]), rowStates: vars.map(v => (jump && v === jump.from ? "bad" : jump && jump.skipped.includes(v) ? "dim" : jump && v === jump.to ? "warn" : v in A ? "ok" : "")) },
      stats: [{ label: "nodes", value: nodes }, { label: "backtracks", value: backs }, { label: "jumps", value: jumps.length }, { label: "levels skipped", value: skipped }] });
    /* returns true (solved) or { to: index } (jump; -1 = no solution) */
    const cbj = i => {
      if (i === vars.length) return true;
      const x = vars[i]; conf[x] = new Set();
      for (const a of P.dom[x]) {
        nodes++;
        const culprit = vars.slice(0, i).find(y => C.between(P, x, y).some(c => !C.ok(c, x, a, y, A[y])));
        if (culprit) { conf[x].add(culprit); rows.push([nodes, x, a, "clash " + culprit]); snap(x, `${x} = ${a} clashes with ${culprit} = ${A[culprit]}: add ${culprit} to conf(${x}) = ${show(conf[x])}`, [culprit]); continue; }
        A[x] = a; rows.push([nodes, x, a, "ok"]); snap(x, `${x} = ${a} is consistent with the assignment so far`);
        const r = cbj(i + 1);
        if (r === true) return true;
        delete A[x];
        if (r.to < i) return r;          // this variable is skipped on the way back
      }
      backs++;
      const members = vars.filter(v => conf[x].has(v)), h = members.length ? members[members.length - 1] : null;
      if (h === null) { snap(x, `No value left for ${x} and conf(${x}) is empty: no earlier variable is to blame, so there is no solution`, [], null); return { to: -1 }; }
      const hi = vars.indexOf(h), skip = vars.slice(hi + 1, i);
      members.forEach(v => { if (v !== h) conf[h].add(v); });
      const J = { from: x, to: h, skipped: skip }; jumps.push(J); skipped += skip.length;
      snap(x, `No value left for ${x}. conf(${x}) = ${show(members)}, so jump back to its deepest member ${h}` + (skip.length ? `, skipping ${skip.join(", ")} (they are not to blame)` : ` (the previous variable: no levels skipped)`) + `; conf(${h}) becomes ${show(conf[h])}`, members, J);
      return { to: hi };
    };
    snap(null, "Variables are assigned in the listed order; each keeps a conflict set of earlier variables that rejected its values");
    const ok = cbj(0) === true;
    snap(null, ok ? `Solution: ${vars.map(v => v + "=" + A[v]).join(", ")} after ${nodes} assignments tried, ${jumps.length} jumps skipping ${skipped} levels` : "No solution exists");
    return { steps, result: { solution: ok ? Object.assign({}, A) : null, nodes, backtracks: backs, jumps, levelsSkipped: skipped } };
  },
});
