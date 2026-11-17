/* Backward chaining: prove a query goal by sub-goaling on rule antecedents; the proof is an AND–OR goal tree. */
Studio.register({
  id: "rules-backward-chaining",
  name: "Backward chaining (goal tree)",
  family: "Problem decomposition",
  week: 9,
  problem: "rules",
  order: 20,
  defaultExample: "rules-backtrack",
  summary: "Goal-directed reasoning over a rule base: to prove a goal, either find it among the facts or find a rule whose THEN part matches it and prove every IF condition of that rule as a sub-goal (AND). Different rules for the same goal are alternatives (OR). The search is drawn as an AND–OR goal tree.",
  pseudocode: `Prove(goal, bindings):
    for each fact f that unifies with goal: succeed (f is a solved leaf)
    for each rule R whose consequent unifies with goal:        # OR over rules
        prove every condition of R in turn, carrying the bindings   # AND over conditions
        if all succeed: goal is proved by R
    if nothing works: goal fails (backtrack to the last choice)
    (a goal identical to one of its own ancestors fails: it would loop)`,
  complexity: "Depth-first and goal-directed: it touches only the rules relevant to the query, but can repeat sub-goals and loops without the ancestor check",
  learn: {
    "intro": "Forward chaining starts from the facts and derives everything it can. Backward chaining starts from a query (the goal) and works the other way: which rule could conclude this, and what would I then have to show? Only rules relevant to the goal are ever examined, which is why it suits diagnosis and question answering.",
    "definition": "To prove a goal G: (1) if some fact unifies with G, G is solved; (2) otherwise, for each rule whose THEN part unifies with G, make each IF condition a sub-goal. The conditions of one rule form an AND connector (all must be proved); the different rules that could conclude G are OR alternatives. Variables are bound by unification and the bindings are carried from one condition to the next. This is the same AND–OR structure as in problem decomposition.",
    "steps": [
      [
        "goal: look for a matching fact",
        "A fact that unifies with the goal is a solved leaf."
      ],
      [
        "otherwise find rules whose consequent matches",
        "Each such rule is an alternative (OR)."
      ],
      [
        "sub-goal on every antecedent of the rule",
        "All conditions must be proved (AND), left to right, sharing variable bindings."
      ],
      [
        "backtrack on failure",
        "If a goal cannot be proved, undo the last choice and try the next fact or rule."
      ]
    ],
    "formulas": [
      {
        "f": "solved(G) = fact(G) ∨ ⋁ over rules R concluding G of ⋀ solved(c), c in IF(R)",
        "read": "a goal is solved by a fact, or by some rule all of whose conditions are solved",
        "why": "OR across the alternative rules and AND across the conditions of one rule is exactly an AND–OR graph."
      }
    ],
    "why": "Every goal it proves is also derived by forward chaining (both are sound), but it only does the work needed for the query. An ancestor check is needed because rule bases can be recursive.",
    "traps": [
      "The first matching fact or rule is not always the right one: bindings may make a later condition fail, and then it must backtrack. Try example rules-backtrack: rule F1 fails on (heavy tweety), the grey branch is undone, and F2 proves the goal.",
      "Rule variables are renamed apart for each use, so ?x in two different uses are different variables.",
      "Without the ancestor check a recursive rule (ancestor defined through ancestor) can loop forever.",
      "This stepper proves the first answer found; a query with variables may have several answers."
    ],
    "props": {
      "complete": "no for recursive rule bases (depth-first), yes on acyclic ones",
      "optimal": "n/a",
      "time": "exponential in the worst case",
      "space": "the goal tree (depth × branching)"
    }
  },
  params: [
    { key: "goal", label: "Query goal", type: "text", default: "", help: "e.g. (is cheetah rex) or (grandfather tom ?who). Empty uses the problem's goal, or the head of the last rule." },
    { key: "depth", label: "Depth limit", type: "int", default: 10, min: 2, max: 20 },
  ],
  run(P, { goal, depth }) {
    const L = Studio.rulesLib, steps = [];
    const LIMIT_NODES = 150;
    const isV = t => t.charAt(0) === "?";
    const walk = (t, b) => { while (isV(t) && t in b) t = b[t]; return t; };
    const unify = (x, y, b) => {
      if (x.length !== y.length) return null;
      const nb = Object.assign({}, b);
      for (let i = 0; i < x.length; i++) {
        const p = walk(x[i], nb), q = walk(y[i], nb);
        if (p === q) continue;
        if (isV(p)) nb[p] = q; else if (isV(q)) nb[q] = p; else return null;
      }
      return nb;
    };
    const txt = (pat, b) => "(" + pat.map(t => walk(t, b).replace(/_\d+$/, "")).join(" ") + ")";
    let rn = 0;
    const rename = (pat, n) => pat.map(t => (isV(t) ? t + "_" + n : t));
    let G = P.goal0;
    if (goal && String(goal).trim()) G = L.parse(goal);
    if (!G) { const last = P.rulesP[P.rulesP.length - 1], a = last && last.acts.find(x => x.op === "add"); G = a ? a.pat : null; }
    if (!G) throw new Error("This rule base has no goal to prove");

    // ---- pass 1: solve depth-first, recording the tree and one event per step
    const nodes = [], st = {}, lab = {}, via = {}, ev = [], rows = [];
    let nid = 0, factsUsed = 0, tries = 0;
    const snapshot = (cap, cur, row) => {
      if (row) rows.push([rows.length + 1].concat(row));
      ev.push({ cap, cur, st: Object.assign({}, st), lab: Object.assign({}, lab), facts: factsUsed, rows: rows.length });
    };
    const mk = (parent, label, group, text, k) => {
      if (nodes.length >= LIMIT_NODES) return null;
      const id = "g" + ++nid;
      nodes.push({ id, parent, label, group, text, k }); st[id] = "open"; lab[id] = text;
      return id;
    };
    const solve = (pat, b, parent, label, group, anc, d, k) => {
      const text = txt(pat, b);
      const g = mk(parent, label, group, text, "goal");
      if (!g) { snapshot(`Node limit reached: giving up on ${text}`, null); return false; }
      snapshot(`New goal ${text}: look for a fact that matches it, then for rules whose THEN part matches it`, g);
      if (d > depth) { st[g] = "closed"; snapshot(`Depth limit ${depth} reached at ${text}: treat as failed`, g); return false; }
      if (anc.includes(text)) { st[g] = "closed"; snapshot(`${text} is already being proved above it in the tree, so proving it again would loop: fail`, g); return false; }
      const here = anc.concat([text]);
      for (const f of P.facts0) {
        const u = unify(pat, f, b);
        if (!u) continue;
        const leaf = mk(g, "fact", null, L.show(f).slice(1, -1), "fact");
        if (!leaf) return false;
        st[leaf] = "path"; st[g] = "path"; lab[g] = txt(pat, u); factsUsed++; via[g] = "fact";
        snapshot(`Fact ${L.show(f)} matches ${text}: ${lab[g]} is solved (a leaf of the goal tree)`, g, [text, "fact " + L.show(f), "solved"]);
        if (k(u)) return true;
        st[leaf] = "closed"; st[g] = "open"; lab[g] = text; factsUsed--; delete via[g];
        snapshot(`Backtrack: the rest of the proof failed with that answer for ${text}; try the next fact or rule`, g);
      }
      for (const r of P.rulesP) {
        for (const a of r.acts) {
          if (a.op !== "add") continue;
          const n = ++rn;
          const u0 = unify(pat, rename(a.pat, n), b);
          if (!u0) continue;
          const conds = r.conds.map(c => ({ neg: c.neg, pat: rename(c.pat, n) }));
          const grp = r.name + "." + (++tries);
          snapshot(`Rule ${r.name}: its THEN part matches ${text}. To use it, prove all ${conds.length} condition${conds.length > 1 ? "s" : ""} (AND): ${conds.map(c => (c.neg ? "not " : "") + txt(c.pat, u0)).join(" ∧ ")}`, g, [text, "try " + r.name, ""]);
          const all = (i, bb) => {
            if (i === conds.length) {
              st[g] = "path"; lab[g] = txt(pat, bb); via[g] = r.name;
              snapshot(`All conditions of ${r.name} are proved, so ${lab[g]} is solved`, g, [text, "by " + r.name, "solved"]);
              if (k(bb)) return true;
              st[g] = "open"; lab[g] = text; delete via[g];
              snapshot(`Backtrack: the rest of the proof failed using ${r.name} for ${text}; try the next alternative`, g);
              return false;
            }
            const c = conds[i];
            if (c.neg) {
              const nn = mk(g, i === 0 ? r.name : "", grp, "not " + txt(c.pat, bb), "not");
              if (!nn) return false;
              snapshot(`Condition ${i + 1} of ${r.name} is negated: it holds only if ${txt(c.pat, bb)} cannot be proved (negation as failure)`, nn);
              const proved = solve(c.pat, bb, nn, "", null, here, d + 1, () => true);
              if (proved) { st[nn] = "closed"; snapshot(`${txt(c.pat, bb)} can be proved, so the negated condition fails`, nn); return false; }
              st[nn] = "path"; snapshot(`${txt(c.pat, bb)} cannot be proved, so "not" holds`, nn);
              if (all(i + 1, bb)) return true;
              st[nn] = "closed"; return false;
            }
            return solve(c.pat, bb, g, i === 0 ? r.name : "", grp, here, d + 1, bb2 => all(i + 1, bb2));
          };
          if (all(0, u0)) return true;
        }
      }
      st[g] = "closed";
      snapshot(`No fact and no rule can prove ${text}: it fails, so the choice above it is undone`, g, [text, "no fact or rule", "failed"]);
      return false;
    };
    const proved = solve(G, {}, null, "", null, [], 0, () => true);
    const rootId = "g1";
    const answer = proved ? lab[rootId] : null;
    snapshot(proved ? `Proved: ${answer}. The green nodes form the solution graph; the grey ones were tried and abandoned.` : `${txt(G, {})} cannot be proved from these facts and rules: every fact and rule that could conclude it was tried and failed.`, null);

    // ---- pass 2: lay the finished tree out once, then replay the events as steps
    const kids = {}; nodes.forEach(n => { kids[n.id] = kids[n.id] || []; if (n.parent) kids[n.parent].push(n.id); });
    const depthOf = {}; nodes.forEach(n => (depthOf[n.id] = n.parent ? depthOf[n.parent] + 1 : 0));
    const maxD = Math.max(1, ...nodes.map(n => depthOf[n.id]));
    const pos = Studio.treeLayout(rootId, id => kids[id] || []);
    const scene = { nodes: nodes.map(n => ({ id: n.id, x: pos[n.id][0], y: pos[n.id][1], shape: n.k === "fact" ? "leaf" : "box", w: Math.max(2.4, n.text.length * 0.5), label: n.text, sub: "" })),
      edges: nodes.filter(n => n.parent).map(n => ({ u: n.parent, v: n.id, label: n.label || undefined, group: n.group || undefined, directed: true })), aspect: Math.min(0.95, 0.3 + maxD * 0.16), r: 12, pad: 44 };
    ev.forEach(e => {
      const nd = {};
      nodes.forEach(n => { const s = e.st[n.id]; nd[n.id] = s ? { state: e.cur === n.id ? "current" : s, label: e.lab[n.id] } : { state: "plain" }; });
      const edges = nodes.filter(n => n.parent).map(n => { const s = e.st[n.id]; return { u: n.parent, v: n.id, label: n.label || undefined, group: n.group || undefined, directed: true, state: !s ? "faint" : s === "path" ? "path" : s === "closed" ? "rejected" : "tree" }; });
      const shown = rows.slice(0, e.rows).slice(-12);
      steps.push({ caption: e.cap, scene, nodes: nd, edges,
        table: { title: "proof trail", columns: ["#", "goal", "how", "result"], rows: shown, rowStates: shown.map(r => (r[3] === "solved" ? "ok" : r[3] === "failed" ? "bad" : "")) },
        stats: [{ label: "goal nodes", value: Object.keys(e.st).length }, { label: "facts used", value: e.facts }] });
    });
    const usedRules = [...new Set(Object.keys(via).filter(k => st[k] === "path").map(k => via[k]).filter(v => v !== "fact"))];
    return { steps, result: { proved, goal: txt(G, {}), answer, rules: proved ? usedRules : [], nodes: nodes.length } };
  },
});
