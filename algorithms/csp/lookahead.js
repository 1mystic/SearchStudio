/* Week 12: look-ahead for CSPs. Forward checking + extra reasoning among the future variables.
 * Three registered algorithms share one engine: partial look-ahead, full look-ahead, arc-consistency look-ahead (MAC). */
(function (S) {
  const C = S.cspLib;
  const copyD = (P, D) => Object.fromEntries(P.ids.map(v => [v, D[v].slice()]));
  /* revise D[x] against D[y]; returns the deleted values */
  const revise = (P, D, x, y) => {
    const del = D[x].filter(a => !D[y].some(b => C.between(P, x, y).every(c => C.ok(c, x, a, y, b))));
    if (del.length) D[x] = D[x].filter(a => !del.includes(a));
    return del;
  };
  /* The engine. Assign x = a on top of domains D (A = earlier assignments).
   * mode: "fc" (forward checking only) | "partial" | "full" | "mac".
   * Returns { D, fc, extra, wipe } where fc / extra map variable -> values deleted by forward checking / by the extra look-ahead,
   * and wipe is null or { by: "fc" | "lookahead", v: variable whose domain became empty }. */
  function apply(P, D, A, x, a, mode, order) {
    const D2 = copyD(P, D); D2[x] = [a];
    const fc = {}, extra = {};
    const note = (m, v, del) => { if (del.length) m[v] = (m[v] || []).concat(del); };
    for (const y of C.neighbours(P, x)) if (!(y in A) && y !== x) {
      const before = D2[y].slice();
      D2[y] = D2[y].filter(b => C.between(P, x, y).every(c => C.ok(c, x, a, y, b)));
      note(fc, y, before.filter(v => !D2[y].includes(v)));
      if (!D2[y].length) return { D: D2, fc, extra, wipe: { by: "fc", v: y } };
    }
    if (mode === "fc") return { D: D2, fc, extra, wipe: null };
    const F = order.filter(v => !(v in A) && v !== x);
    const arcs = [];
    F.forEach((i, ii) => F.forEach((j, jj) => { if (i === j || !C.neighbours(P, i).includes(j)) return; if (mode === "partial" && jj < ii) return; arcs.push([i, j]); }));
    const doArc = ([i, j]) => { const del = revise(P, D2, i, j); note(extra, i, del); return del; };
    if (mode === "mac") {
      const Q = arcs.slice();
      while (Q.length) {
        const [i, j] = Q.shift(), del = doArc([i, j]);
        if (!D2[i].length) return { D: D2, fc, extra, wipe: { by: "lookahead", v: i } };
        if (del.length) F.forEach(k => { if (k !== i && k !== j && C.neighbours(P, i).includes(k) && !Q.some(([p, q]) => p === k && q === i)) Q.push([k, i]); });
      }
    } else for (const arc of arcs) { doArc(arc); if (!D2[arc[0]].length) return { D: D2, fc, extra, wipe: { by: "lookahead", v: arc[0] } }; }
    return { D: D2, fc, extra, wipe: null };
  }
  C.lookahead = { apply };

  const MODES = {
    partial: { id: "csp-lookahead-partial", name: "Partial look-ahead", order: 50, def: "csp-lookahead-gw",
      what: "forward checking, then each future variable Xᵢ is also revised against the LATER future variables Xⱼ (j > i) in one pass",
      summary: "Forward checking plus one directed pass over the future variables: every future variable is revised against the future variables that come after it in the ordering. Cheaper than full look-ahead, catches fewer dead ends.",
      pass: "one pass, arcs (Xᵢ, Xⱼ) with i before j" },
    full: { id: "csp-lookahead-full", name: "Full look-ahead", order: 51, def: "csp-lookahead-gw",
      what: "forward checking, then every arc between two future variables is revised once, in both directions",
      summary: "Forward checking plus one pass of arc revision over every arc between future variables (both directions). Detects dead ends that forward checking cannot, e.g. a future variable squeezed empty by two other future variables.",
      pass: "one pass over all future arcs" },
    mac: { id: "csp-lookahead-mac", name: "Arc-consistency look-ahead (MAC)", order: 52, def: "csp-lookahead-ladder",
      what: "forward checking, then AC-3 on the future variables until nothing changes (maintaining arc consistency)",
      summary: "After each assignment, restore full arc consistency among the future variables with AC-3 (MAC: maintaining arc consistency). The strongest of the three look-aheads and the one with the smallest search tree.",
      pass: "AC-3 to a fixpoint" },
  };

  const run = (mode, P, { mrv }) => {
    const steps = [], A = {}, events = [];
    let nodes = 0, backs = 0, fcCount = 0, extraCount = 0, onlyLA = 0;
    const txt = m => Object.keys(m).map(v => `${v}:${m[v].join(",")}`).join(" ");
    const cell = d => (d && d.length ? "−" + d.join(" −") : "");
    const snap = (D, cur, cap, r) => steps.push({ caption: cap,
      nodes: Object.fromEntries(P.ids.map(v => [v, { state: v === cur ? "current" : r && r.wipe && r.wipe.v === v ? "open" : v in A ? "path" : "plain", label: v in A ? `${v}=${A[v]}` : v, sub: "{" + D[v].join(",") + "}" }])),
      edges: P.cons.map(c => ({ u: c.scope[0], v: c.scope[1], state: "faint", label: c.rel === "neq" ? "" : C.relText(c) })),
      table: { title: "domains · pruned by forward checking vs by the extra look-ahead", columns: ["variable", "domain now", "FC pruned", "extra pruned", "assigned"],
        rows: P.ids.map(v => [v, "{" + D[v].join(",") + "}", r ? cell(r.fc[v]) : "", r ? cell(r.extra[v]) : "", v in A ? A[v] : cur === v && r ? r.a : ""]),
        rowStates: P.ids.map(v => (D[v].length === 0 ? "bad" : r && r.extra[v] ? "warn" : v in A ? "ok" : "")) },
      stats: [{ label: "nodes", value: nodes }, { label: "backtracks", value: backs }, { label: "pruned by FC", value: fcCount }, { label: "extra pruned by look-ahead", value: extraCount }, { label: "dead ends only look-ahead saw", value: onlyLA }] });
    const search = D => {
      const left = P.ids.filter(v => !(v in A));
      if (!left.length) return true;
      const x = mrv === "mrv" ? left.slice().sort((p, q) => D[p].length - D[q].length)[0] : left[0];
      for (const a of D[x]) {
        nodes++;
        const r = apply(P, D, A, x, a, mode, P.ids); r.a = a;
        const nfc = Object.values(r.fc).reduce((s, l) => s + l.length, 0), nex = Object.values(r.extra).reduce((s, l) => s + l.length, 0);
        fcCount += nfc; extraCount += nex;
        events.push({ var: x, value: a, fc: r.fc, extra: r.extra, wipe: r.wipe });
        if (r.wipe) {
          if (r.wipe.by === "lookahead") onlyLA++;
          snap(r.D, x, r.wipe.by === "fc" ? `${x} = ${a}: forward checking empties D(${r.wipe.v}), reject` : `${x} = ${a}: forward checking prunes ${txt(r.fc) || "nothing"} and sees no empty domain, but the look-ahead then prunes ${txt(r.extra)} and D(${r.wipe.v}) becomes empty: reject. Forward checking alone would go deeper`, r);
          continue;
        }
        A[x] = a;
        snap(r.D, x, `${x} = ${a}: forward checking prunes ${txt(r.fc) || "nothing"}; the ${mode} look-ahead prunes ${nex ? txt(r.extra) + " as well" : "nothing more"}`, r);
        if (search(r.D)) return true;
        delete A[x];
      }
      backs++; snap(D, x, `Every value of ${x} fails: backtrack`, null);
      return false;
    };
    const D0 = Object.fromEntries(P.ids.map(v => [v, P.dom[v].slice()]));
    snap(D0, null, `Initial domains. After each assignment: ${MODES[mode].what}`, null);
    const ok = search(D0);
    snap(Object.fromEntries(P.ids.map(v => [v, A[v] !== undefined ? [A[v]] : []])), null, ok ? `Solution: ${P.ids.map(v => v + "=" + A[v]).join(", ")} after ${nodes} assignments tried, ${backs} backtracks, ${extraCount} values pruned beyond forward checking` : "No solution exists", null);
    return { steps, result: { solution: ok ? Object.assign({}, A) : null, nodes, backtracks: backs, fcPruned: fcCount, extraPruned: extraCount, lookaheadOnlyDeadEnds: onlyLA, events } };
  };

  for (const mode of Object.keys(MODES)) {
    const M = MODES[mode];
    S.register({
      id: M.id, defaultExample: M.def, name: M.name, family: "Constraint processing · lookahead", week: 12, problem: "csp", order: M.order,
      summary: M.summary,
      pseudocode: `Lookahead(assignment, domains, i):          # mode = ${mode}
    if i > n: return assignment
    for each value a in D(Xᵢ)
        D' ← copy of domains;  D'(Xᵢ) ← {a}
        forward check: prune D'(Y) of every unassigned neighbour Y against Xᵢ = a
        extra look-ahead (${M.pass}):
            revise the future variables against each other
        if no D'(Y) is empty: result ← Lookahead(assignment + {Xᵢ = a}, D', i + 1); if result: return it
    return failure`,
      complexity: "Same worst case as backtracking; each node costs more but the tree is smaller",
      learn: {
        "intro": "Look-ahead methods reason about the future variables after every assignment, so that dead ends are found one or more levels earlier. Forward checking only compares the variable just assigned with its future neighbours; the look-ahead methods also compare the future variables with each other.",
        "definition": `After assigning Xᵢ = a: (1) forward checking, then (2) ${M.what}. If any future domain becomes empty, reject a at once. This is the "${M.name}" variant: ${M.pass}.`,
        "steps": [["assign X = a", ""], ["forward checking", "Prune the future neighbours of X that clash with a."], ["extra look-ahead", `The part that goes beyond forward checking: ${M.pass}.`], ["empty domain → reject a", "The step table shows which deletions came from FC and which only from the look-ahead."]],
        "formulas": [{ "f": "D(Y) ← { b ∈ D(Y) : ∃ c ∈ D(Z), (b, c) allowed by C(Y,Z) }", "read": "delete values of a future variable Y that have no support in another future variable Z", "why": "A value without support can never be part of a solution extending the current assignment, so deleting it is safe." }],
        "why": "A future variable can be squeezed empty by two OTHER future variables. Forward checking cannot see that until one of them is assigned; look-ahead sees it now. Example: after G = W the neighbours of G lose W and become single-valued, which empties D(E); only the look-ahead variants notice (see the example 'G = W wipes out E').",
        "traps": ["The three variants prune in a strict order: forward checking < partial < full < MAC (each prunes at least what the previous one does). Example 'Look-ahead ladder' shows 17, 6, 5 and 3 values tried before the same conclusion (no solution).", "Partial look-ahead depends on the variable order: a variable that is last in the ordering is never revised against anything, so it may miss a wipe-out that full look-ahead finds.", "More pruning per node does not always mean less total time; each node costs more.", "Which pruning came from forward checking and which from the extra look-ahead is shown in separate columns. The split into 'partial / full / MAC' passes is the usual textbook presentation; the exact pass structure is **supplementary** to the lecture slides."],
        "props": { "complete": "yes", "optimal": "n/a", "time": "O(dⁿ) worst case, smaller tree than forward checking", "space": "O(n·d) for domain copies" },
      },
      params: [{ key: "mrv", label: "Variable order", type: "select", default: "given", options: [["given", "as listed"], ["mrv", "smallest domain first (MRV)"]] }],
      run(P, params) { return run(mode, P, params); },
    });
  }
})(Studio);
