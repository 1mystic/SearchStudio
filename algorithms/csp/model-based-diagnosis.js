/* Model-based diagnosis: find conflicts by constraint propagation, then minimal diagnoses as minimal hitting sets. */
Studio.register({
  id: "csp-diagnosis",
  name: "Model-based diagnosis",
  family: "Constraint processing",
  week: 11,
  problem: "circuit",
  order: 50,
  summary: "Assume components work as their models say and propagate values through the circuit. A contradiction with an observation implicates the components whose models were used: a conflict set. A diagnosis is a minimal set of components that hits every conflict.",
  pseudocode: `for each set S of components assumed OK
    propagate values using only the models of S (forward and backward through + and ×)
    if some wire gets two different values: S is inconsistent
conflicts ← minimal inconsistent sets
diagnoses ← minimal sets of components that intersect every conflict (minimal hitting sets)`,
  complexity: "Exponential in the number of components in this direct form (ATMS-style bookkeeping avoids recomputation)",
  learn: {
    "intro": "When a device misbehaves, model-based diagnosis asks: which components, if broken, would explain what we observe? It uses models of how each component should behave and looks for contradictions.",
    "definition": "Assume a set of components works and propagate values through their models. A contradiction with an observation means that set cannot all be working: it is a conflict set. A diagnosis is a minimal set of components that intersects every minimal conflict.",
    "steps": [
      [
        "propagate with every component assumed OK",
        "Find the first contradiction."
      ],
      [
        "find minimal conflicts",
        "Smallest sets of components whose joint correctness contradicts the observations."
      ],
      [
        "minimal hitting sets",
        "Each must contain at least one component from every conflict."
      ]
    ],
    "formulas": [
      {
        "f": "diagnosis D: D ∩ C ≠ ∅ for every conflict C, D minimal",
        "read": "blame at least one component in every conflict",
        "why": "If any conflict had no faulty member, the contradiction would remain."
      }
    ],
    "why": "The polybox has conflicts {M1, M2, A1} and {M1, M3, A1, A2}, giving the diagnoses {M1}, {A1}, {M2, M3}, {M2, A2}.",
    "traps": [
      "A conflict lists the components used to derive the contradiction, not just the one producing the wrong output.",
      "Diagnoses are minimal: supersets also explain the symptoms but are less likely."
    ],
    "props": {
      "complete": "yes (all minimal diagnoses)",
      "optimal": "n/a",
      "time": "exponential in components (direct form)",
      "space": "O(conflicts)"
    }
  },
  params: [],
  run(P) {
    const steps = [], comps = P.components, ids = comps.map(c => c.id);
    const propagate = ok => {
      const val = Object.assign({}, P.inputs), obs = Object.assign({}, P.observed), why = {};
      Object.keys(val).forEach(k => (why[k] = "input")); Object.keys(obs).forEach(k => { if (!(k in val)) { val[k] = obs[k]; why[k] = "observed"; } });
      let clash = null;
      const set = (w, v, c) => { if (!(w in val)) { val[w] = v; why[w] = c; return true; } if (val[w] !== v && !clash) clash = { w, have: val[w], got: v, by: c }; return false; };
      for (let it = 0; it < 20 && !clash; it++) {
        let changed = false;
        for (const c of comps) { if (!ok.has(c.id)) continue;
          const [x, y] = c.in, z = c.out, f = c.op === "add" ? (a, b) => a + b : (a, b) => a * b, inv = c.op === "add" ? (o, a) => o - a : (o, a) => (a !== 0 && o % a === 0 ? o / a : null);
          if (x in val && y in val) changed = set(z, f(val[x], val[y]), c.id) || changed;
          if (z in val && x in val && !(y in val)) { const v = inv(val[z], val[x]); if (v !== null) changed = set(y, v, c.id) || changed; }
          if (z in val && y in val && !(x in val)) { const v = inv(val[z], val[y]); if (v !== null) changed = set(x, v, c.id) || changed; }
        }
        if (!changed) break;
      }
      return { val, clash, why };
    };
    const snap = (cap, val, hot = [], extra = {}) => steps.push(Object.assign({ caption: cap,
      nodes: Object.fromEntries(P.scene.nodes.map(n => [n.id, { state: hot.includes(n.id) ? "current" : n.id in P.observed ? "open" : "plain", label: ids.includes(n.id) ? n.label : val && n.id in val ? `${n.id}=${val[n.id]}` : n.id }])) }, extra));
    const all = new Set(ids);
    const r0 = propagate(all);
    snap(`Assume every component works and propagate: predicted ${r0.clash ? `${r0.clash.w} = ${r0.clash.got} by ${r0.clash.by}, but ${r0.clash.w} = ${r0.clash.have}` : "no contradiction"}`, r0.val, r0.clash ? [r0.clash.w, r0.clash.by] : []);
    // enumerate subsets: inconsistent ones; keep the minimal ones (conflicts)
    const subsets = []; for (let m = 1; m < 1 << ids.length; m++) subsets.push(ids.filter((_, i) => m & (1 << i)));
    subsets.sort((a, b) => a.length - b.length);
    const conflicts = [];
    for (const s of subsets) {
      if (conflicts.some(c => c.every(x => s.includes(x)))) continue;
      const r = propagate(new Set(s));
      if (r.clash) { conflicts.push(s); snap(`Conflict found: assuming only {${s.join(", ")}} work already contradicts the observations (${r.clash.w} = ${r.clash.got} vs ${r.clash.have})`, r.val, s.concat([r.clash.w]),
        { table: { title: "minimal conflicts", columns: ["#", "components"], rows: conflicts.map((c, i) => [i + 1, "{" + c.join(", ") + "}"]) } }); }
    }
    // minimal hitting sets
    const diags = [];
    for (const s of subsets) { if (diags.some(d => d.every(x => s.includes(x)))) continue; if (conflicts.every(c => c.some(x => s.includes(x)))) diags.push(s); }
    const consistent = diags.filter(d => !propagate(new Set(ids.filter(x => !d.includes(x)))).clash);
    snap(`Minimal diagnoses (each hits every conflict): ${diags.map(d => "{" + d.join(", ") + "}").join("  ")}`, null, diags.length ? diags[0] : [],
      { table: { title: "result", columns: ["conflicts", "diagnoses"], rows: Array.from({ length: Math.max(conflicts.length, diags.length) }, (_, i) => [conflicts[i] ? "{" + conflicts[i].join(", ") + "}" : "", diags[i] ? "{" + diags[i].join(", ") + "}" + (consistent.includes(diags[i]) ? "" : " (inconsistent)") : ""]) },
        stats: [{ label: "conflicts", value: conflicts.length }, { label: "diagnoses", value: diags.length, state: "ok" }] });
    return { steps, result: { conflicts, diagnoses: diags } };
  },
});
