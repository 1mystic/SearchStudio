/* Brute force on SAT: write the whole truth table. */
Studio.register({
  id: "sat-brute-force",
  name: "Brute force (truth table)",
  family: "SAT · exact",
  week: 3,
  problem: "sat",
  order: 10,
  defaultExample: "sat-four-var",
  summary: "Try all 2ⁿ assignments in binary order and count the satisfied clauses of each. The rows with h = m are the solutions, so brute force is exact but doubles with every variable (limited to 6 variables here).",
  pseudocode: `for each bit string X of length n, in counting order 00…0, 00…1, …
    h(X) ← number of clauses satisfied by X
    if h(X) = m: X is a solution
return the solutions (or, if none, the rows with the largest h)`,
  complexity: "2ⁿ assignments × m clauses",
  check: P => (P.n > 6 ? `Brute force is limited to 6 variables (a truth table of 64 rows); this problem has ${P.n}` : null),
  learn: {
    intro: "A SAT instance asks for an assignment of true or false to every variable that makes every clause true. With n variables there are 2ⁿ assignments, so the most direct method is to try them all. This is the baseline against which the local-search methods of this week are measured.",
    definition: "Treat the assignment as a bit string (bit i = 1 means variable i is true). Enumerate every bit string, evaluate every clause, and record h = the number of satisfied clauses. A string with h = m satisfies the formula.",
    steps: [
      ["for each bit string X in counting order", "0000, 0001, 0010, … with the first variable as the leftmost bit."],
      ["h(X) ← clauses satisfied by X", "A clause is satisfied when at least one of its literals is true."],
      ["if h(X) = m: X is a solution", "Every clause true. Keep going: there may be more than one solution."],
      ["return the solutions", "If the table has no h = m row, the formula is unsatisfiable and the largest h is the best we can do."],
    ],
    formulas: [
      { f: "|search space| = 2ⁿ", read: "two choices per variable", why: "This is why n is limited to 6 here: 2⁶ = 64 rows still fit on a screen; 2²⁰ is already a million." },
      { f: "h(X) = Σᵢ [clauseᵢ satisfied by X]", read: "the heuristic is the number of true clauses", why: "The same h guides every local-search method in this section; local search tries to climb to h = m without enumerating the table." },
    ],
    why: "Brute force is complete and exact, which makes it the reference answer: every local-search result can be checked against its truth table. Its cost is the reason local search exists.",
    traps: [
      "A solution is h = m (all clauses), not just a high h.",
      "There can be several solutions, or none; do not stop at the first unless asked.",
      "The truth table grows as 2ⁿ: adding one variable doubles it.",
      "No row with h = m proves the formula unsatisfiable: on sat-unsat the best rows have h = 4 of 5 clauses, and brute force can say 'none' for certain. Local search failing says nothing of the kind.",
    ],
    props: { complete: "yes", optimal: "yes (finds every solution)", time: "O(2ⁿ · m)", space: "O(n)" },
  },
  params: [],
  run(P) {
    const L = Studio.satLib, steps = [], rows = [], states = [], sols = [];
    let bestH = -1, bestBits = null;
    steps.push(Object.assign({ caption: `${P.n} variables give 2^${P.n} = ${2 ** P.n} assignments. We write the truth table in counting order and count the satisfied clauses of each (a solution needs h = ${P.m}).`,
      table: L.clauseTable(P, "0".repeat(P.n)), stats: [{ label: "rows", value: 2 ** P.n }, { label: "clauses", value: P.m }] }, L.drawBits(P, "0".repeat(P.n))));
    for (let k = 0; k < 2 ** P.n; k++) {
      const bits = k.toString(2).padStart(P.n, "0"), h = P.h(bits), solved = h === P.m;
      if (solved) sols.push(bits);
      const newBest = h > bestH; if (newBest) { bestH = h; bestBits = bits; }
      rows.push([k, bits, h, solved ? { t: "solution", s: "ok" } : newBest ? { t: "best so far", s: "warn" } : ""]);
      states.push(solved ? "ok" : "");
      steps.push(Object.assign({
        caption: `Row ${k}: ${bits} satisfies ${h} of ${P.m} clauses` + (solved ? ` — all of them, so ${bits} is a solution.` : `; false clauses: ${L.unsatText(P, bits)}.`) + (newBest && !solved ? " New best h." : ""),
        table: { title: "truth table", columns: ["#", "assignment", "h", ""], rows: rows.map(r => r.slice()), rowStates: states.slice() },
        stats: L.stats(P, bits, [{ label: "solutions", value: sols.length, state: sols.length ? "ok" : "" }]),
      }, L.drawBits(P, bits, { state: solved ? "goal" : undefined })));
    }
    steps.push(Object.assign({
      caption: sols.length ? `All ${2 ** P.n} rows tried. ${sols.length === 1 ? "The unique solution is" : "Solutions:"} ${sols.join(", ")} (h = ${P.m}).` : `All ${2 ** P.n} rows tried and none has h = ${P.m}: the formula is unsatisfiable. The best assignment is ${bestBits} with h = ${bestH}.`,
      table: { title: "truth table", columns: ["#", "assignment", "h", ""], rows, rowStates: states },
      stats: [{ label: "solutions", value: sols.length, state: sols.length ? "ok" : "bad" }, { label: "best h", value: `${bestH} / ${P.m}` }],
    }, L.drawBits(P, sols[0] || bestBits, { state: sols.length ? "goal" : "path" })));
    return { steps, result: { bits: sols[0] || bestBits, h: bestH, solved: sols.length > 0, solutions: sols, evaluated: 2 ** P.n } };
  },
});
