/* Week 12: nogood recording (look-back learning). Backtracking that stores the reason of every dead end as a nogood and prunes with it later. */
Studio.register({
  id: "csp-nogood",
  name: "Nogood recording",
  family: "Constraint processing · lookback",
  week: 12,
  problem: "csp",
  order: 70,
  summary: "Backtracking that learns. When a variable runs out of values, the assignments in its conflict set cannot be extended to a solution: store them as a nogood. Before trying any later value, check whether the assignment would contain a stored nogood and, if so, reject it without searching.",
  pseudocode: `Nogood-BT(i):
    conf(Xᵢ) ← { }
    for each value a in D(Xᵢ)
        if some stored nogood ⊆ assignment + {Xᵢ = a}: add its other variables to conf(Xᵢ); skip a   # pruned by a nogood
        else if a clashes with an assigned Xⱼ: add Xⱼ to conf(Xᵢ); skip a
        else assign Xᵢ = a; if Nogood-BT(i + 1) succeeds: return success
             else add the failed child's conflict set − {Xᵢ} to conf(Xᵢ)
    store nogood { Xⱼ = value(Xⱼ) : Xⱼ ∈ conf(Xᵢ) }         # unless a smaller stored nogood already covers it
    return failure                                            # chronological: go back to Xᵢ₋₁`,
  complexity: "Same worst case as backtracking; storage may grow exponentially unless nogoods are limited",
  learn: {
    "intro": "Backtracking can discover the same dead end again and again under different irrelevant assignments. Nogood recording is a look-back method that remembers a dead end in a general form so it is never rediscovered.",
    "definition": "A nogood is a partial assignment that cannot be extended to a solution. When Xᵢ has no value left, the values of the variables in its conflict set form a nogood. Later, any assignment that contains a stored nogood is rejected immediately.",
    "steps": [["try a value of Xᵢ", ""], ["contains a stored nogood?", "Reject at once and note which nogood did it."], ["clash with an earlier Xⱼ?", "Record Xⱼ in the conflict set."], ["no value left", "Build the nogood from the conflict set and store it."], ["backtrack", "Chronologically here; combine with backjumping for both effects."]],
    "formulas": [{ "f": "nogood = { Xⱼ = vⱼ : Xⱼ ∈ conf(Xᵢ) }", "read": "the culprits and their current values", "why": "The values in conf(Xᵢ) alone already exclude every value of Xᵢ, so any assignment containing them is hopeless, whatever else it says." }],
    "why": "Small nogoods prune big parts of the tree. In the example 'Nogood recording' the single nogood {A=r} found at D rejects three later values (C=z, B=y, B=z) without any search.",
    "traps": ["A nogood only prunes assignments that contain ALL of its variable-value pairs.", "Storing every nogood costs memory; real systems bound the size or the number of nogoods.", "Nogoods whose variables are already covered by a smaller stored nogood are not stored again. This subsumption test is **supplementary**."],
    "props": { "complete": "yes", "optimal": "n/a", "time": "O(dⁿ) worst case, ≤ backtracking", "space": "O(number of nogoods)" },
  },
  params: [],
  run(P) {
    const C = Studio.cspLib, steps = [], A = {}, vars = P.ids.slice(), conf = {}, nogoods = [], pruneLog = [];
    let nodes = 0, backs = 0, prunes = 0;
    const show = s => "{" + [...s].join(",") + "}";
    const ngText = g => "{" + Object.keys(g).map(v => `${v}=${g[v]}`).join(", ") + "}";
    const snap = (cur, cap, hot = []) => steps.push({ caption: cap,
      nodes: Object.fromEntries(P.ids.map(v => [v, { state: v === cur ? "current" : hot.includes(v) ? "open" : v in A ? "path" : "plain", label: v in A ? `${v}=${A[v]}` : v, sub: "{" + P.dom[v].join(",") + "}" }])),
      edges: P.cons.map(c => ({ u: c.scope[0], v: c.scope[1], state: "faint", label: c.rel === "neq" ? "" : C.relText(c) })),
      lists: [{ label: "NOGOODS", items: nogoods.map((g, k) => ({ text: `#${k + 1} ${ngText(g.set)}${g.uses ? " ×" + g.uses : ""}`, state: g.uses ? "closed" : "open" })) }],
      table: { title: "stored nogoods", columns: ["#", "nogood", "learned at", "prunes so far"], rows: nogoods.map((g, k) => [k + 1, ngText(g.set), g.at, g.uses]), rowStates: nogoods.map(g => (g.uses ? "ok" : "")) },
      stats: [{ label: "nodes", value: nodes }, { label: "backtracks", value: backs }, { label: "nogoods stored", value: nogoods.length }, { label: "values pruned by nogoods", value: prunes }] });
    const contains = (g, x, a) => Object.keys(g).every(v => (v === x ? a === g[v] : v in A && A[v] === g[v]));
    const subsumed = g => nogoods.some(o => Object.keys(o.set).every(v => g[v] === o.set[v]));
    /* returns true or a Set (the failed variable's conflict set) */
    const bt = i => {
      if (i === vars.length) return true;
      const x = vars[i]; conf[x] = new Set();
      for (const a of P.dom[x]) {
        const hit = nogoods.findIndex(g => contains(g.set, x, a));
        if (hit >= 0) {
          nogoods[hit].uses++; prunes++; Object.keys(nogoods[hit].set).forEach(v => { if (v !== x) conf[x].add(v); });
          pruneLog.push({ var: x, value: a, nogood: hit + 1 });
          snap(x, `${x} = ${a} contains the stored nogood #${hit + 1} ${ngText(nogoods[hit].set)}: rejected without any search`, Object.keys(nogoods[hit].set).filter(v => v !== x)); continue;
        }
        nodes++;
        const culprit = vars.slice(0, i).find(y => C.between(P, x, y).some(c => !C.ok(c, x, a, y, A[y])));
        if (culprit) { conf[x].add(culprit); snap(x, `${x} = ${a} clashes with ${culprit} = ${A[culprit]}: ${culprit} joins conf(${x}) = ${show(conf[x])}`, [culprit]); continue; }
        A[x] = a; snap(x, `${x} = ${a} is consistent with the assignment so far`);
        const r = bt(i + 1);
        if (r === true) return true;
        delete A[x];
        r.forEach(v => { if (v !== x) conf[x].add(v); });
      }
      backs++;
      const members = vars.filter(v => conf[x].has(v)), g = {}; members.forEach(v => (g[v] = A[v]));
      if (!members.length) snap(x, `No value left for ${x} and conf(${x}) is empty: no solution`);
      else if (subsumed(g)) snap(x, `No value left for ${x}. conf(${x}) = ${show(members)} gives ${ngText(g)}, which an already stored nogood covers: nothing new to store. Backtrack`, members);
      else { nogoods.push({ set: g, at: x, uses: 0 }); snap(x, `No value left for ${x}. conf(${x}) = ${show(members)}, so ${ngText(g)} cannot be extended to a solution: store it as nogood #${nogoods.length}. Backtrack`, members); }
      return conf[x];
    };
    snap(null, "Chronological backtracking that stores a nogood at every dead end and checks stored nogoods before every value");
    const ok = bt(0) === true;
    snap(null, ok ? `Solution: ${vars.map(v => v + "=" + A[v]).join(", ")} after ${nodes} assignments tried; ${prunes} values were rejected by stored nogoods` : "No solution exists");
    return { steps, result: { solution: ok ? Object.assign({}, A) : null, nodes, backtracks: backs, nogoods: nogoods.map(g => Object.assign({}, g.set)), nogoodPrunes: prunes, pruned: pruneLog } };
  },
});
