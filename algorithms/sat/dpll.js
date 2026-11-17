/* SAT as a CSP: backtracking over {T, F} with unit propagation and pure literals (DPLL style). */
Studio.register({
  id: "sat-dpll",
  name: "SAT as a CSP: backtracking with unit propagation (DPLL)",
  family: "SAT · constraint processing",
  week: 11,
  problem: "sat",
  order: 120,
  summary: "Treat each variable as a CSP variable with domain {T, F} and each clause as a constraint. Backtracking assigns variables one at a time; unit propagation (a clause with one open literal forces it) and pure literals prune the tree, and an empty clause forces a backtrack. It is complete: it can also prove a formula unsatisfiable.",
  pseudocode: `DPLL(assignment):
    repeat
        if some clause has every literal false: return FAIL          # empty clause
        if every clause is satisfied: return assignment
        if a clause has exactly one unassigned literal and no true literal: assign it true    # unit propagation
        else if a variable occurs with one polarity only in the open clauses: assign it so    # pure literal
        else break
    X ← first unassigned variable
    for each value v in {T, F}
        result ← DPLL(assignment + {X = v})
        if result ≠ FAIL: return result
        undo X = v and everything it forced
    return FAIL`,
  complexity: "Worst case O(2ⁿ) leaves, usually far fewer thanks to propagation",
  learn: {
    intro: "The local-search methods of weeks 3 and 4 move between complete assignments and can only find solutions. Constraint processing instead builds an assignment variable by variable, so a dead end is detected as soon as one clause becomes impossible, and the search is complete: if no solution exists it says so. This page is the Davis–Putnam–Logemann–Loveland style of backtracking on a CNF formula, viewed as a CSP whose variables have the domain {T, F}.",
    definition: "A clause is satisfied once some literal is true and empty (a conflict) once all its literals are false. A unit clause has exactly one unassigned literal and none true, so that literal must be true. A pure literal occurs with only one sign in the clauses not yet satisfied, so making it true cannot hurt. Backtrack on an empty clause; otherwise branch on the first unassigned variable (alphabetical order, as in the course), trying T before F.",
    steps: [
      ["empty clause → FAIL", "Every literal of some clause is false under the partial assignment: no extension can satisfy it, so this branch is dead. This is the CSP 'domain wipe-out'."],
      ["all clauses satisfied → return", "Variables still unassigned are free: any value works. The trace shows them as 0."],
      ["unit propagation", "A clause with one open literal forces it. This is the SAT form of forward checking: the choice made at a decision is propagated into the clauses at once. Lowest clause number first."],
      ["pure literal", "A variable whose open occurrences all have the same sign can be set to satisfy them all. **Supplementary**: pure-literal elimination is a standard DPLL rule, not in the course notes; the 'pure' parameter switches it off."],
      ["branch on X, value T then F", "A decision. The value order is a parameter; the variable is always the first unassigned one that still occurs in an open clause."],
      ["undo and try the next value", "Backtracking: remove the decision and every assignment it forced, then try the other value. When both fail, return FAIL to the previous decision."],
    ],
    formulas: [
      { f: "unit: |{ℓ ∈ C : ℓ unassigned}| = 1 and no ℓ ∈ C true", read: "one open literal left in an unsatisfied clause", why: "The clause is false unless that literal is true, so setting it is forced, not a choice, and costs no branching." },
      { f: "empty: every ℓ ∈ C false", read: "the conflict test", why: "A clause is a disjunction; if all its literals are false the clause is false, and assignments only ever add more false literals deeper in the tree." },
      { f: "leaves ≤ 2^(number of decisions)", read: "propagation shrinks the tree", why: "Only decisions branch; forced assignments follow without a choice, so the more propagation, the fewer decisions on any path." },
    ],
    why: "Where hill climbing from 0000 stops at 1000 (h 5), backtracking cannot be fooled by a local maximum: it either reaches an assignment satisfying every clause or has tried all possibilities. Related CSP pages: Backtracking (csp-backtracking) is the plain version of this search, Forward checking (csp-forward-checking) is what unit propagation does after each assignment, and Arc consistency (csp-ac3) generalises it by propagating until nothing more can be removed.",
    traps: [
      "A conflict means undo to the last decision; forced assignments are not retried with the other value.",
      "Unassigned variables at the end are free, not False: the printed bit string fills them with 0 only for display.",
      "Pure literals and unit propagation never lose solutions, but without them the same formula needs more backtracks.",
      "An 'UNSAT' answer is a proof (all branches closed), whereas local search failing to find a solution proves nothing.",
    ],
    props: { complete: "yes", optimal: "n/a (any satisfying assignment)", time: "O(2ⁿ) worst case", space: "O(n) depth" },
  },
  params: [
    { key: "order", label: "Value order", type: "select", default: "TF", options: [["TF", "T first, then F"], ["FT", "F first, then T"]] },
    { key: "pure", label: "Pure literal rule", type: "select", default: "yes", options: [["yes", "Yes (supplementary)"], ["no", "No: unit propagation only"]] },
  ],
  run(P, { order, pure }) {
    const L = Studio.satLib, steps = [], CAP = 500, vals = order === "FT" ? ["0", "1"] : ["1", "0"];
    const val = Array(P.n).fill(null), trail = [];
    let decisions = 0, backtracks = 0, propagations = 0, pures = 0, conflicts = 0, truncated = false;
    const vt = v => (v === "1" ? "T" : "F");
    const litTrue = (l, v) => val[l.v] !== null && (val[l.v] === "1") !== l.neg;
    const analyse = () => P.lits.map((c, i) => {
      if (c.some(l => litTrue(l))) return { i, kind: "sat" };
      const open = c.filter(l => val[l.v] === null);
      return { i, kind: open.length === 0 ? "empty" : open.length === 1 ? "unit" : "open", open };
    });
    const clauseTbl = (an, title) => ({ title, columns: ["#", "clause", "status"], rows: an.map(a => [a.i + 1, L.clauseText(P, a.i),
      a.kind === "sat" ? { t: "satisfied by " + P.lits[a.i].filter(l => litTrue(l)).map(l => L.litText(P, l)).join(", "), s: "ok" } : a.kind === "empty" ? { t: "EMPTY: every literal false", s: "bad" } : a.kind === "unit" ? { t: "unit: " + L.litText(P, a.open[0]), s: "warn" } : `open: ${a.open.map(l => L.litText(P, l)).join(" ∨ ")}`]),
      rowStates: an.map(a => (a.kind === "sat" ? "dim" : a.kind === "empty" ? "bad" : a.kind === "unit" ? "warn" : "")) });
    const draw = (hot = [], bad = []) => { const nodes = {}; P.vars.forEach((v, i) => { nodes[v] = { label: val[i] === null ? "?" : vt(val[i]), sub: v, state: bad.includes(i) ? "rejected" : hot.includes(i) ? "current" : val[i] === null ? "open" : val[i] === "1" ? "path" : "dim" }; }); return { nodes }; };
    const trailList = () => ({ label: "TRAIL", items: trail.length ? trail.map(t => ({ text: `${P.vars[t.v]} = ${vt(t.val)} (${t.why})`, state: t.why === "decision" ? "current" : "plain" })) : [{ text: "empty", state: "plain" }] });
    const stat = (extra = []) => [{ label: "decisions", value: decisions }, { label: "propagated", value: propagations + pures }, { label: "backtracks", value: backtracks, state: backtracks ? "warn" : "" }].concat(extra);
    const push = (caption, an, title, hot, bad) => {
      if (steps.length >= CAP) { truncated = true; return; }
      steps.push(Object.assign({ caption, table: clauseTbl(an || analyse(), title || "clauses under the partial assignment"), lists: [trailList()], stats: stat() }, draw(hot, bad)));
    };
    const assign = (v, x, why) => { val[v] = x; trail.push({ v, val: x, why }); };
    const undoTo = len => { const gone = []; while (trail.length > len) { const t = trail.pop(); val[t.v] = null; gone.push(`${P.vars[t.v]}=${vt(t.val)}`); } return gone.reverse(); };

    push(`${P.n} CSP variables (${P.vars.join(", ")}), each with domain {T, F}, and ${P.m} clause constraints. Nothing is assigned yet; we assign one variable at a time, propagate forced values, and back up on an empty clause.`);
    const rec = () => {
      for (;;) {
        const an = analyse(), emp = an.find(a => a.kind === "empty");
        if (emp) { conflicts++; push(`Clause ${emp.i + 1} ${L.clauseText(P, emp.i)} has every literal false: an empty clause, so this branch fails and we must backtrack.`, an, "conflict", [], P.lits[emp.i].map(l => l.v)); return false; }
        if (an.every(a => a.kind === "sat")) { push(`Every clause is satisfied under the partial assignment, so the formula is satisfiable${val.some(x => x === null) ? `; the unassigned variables (${P.vars.filter((_, i) => val[i] === null).join(", ")}) are free` : ""}.`, an, "all clauses satisfied"); return true; }
        const unit = an.find(a => a.kind === "unit");
        if (unit) { const l = unit.open[0]; propagations++; assign(l.v, l.neg ? "0" : "1", `unit, clause ${unit.i + 1}`);
          push(`Unit propagation: clause ${unit.i + 1} ${L.clauseText(P, unit.i)} has only ${L.litText(P, l)} left open, so it is forced: ${P.vars[l.v]} = ${vt(val[l.v])}.`, undefined, "after unit propagation", [l.v]); continue; }
        if (pure === "yes") {
          let found = null;
          for (let v = 0; v < P.n && !found; v++) {
            if (val[v] !== null) continue;
            let pos = 0, neg = 0; for (const a of an) if (a.kind !== "sat") for (const l of P.lits[a.i]) if (l.v === v) (l.neg ? neg++ : pos++);
            if ((pos > 0) !== (neg > 0)) found = { v, val: pos > 0 ? "1" : "0" };
          }
          if (found) { pures++; assign(found.v, found.val, "pure"); push(`Pure literal: ${P.vars[found.v]} occurs only ${found.val === "1" ? "positively" : "negatively"} in the clauses that are still open, so ${P.vars[found.v]} = ${vt(found.val)} satisfies them all and cannot hurt.`, undefined, "after pure literal", [found.v]); continue; }
        }
        break;
      }
      const an = analyse(), v = P.vars.findIndex((_, i) => val[i] === null && an.some(a => a.kind !== "sat" && P.lits[a.i].some(l => l.v === i)));
      for (let k = 0; k < 2; k++) {
        const mark = trail.length; decisions++; assign(v, vals[k], "decision");
        push(`Decision ${decisions}: no unit clause or pure literal is left, so branch on the first open variable ${P.vars[v]} and try ${vt(vals[k])}${k ? " (the other value)" : ""}.`, undefined, "after the decision", [v]);
        if (rec()) return true;
        const gone = undoTo(mark); backtracks++;
        push(`Backtrack: undo ${gone.join(", ")}${k === 0 ? `; ${P.vars[v]} = ${vt(vals[0])} led to a conflict, so try ${P.vars[v]} = ${vt(vals[1])}` : `; both values of ${P.vars[v]} fail, so return to the previous decision`}.`, undefined, "after backtracking");
      }
      return false;
    };
    const sat = rec();
    const bits = sat ? val.map(x => (x === null ? "0" : x)).join("") : null;
    if (sat && !P.solved(bits)) throw new Error("internal error: DPLL assignment does not satisfy the formula");
    const note = truncated ? ` (the trace shows the first ${CAP} steps only)` : "";
    steps.push(Object.assign({ caption: sat ? `Solved: ${bits} satisfies all ${P.m} clauses (${P.vars.map((x, i) => `${x}=${vt(bits[i])}`).join(", ")}) after ${decisions} decision${decisions === 1 ? "" : "s"}, ${propagations + pures} forced assignment${propagations + pures === 1 ? "" : "s"} and ${backtracks} backtrack${backtracks === 1 ? "" : "s"}${note}.`
        : `UNSATISFIABLE: every branch ended in an empty clause (${decisions} decision${decisions === 1 ? "" : "s"}, ${backtracks} backtrack${backtracks === 1 ? "" : "s"}). Because the search is complete this is a proof, not just a failure to find a solution${note}.`,
      table: sat ? L.clauseTable(P, bits) : clauseTbl(analyse(), "clauses (all assignments undone)"), stats: stat([{ label: "result", value: sat ? "satisfiable" : "unsatisfiable", state: sat ? "ok" : "bad" }]) },
      sat ? L.drawBits(P, bits, { state: "goal" }) : draw()));
    return { steps, result: { satisfiable: sat, solved: sat, bits, h: sat ? P.m : undefined, decisions, backtracks, propagations, pureLiterals: pures, conflicts } };
  },
});
