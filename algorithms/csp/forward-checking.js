/* Backtracking with forward checking (look-ahead). */
Studio.register({
  id: "csp-forward-checking",
  name: "Forward checking",
  family: "Constraint processing",
  week: 11,
  problem: "csp",
  order: 20,
  summary: "Combine search and reasoning: after assigning a variable, delete the values of its future neighbours that conflict with it. If some future domain becomes empty, backtrack at once instead of discovering the failure later.",
  pseudocode: `FC(assignment, domains, i):
    if i > n: return assignment
    for each value a in D(Xᵢ)
        D' ← copy of domains;  D'(Xᵢ) ← {a}
        for each unassigned neighbour Y: remove from D'(Y) values inconsistent with Xᵢ = a
        if no D'(Y) is empty: result ← FC(assignment + {Xᵢ = a}, D', i + 1); if result: return it
    return failure`,
  complexity: "Same worst case as backtracking; prunes dead ends one level earlier",
  learn: {
    "intro": "A constraint satisfaction problem has variables, each with a domain of values, and constraints saying which combinations are allowed. A solution assigns every variable a value from its domain so that every constraint holds. Forward checking combines search with a little reasoning: it looks ahead after each assignment.",
    "definition": "After assigning X = a, remove from the domains of X's unassigned neighbours every value that conflicts with a. If a domain becomes empty, reject a immediately.",
    "steps": [
      [
        "assign X = a",
        ""
      ],
      [
        "prune neighbours' domains",
        "Only constraints between X and future variables are used."
      ],
      [
        "empty domain → try the next value",
        "The dead end is found before descending."
      ]
    ],
    "formulas": [
      {
        "f": "D(Y) ← { b ∈ D(Y) : (a, b) allowed by C(X,Y) }",
        "read": "keep only values compatible with the new assignment",
        "why": "Any value removed could never be part of a solution extending X = a."
      }
    ],
    "why": "Usually far fewer nodes than plain backtracking; pairs well with choosing the variable with the smallest remaining domain (MRV).",
    "traps": [
      "Forward checking does not check two future variables against each other; arc consistency does."
    ],
    "props": {
      "complete": "yes",
      "optimal": "n/a",
      "time": "O(dⁿ) worst case",
      "space": "O(n·d) for domain copies"
    }
  },
  params: [{ key: "mrv", label: "Variable order", type: "select", default: "given", options: [["given", "as listed"], ["mrv", "smallest domain first (MRV)"]] }],
  run(P, { mrv }) {
    const C = Studio.cspLib, steps = [], A = {};
    let nodes = 0, backs = 0;
    const rows = [];
    const snap = (D, cur, cap, emptied = []) => steps.push({ caption: cap,
      nodes: Object.fromEntries(P.ids.map(v => [v, { state: v === cur ? "current" : emptied.includes(v) ? "open" : v in A ? "path" : "plain", label: v in A ? `${v}=${A[v]}` : v, sub: "{" + D[v].join(",") + "}" }])),
      edges: P.cons.map(c => ({ u: c.scope[0], v: c.scope[1], state: "faint", label: c.rel === "neq" ? "" : C.relText(c) })),
      table: { title: "domains", columns: ["variable", "domain", "assigned"], rows: P.ids.map(v => [v, "{" + D[v].join(",") + "}", v in A ? A[v] : ""]), rowStates: P.ids.map(v => (D[v].length === 0 ? "bad" : v in A ? "ok" : "")) },
      stats: [{ label: "nodes", value: nodes }, { label: "backtracks", value: backs }] });
    const fc = D => {
      const left = P.ids.filter(v => !(v in A));
      if (!left.length) return true;
      const x = mrv === "mrv" ? left.slice().sort((a, b) => D[a].length - D[b].length)[0] : left[0];
      for (const a of D[x]) {
        nodes++;
        const D2 = Object.fromEntries(P.ids.map(v => [v, D[v].slice()])); D2[x] = [a];
        const emptied = [], pruned = [];
        for (const y of C.neighbours(P, x)) if (!(y in A)) {
          const before = D2[y].length;
          D2[y] = D2[y].filter(b => C.between(P, x, y).every(c => C.ok(c, x, a, y, b)));
          if (D2[y].length < before) pruned.push(`${y}:{${D2[y].join(",")}}`);
          if (!D2[y].length) emptied.push(y);
        }
        if (emptied.length) { snap(D2, x, `${x} = ${a} empties the domain of ${emptied.join(", ")}: reject without going deeper`, emptied); continue; }
        A[x] = a; snap(D2, x, `${x} = ${a}; forward check ${pruned.length ? "prunes " + pruned.join(" ") : "removes nothing"}`);
        if (fc(D2)) return true;
        delete A[x];
      }
      backs++; snap(D, x, `Every value of ${x} fails: backtrack`);
      return false;
    };
    const D0 = Object.fromEntries(P.ids.map(v => [v, P.dom[v].slice()]));
    snap(D0, null, "Initial domains");
    const ok = fc(D0);
    snap(Object.fromEntries(P.ids.map(v => [v, A[v] !== undefined ? [A[v]] : []])), null, ok ? `Solution: ${P.ids.map(v => v + "=" + A[v]).join(", ")} after ${nodes} assignments tried, ${backs} backtracks` : "No solution exists");
    return { steps, result: { solution: ok ? Object.assign({}, A) : null, nodes, backtracks: backs } };
  },
});
