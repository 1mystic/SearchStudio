/* Week 11: path consistency (3-consistency) on triangles of variables; PC-1 style sweeps. */
Studio.register({
  id: "csp-path-consistency",
  defaultExample: "csp-pc-triangle",
  name: "Path consistency (PC, i-consistency)",
  family: "Constraint processing",
  week: 11,
  problem: "csp",
  order: 40,
  summary: "Go beyond arc consistency: for every triangle X, Z, Y keep a pair (a, b) in the relation R(X,Y) only if some value c of Z is compatible with both (a, c) in R(X,Z) and (c, b) in R(Z,Y). This tightens the constraints themselves (it can empty a relation) and finds failures that arc consistency cannot see.",
  pseudocode: `PC-1:
    R(X,Y) ← allowed pairs of the constraint, or all pairs if X and Y are unconstrained
    repeat
        for each triangle (X, Z, Y)
            R(X,Y) ← R(X,Y) ∩ ( R(X,Z) ∘ R(Z,Y) )       # (a,b) needs a witness c in D(Z)
    until no relation changed
    if some R(X,Y) is empty: no solution`,
  complexity: "O(n³ d³) per sweep for n variables, domain size d",
  learn: {
    "intro": "Arc consistency looks at one constraint at a time. Path consistency looks at a path of two constraints through a third variable, which is the smallest way to notice that constraints interact.",
    "definition": "The network is i-consistent if every consistent assignment to any i − 1 variables can be extended to any i-th variable. Arc consistency is 2-consistency; path consistency is 3-consistency: every consistent pair (X = a, Y = b) can be extended to every third variable Z. Enforcing it deletes pairs from the relation R(X,Y), possibly making a new implicit constraint between variables that had none.",
    "steps": [["pick a triangle X, Z, Y", "Only two constraints are used at a time: R(X,Z) and R(Z,Y)."], ["compose R(X,Z) ∘ R(Z,Y)", "All pairs (a, b) for which some c fits both."], ["intersect with R(X,Y)", "Pairs without a witness are deleted."], ["repeat until nothing changes", "A deletion can destroy the witness of another pair."], ["empty relation", "No solution."]],
    "formulas": [{ "f": "R(X,Y) ← R(X,Y) ∩ { (a,b) : ∃ c ∈ D(Z), (a,c) ∈ R(X,Z) ∧ (c,b) ∈ R(Z,Y) }", "read": "keep a pair only if the third variable can be given a value that works with both", "why": "In any solution containing X = a, Y = b, the variable Z has some value c, and that value must satisfy both constraints, so pairs with no such c cannot be in a solution." }, { "f": "k-consistency: every consistent (k−1)-assignment extends to any k-th variable", "read": "k = 1 node, k = 2 arc, k = 3 path", "why": "Higher k reasons about bigger groups, at a higher cost; k = n gives a backtrack-free search." }],
    "why": "Two colours on a triangle: each value has a partner on every edge, so arc consistency removes nothing, yet three mutually different variables with two values cannot exist. Path consistency empties a relation and proves it.",
    "traps": ["Try example 'Two colours on a triangle': run Arc consistency first (nothing is deleted), then this algorithm (a relation becomes empty). Path consistency is strictly stronger than arc consistency, and also costlier.", "Path consistency prunes PAIRS (it changes constraints), not just values; domains shrink only afterwards, when arc consistency is run on the tightened relations (done in the last step).", "It can add constraints between variables that had none: unconstrained pairs start as 'all pairs allowed'.", "The i-consistency hierarchy (strong i-consistency for i = n gives backtrack-free search) is shown as background; only the 3-consistency algorithm is traced. The remark on strong k-consistency is **supplementary**."],
    "props": { "complete": "no (filtering only)", "optimal": "n/a", "time": "O(n³·d³) per sweep", "space": "O(n²·d²)" },
  },
  params: [{ key: "maxsweeps", label: "Max sweeps", type: "int", default: 10, min: 1, max: 30 }],
  run(P, { maxsweeps }) {
    const C = Studio.cspLib, ids = P.ids, steps = [];
    const key = (x, y) => x + "|" + y;
    const R = {};   // R[x|y][i][j] = boolean on value indices, kept symmetric
    const idx = Object.fromEntries(ids.map(v => [v, P.dom[v]]));
    const orig = {};
    for (const x of ids) for (const y of ids) if (x !== y) R[key(x, y)] = idx[x].map(a => idx[y].map(b => C.between(P, x, y).every(c => C.ok(c, x, a, y, b))));
    for (const k in R) orig[k] = R[k].map(r => r.slice());
    const count = k => R[k].reduce((s, r) => s + r.filter(Boolean).length, 0);
    const full = (x, y) => idx[x].length * idx[y].length;
    const pairs = []; ids.forEach((x, i) => ids.slice(i + 1).forEach(y => pairs.push([x, y])));
    const constrained = ([x, y]) => count(key(x, y)) < full(x, y);
    const allowedText = (x, y) => { const o = []; idx[x].forEach((a, i) => idx[y].forEach((b, j) => { if (R[key(x, y)][i][j]) o.push(`(${a},${b})`); })); return o.length > 10 ? o.slice(0, 10).join(" ") + ` … (${o.length})` : o.join(" ") || "none"; };
    const wasCon = Object.fromEntries(pairs.map(p => [key(...p), constrained(p)]));
    let removedTotal = 0, tests = 0, empty = null, hot = null;
    const log = [];
    const snap = cap => steps.push({ caption: cap,
      nodes: Object.fromEntries(ids.map(v => [v, { state: hot && hot.includes(v) ? (v === hot[1] ? "open" : "current") : "plain", sub: "{" + idx[v].join(",") + "}" }])),
      edges: pairs.filter(p => constrained(p) || (hot && hot.includes(p[0]) && hot.includes(p[1]))).map(([x, y]) => ({ u: x, v: y, state: hot && [x, y].every(v => hot.includes(v)) ? "candidate" : wasCon[key(x, y)] ? "faint" : "added", label: `${count(key(x, y))}/${full(x, y)} pairs` })),
      table: { title: "relations R(X,Y): allowed pairs", columns: ["pair", "allowed", "kept", "removed so far"], rows: pairs.map(([x, y]) => [`${x}–${y}`, allowedText(x, y), `${count(key(x, y))}/${full(x, y)}`, count(key(x, y)) < (orig[key(x, y)].reduce((s, r) => s + r.filter(Boolean).length, 0)) ? orig[key(x, y)].reduce((s, r) => s + r.filter(Boolean).length, 0) - count(key(x, y)) : 0]), rowStates: pairs.map(([x, y]) => (count(key(x, y)) === 0 ? "bad" : hot && [x, y].every(v => hot.includes(v)) ? "cur" : "")) },
      stats: [{ label: "pairs removed", value: removedTotal }, { label: "triangle tests", value: tests }] });
    snap(`Relations before any reasoning. ${pairs.length} pairs of variables, ${pairs.filter(constrained).length} constrained; a pair without a constraint allows every combination`);
    let sweep = 0, changed = true;
    while (changed && !empty && sweep < maxsweeps) {
      changed = false; sweep++;
      for (const z of ids) for (const [x, y] of pairs) {
        if (empty) break;
        if (z === x || z === y) continue;
        tests++;
        const rxy = R[key(x, y)], rxz = R[key(x, z)], rzy = R[key(z, y)], gone = [];
        idx[x].forEach((a, i) => idx[y].forEach((b, j) => { if (rxy[i][j] && !idx[z].some((c, k) => rxz[i][k] && rzy[k][j])) { gone.push([i, j]); } }));
        if (!gone.length) continue;
        const wasUnc = !constrained([x, y]);
        gone.forEach(([i, j]) => { rxy[i][j] = false; R[key(y, x)][j][i] = false; });
        removedTotal += gone.length; changed = true; hot = [x, y, z].sort(); hot = [x, z, y];
        log.push({ via: z, pair: [x, y], removed: gone.map(([i, j]) => [idx[x][i], idx[y][j]]), induced: wasUnc });
        const witness = gone.slice(0, 4).map(([i, j]) => `(${idx[x][i]},${idx[y][j]})`).join(" ") + (gone.length > 4 ? " …" : "");
        if (count(key(x, y)) === 0) { empty = [x, y]; snap(`Triangle ${x}, ${z}, ${y}: no value of ${z} fits any remaining pair of ${x}–${y}. R(${x},${y}) is empty, so there is no solution (arc consistency alone could not tell)`); break; }
        snap(`Triangle ${x}, ${z}, ${y}: pairs ${witness} of ${x}–${y} have no value of ${z} compatible with both R(${x},${z}) and R(${z},${y}); delete ${gone.length} pair${gone.length > 1 ? "s" : ""}` + (wasUnc ? `. ${x} and ${y} had no constraint; now they have an induced one` : ""));
      }
      hot = null;
    }
    // domains implied by the tightened relations (arc consistency on them)
    const D = Object.fromEntries(ids.map(v => [v, idx[v].slice()]));
    let ch = true;
    while (ch) { ch = false; for (const x of ids) for (const y of ids) if (x !== y) { const keep = D[x].filter(a => D[y].some(b => R[key(x, y)][idx[x].indexOf(a)][idx[y].indexOf(b)])); if (keep.length < D[x].length) { D[x] = keep; ch = true; } } }
    const shrunk = ids.filter(v => D[v].length < idx[v].length);
    hot = null;
    const hasEmpty = !!empty || ids.some(v => !D[v].length);
    steps.push(Object.assign({}, steps[steps.length - 1], { caption: hasEmpty ? `Path consistency proves there is no solution (after ${sweep} sweep${sweep > 1 ? "s" : ""}, ${removedTotal} pairs removed)` : `Path consistent after ${sweep} sweep${sweep > 1 ? "s" : ""}: ${removedTotal} pairs removed. Arc consistency on the tightened relations leaves ${ids.map(v => v + "{" + D[v].join(",") + "}").join(" ")}${shrunk.length ? "" : ": the domains themselves did not shrink"}`,
      nodes: Object.fromEntries(ids.map(v => [v, { state: !D[v].length ? "goal" : D[v].length === 1 ? "path" : "plain", sub: "{" + D[v].join(",") + "}" }])) }));
    return { steps, result: { inconsistent: hasEmpty, emptyPair: empty, removed: removedTotal, sweeps: sweep, domains: D, log, induced: pairs.filter(p => !wasCon[key(...p)] && constrained(p)).map(p => p.join("-")) } };
  },
});
