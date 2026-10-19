/* Arc consistency: Revise, AC-1 and AC-3. */
Studio.register({
  id: "csp-ac3",
  name: "Arc consistency (AC-1, AC-3)",
  family: "Constraint processing",
  week: 11,
  problem: "csp",
  order: 30,
  summary: "Delete every value that has no supporting value in a neighbouring variable. Revise(X, Y) removes unsupported values of X with respect to Y. AC-1 sweeps all arcs until nothing changes; AC-3 keeps a queue and re-examines only the arcs into a variable whose domain shrank.",
  pseudocode: `Revise(X, Y):
    for each a in D(X): if no b in D(Y) satisfies the constraint: delete a from D(X)
    return whether D(X) changed

AC-3:
    Q ← every arc (X, Y)
    while Q not empty
        (X, Y) ← pop(Q)
        if Revise(X, Y): add every arc (Z, X) with Z ≠ Y to Q
AC-1: repeat Revise on all arcs until a full pass changes nothing`,
  complexity: "AC-3: O(e·d³) for e constraints and domain size d",
  learn: {
    "intro": "A constraint satisfaction problem has variables, each with a domain of values, and constraints saying which combinations are allowed. A solution assigns every variable a value from its domain so that every constraint holds. Arc consistency removes values that cannot possibly be part of any solution, before or during search.",
    "definition": "An arc (X, Y) is consistent if every value of X has some supporting value in Y. Revise(X, Y) deletes unsupported values. AC-1 revises every arc until a whole pass changes nothing; AC-3 keeps a queue and re-examines only arcs pointing into a variable whose domain just shrank.",
    "steps": [
      [
        "queue all arcs",
        "Both directions of every constraint."
      ],
      [
        "Revise(X, Y)",
        "Delete values of X with no support in Y."
      ],
      [
        "if D(X) shrank: queue (Z, X)",
        "Neighbours of X may have lost their support."
      ],
      [
        "queue empty → arc consistent",
        "Empty domain: no solution. All singletons: solved."
      ]
    ],
    "formulas": [
      {
        "f": "a ∈ D(X) survives ⇔ ∃ b ∈ D(Y): (a, b) ∈ C(X, Y)",
        "read": "a value needs a partner on every arc",
        "why": "A value with no partner can never satisfy that constraint, so it can be deleted safely."
      },
      {
        "f": "AC-3: O(e · d³)",
        "read": "each arc is re-queued at most d times, each revision costs d²",
        "why": "Domains only shrink, so the work is bounded."
      }
    ],
    "why": "Cheap reasoning that shrinks domains; sometimes it solves the problem outright (the chain example), sometimes it only prunes (map colouring).",
    "traps": [
      "Arcs are directed: (X, Y) and (Y, X) are different.",
      "Arc consistency does not guarantee a solution exists."
    ],
    "props": {
      "complete": "no (filtering only)",
      "optimal": "n/a",
      "time": "O(e·d³)",
      "space": "O(e)"
    }
  },
  params: [{ key: "algo", label: "Algorithm", type: "select", default: "ac3", options: [["ac3", "AC-3 (queue)"], ["ac1", "AC-1 (repeat full passes)"]] }],
  run(P, { algo }) {
    const C = Studio.cspLib, steps = [], D = Object.fromEntries(P.ids.map(v => [v, P.dom[v].slice()]));
    const arcs = P.cons.flatMap(c => [[c.scope[0], c.scope[1]], [c.scope[1], c.scope[0]]]);
    let revisions = 0;
    const rows = [];
    const snap = (arc, cap, Q) => steps.push({ caption: cap,
      nodes: Object.fromEntries(P.ids.map(v => [v, { state: arc && v === arc[0] ? "current" : arc && v === arc[1] ? "open" : D[v].length === 1 ? "path" : D[v].length === 0 ? "goal" : "plain", sub: "{" + D[v].join(",") + "}" }])),
      edges: P.cons.map(c => ({ u: c.scope[0], v: c.scope[1], state: arc && c.scope.includes(arc[0]) && c.scope.includes(arc[1]) ? "candidate" : "faint", label: c.rel === "neq" ? "" : C.relText(c) })),
      lists: Q ? [{ label: "QUEUE", items: Q.map(([x, y]) => ({ text: `(${x},${y})`, state: "open" })) }] : [],
      table: { title: "revisions", columns: ["#", "arc", "deleted", "D(X) now"], rows: rows.slice(-14), rowStates: rows.slice(-14).map(r => (r[2] !== "–" ? "warn" : "")) },
      stats: [{ label: "revisions", value: revisions }] });
    const revise = (x, y) => {
      revisions++;
      const del = D[x].filter(a => !D[y].some(b => C.between(P, x, y).every(c => C.ok(c, x, a, y, b))));
      D[x] = D[x].filter(a => !del.includes(a));
      rows.push([revisions, `(${x},${y})`, del.length ? del.join(",") : "–", "{" + D[x].join(",") + "}"]);
      return del;
    };
    if (algo === "ac1") {
      snap(null, "AC-1: revise every arc, repeat while any domain changes");
      for (let pass = 1; pass < 50; pass++) {
        let changed = false;
        for (const [x, y] of arcs) { const del = revise(x, y); if (del.length) changed = true; snap([x, y], `Pass ${pass}: Revise(${x}, ${y}) ${del.length ? "deletes " + del.join(", ") + " from " + x : "deletes nothing"}`); }
        if (!changed) break;
      }
    } else {
      const Q = arcs.slice();
      snap(null, `AC-3: queue holds all ${Q.length} arcs`, Q);
      while (Q.length) {
        const [x, y] = Q.shift();
        const del = revise(x, y);
        if (del.length) P.cons.filter(c => c.scope.includes(x)).forEach(c => { const z = c.scope[0] === x ? c.scope[1] : c.scope[0]; if (z !== y && !Q.some(([a, b]) => a === z && b === x)) Q.push([z, x]); });
        snap([x, y], `Revise(${x}, ${y}): ${del.length ? "delete " + del.join(", ") + " from " + x + "; re-queue arcs into " + x : "no change"}`, Q);
        if (!D[x].length) break;
      }
    }
    const empty = P.ids.filter(v => !D[v].length), single = P.ids.every(v => D[v].length === 1);
    snap(null, empty.length ? `Domain of ${empty.join(", ")} is empty: no solution exists` : single ? `Arc consistent and every domain is a single value: the solution is ${P.ids.map(v => v + "=" + D[v][0]).join(", ")}` : `Arc consistent after ${revisions} revisions. Some domains still hold several values, so search is still needed`);
    return { steps, result: { domains: D, revisions } };
  },
});
