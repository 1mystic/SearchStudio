/* Chronological backtracking for CSPs. */
Studio.register({
  id: "csp-backtracking",
  name: "Backtracking",
  family: "Constraint processing",
  week: 11,
  problem: "csp",
  order: 10,
  summary: "Assign variables one at a time in a fixed order, trying values in order. If a value conflicts with an earlier assignment try the next; if none is left, go back to the previous variable (chronological backtracking).",
  pseudocode: `Backtrack(assignment, i):
    if i > n: return assignment
    for each value a in D(Xᵢ)
        if a is consistent with every assigned neighbour of Xᵢ
            result ← Backtrack(assignment + {Xᵢ = a}, i + 1)
            if result ≠ failure: return result
    return failure                          # go back to Xᵢ₋₁`,
  complexity: "Worst case O(dⁿ) for n variables with d values",
  learn: {
    "intro": "A constraint satisfaction problem has variables, each with a domain of values, and constraints saying which combinations are allowed. A solution assigns every variable a value from its domain so that every constraint holds. Backtracking is depth-first search over partial assignments.",
    "definition": "Assign variables in a fixed order. Try each value; keep it if it is consistent with the earlier assignments and continue; if no value works, return to the previous variable and try its next value.",
    "steps": [
      [
        "pick the next variable",
        "Static order here, or most-constrained first."
      ],
      [
        "try values in order",
        ""
      ],
      [
        "consistent with earlier assignments?",
        "Only constraints with already assigned variables can be checked."
      ],
      [
        "no value left → backtrack",
        "Undo the last assignment."
      ]
    ],
    "formulas": [
      {
        "f": "search tree size ≤ d + d² + … + dⁿ",
        "read": "up to dⁿ complete assignments",
        "why": "Each level multiplies the branches by the domain size."
      }
    ],
    "why": "Complete and simple, but it discovers failures late. Look-ahead (forward checking) and consistency (arc consistency) detect them earlier.",
    "traps": [
      "Count every value tried as a node.",
      "Backtracking returns to the most recent variable, even if it is not the cause of the failure."
    ],
    "props": {
      "complete": "yes",
      "optimal": "n/a (any solution)",
      "time": "O(dⁿ)",
      "space": "O(n)"
    }
  },
  params: [{ key: "order", label: "Variable order", type: "select", default: "given", options: [["given", "as listed"], ["degree", "most constraints first"]] }],
  run(P, { order }) {
    const C = Studio.cspLib, steps = [], A = {};
    let vars = P.ids.slice(); if (order === "degree") vars.sort((a, b) => C.neighbours(P, b).length - C.neighbours(P, a).length);
    let nodes = 0, backs = 0;
    const rows = [];
    const snap = (cur, cap, bad = []) => steps.push({ caption: cap,
      nodes: Object.fromEntries(P.ids.map(v => [v, { state: v === cur ? "current" : bad.includes(v) ? "open" : v in A ? "path" : "plain", label: v in A ? `${v}=${A[v]}` : v, sub: "{" + P.dom[v].join(",") + "}" }])),
      edges: P.cons.map(c => ({ u: c.scope[0], v: c.scope[1], state: bad.includes(c.scope[0]) && c.scope.includes(cur) || bad.includes(c.scope[1]) && c.scope.includes(cur) ? "rejected" : "faint", label: c.rel === "neq" ? "" : C.relText(c) })),
      table: { title: "search", columns: ["#", "variable", "value", "result"], rows: rows.slice(-14), rowStates: rows.slice(-14).map(r => (r[3].startsWith("ok") ? "" : r[3].startsWith("back") ? "warn" : "bad")) },
      stats: [{ label: "nodes", value: nodes }, { label: "backtracks", value: backs }] });
    const bt = i => {
      if (i === vars.length) return true;
      const x = vars[i];
      for (const a of P.dom[x]) {
        nodes++;
        const clash = Object.keys(A).filter(y => C.between(P, x, y).some(c => !C.ok(c, x, a, y, A[y])));
        if (clash.length) { rows.push([nodes, x, a, `conflicts with ${clash.map(y => y + "=" + A[y]).join(", ")}`]); snap(x, `${x} = ${a} conflicts with ${clash.map(y => y + "=" + A[y]).join(", ")}`, clash); continue; }
        A[x] = a; rows.push([nodes, x, a, "ok"]); snap(x, `${x} = ${a} is consistent with the assignment so far`);
        if (bt(i + 1)) return true;
        delete A[x];
      }
      backs++; rows.push([nodes, x, "–", "backtrack"]); snap(x, `No value left for ${x}: backtrack to ${vars[i - 1] || "the start"}`);
      return false;
    };
    const ok = bt(0);
    snap(null, ok ? `Solution: ${vars.map(v => v + "=" + A[v]).join(", ")} after ${nodes} assignments tried, ${backs} backtracks` : "No solution exists");
    return { steps, result: { solution: ok ? Object.assign({}, A) : null, nodes, backtracks: backs } };
  },
});
