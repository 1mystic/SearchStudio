/* The Rete algorithm: compile rules into a network of alpha (single-pattern) and beta (join) memories, then push facts through it. */
Studio.register({
  id: "rules-rete",
  name: "Rete algorithm",
  family: "Rule-based systems",
  week: 10,
  problem: "rules",
  order: 20,
  summary: "Compile the conditions into a network. Alpha nodes test one pattern and remember the facts that pass; beta (join) nodes combine partial matches with consistent variable bindings; terminal nodes feed the conflict set. A new fact only travels the paths it affects, so nothing is re-matched.",
  pseudocode: `compile: one alpha memory per distinct pattern;
         for each rule a chain of join nodes (shared when rules start with the same patterns) ending in a terminal
add fact w:
    for each alpha memory whose pattern matches w: store w, then
        right-activate its join nodes: combine w with each token in the left memory whose bindings agree
        each new token goes to the next join node, or to the terminal → add the instantiation to the conflict set
fire instantiations (rule order); each new fact is added the same way`,
  complexity: "Matching cost proportional to the change in WM, not to its size; memory for all partial matches",
  learn: {
    "intro": "Most cycles of a rule system change only a few facts, yet naive matching re-checks every rule against everything. The Rete algorithm compiles the rules into a network that remembers partial matches, so each new fact is matched only where it matters.",
    "definition": "Alpha nodes test single patterns and store matching facts. Beta (join) nodes combine a stored partial match (token) from the left with a fact from the right when their variable bindings agree, and pass the result on. Terminal nodes add complete matches to the conflict set. Rules that share leading patterns share nodes.",
    "steps": [
      [
        "compile the rules",
        "One alpha memory per distinct pattern; a chain of joins per rule, shared where prefixes coincide."
      ],
      [
        "add a fact",
        "It enters the alpha memories it matches."
      ],
      [
        "join",
        "Combine with stored tokens that agree on shared variables."
      ],
      [
        "terminal",
        "A complete token is a rule instantiation."
      ]
    ],
    "formulas": [
      {
        "f": "work per new fact ∝ affected tokens, not |rules| × |WM|",
        "read": "incremental matching",
        "why": "Stored partial matches mean old facts are never matched again."
      }
    ],
    "why": "Trades memory (all partial matches) for speed, which made large production systems practical.",
    "traps": [
      "Joins compare bindings of shared variables only.",
      "Node sharing comes from identical condition prefixes."
    ],
    "props": {
      "complete": "same matches as naive matching",
      "optimal": "n/a",
      "time": "proportional to change",
      "space": "all partial matches"
    }
  },
  check: P => (P.rulesP.some(r => r.conds.some(c => c.neg)) ? "This Rete tracer handles positive conditions only; remove 'not' conditions or use Forward chaining." : null),
  params: [],
  run(P) {
    const L = Studio.rulesLib, steps = [];
    const key = pat => pat.map(t => (t.startsWith("?") ? "?" : t)).join(" ");
    // alpha memories (shared by identical patterns up to variable names)
    const alpha = [], alphaOf = {};
    P.rulesP.forEach(r => r.conds.forEach(c => { const k = key(c.pat); if (!(k in alphaOf)) { alphaOf[k] = alpha.length; alpha.push({ id: "α" + (alpha.length + 1), pat: c.pat, k, mem: [] }); } }));
    // beta joins, shared prefixes
    const beta = [], betaOf = {};
    const terms = P.rulesP.map(r => {
      let prev = null, prefix = "";
      r.conds.forEach((c, i) => { prefix += "|" + c.pat.join(" "); if (i === 0) return; if (!(prefix in betaOf)) { betaOf[prefix] = beta.length; beta.push({ id: "β" + (beta.length + 1), left: prev, right: alphaOf[key(c.pat)], conds: r.conds.slice(0, i + 1), mem: [] }); } prev = betaOf[prefix]; });
      return { id: r.name, rule: r, from: r.conds.length === 1 ? { alpha: alphaOf[key(r.conds[0].pat)] } : { beta: prev } };
    });
    // scene: alpha row, beta row, terminals row
    const nodes = [], edges = [];
    alpha.forEach((a, i) => nodes.push({ id: a.id, x: (i + 0.5) / alpha.length, y: 0, shape: "box", label: a.id, sub: L.show(a.pat) }));
    beta.forEach((b, i) => nodes.push({ id: b.id, x: (i + 0.5) / Math.max(1, beta.length), y: 0.5, shape: "box", label: b.id }));
    terms.forEach((t, i) => nodes.push({ id: t.id, x: (i + 0.5) / terms.length, y: 1, label: t.id }));
    beta.forEach(b => { edges.push({ u: b.left === null ? alpha[alphaOf[key(b.conds[0].pat)]].id : beta[b.left].id, v: b.id, directed: true }); edges.push({ u: alpha[b.right].id, v: b.id, directed: true }); });
    terms.forEach(t => edges.push({ u: t.from.alpha !== undefined ? alpha[t.from.alpha].id : beta[t.from.beta].id, v: t.id, directed: true }));
    const scene = { nodes, edges, aspect: 0.62, r: 17, pad: 50 };
    const conflict = [];
    const memTable = () => ({ title: "memories", columns: ["node", "contents"], rows: alpha.map(a => [a.id + " " + L.show(a.pat), a.mem.map(L.show).join(" ") || "–"]).concat(beta.map(b => [b.id, b.mem.map(t => Object.entries(t.b).map(([k, v]) => k.slice(1) + "=" + v).join(",")).join(" | ") || "–"])) });
    const snap = (cap, hot = []) => steps.push({ caption: cap, scene, nodes: Object.fromEntries(nodes.map(n => [n.id, { state: hot.includes(n.id) ? "open" : "plain", badge: n.id.startsWith("α") ? alpha.find(a => a.id === n.id).mem.length : n.id.startsWith("β") ? beta.find(b => b.id === n.id).mem.length : undefined }])),
      table: memTable(), lists: [{ label: "CONFLICT", items: conflict.map(c => ({ text: `${c.r.name} ${Object.entries(c.b).map(([k, v]) => k + "=" + v).join(" ")}`, state: c.fired ? "closed" : "open" })) }] });
    snap(`Compiled ${P.rulesP.length} rules into ${alpha.length} alpha memories, ${beta.length} join nodes and ${terms.length} terminals (shared patterns appear once)`);
    const toTerminal = (from, tok, hot) => terms.forEach(t => { if ((from.alpha !== undefined && t.from.alpha === from.alpha) || (from.beta !== undefined && t.from.beta === from.beta)) { if (!conflict.some(c => c.r === t.rule && JSON.stringify(c.b) === JSON.stringify(tok.b))) { conflict.push({ r: t.rule, b: tok.b, fired: false }); hot.push(t.id); } } });
    const leftActivate = (bi, tok, hot) => {
      const b = beta[bi]; const c = b.conds[b.conds.length - 1];
      alpha[b.right].mem.forEach(f => { const nb = L.match(c.pat, f, tok.b); if (nb) { const nt = { b: nb }; b.mem.push(nt); hot.push(b.id); propagate({ beta: bi }, nt, hot); } });
    };
    const propagate = (from, tok, hot) => {
      beta.forEach((b, bi) => { if (from.beta !== undefined && b.left === from.beta) leftActivate(bi, tok, hot); });
      toTerminal(from, tok, hot);
    };
    const addFact = (f, why) => {
      const hot = [];
      alpha.forEach((a, ai) => {
        const b0 = L.match(a.pat, f, {}); if (!b0) return;
        a.mem.push(f); hot.push(a.id);
        // as the first condition of rules / joins
        P.rulesP.forEach(r => { if (key(r.conds[0].pat) === a.k) { const bb = L.match(r.conds[0].pat, f, {}); if (!bb) return;
          if (r.conds.length === 1) toTerminal({ alpha: ai }, { b: bb }, hot);
          else beta.forEach((b, bi) => { if (b.left === null && key(b.conds[0].pat) === a.k && b.conds[0].pat.join(" ") === r.conds[0].pat.join(" ")) { if (!b._seen) b._seen = new Set(); const sig = JSON.stringify(bb); if (!b._seen.has(sig)) { b._seen.add(sig); leftActivate(bi, { b: bb }, hot); } } }); } });
        // as a right input of join nodes
        beta.forEach((b, bi) => { if (b.right !== ai) return; const c = b.conds[b.conds.length - 1]; const lefts = b.left === null ? alpha[alphaOf[key(b.conds[0].pat)]].mem.filter(x => x !== f || b.conds.length > 1).map(x => ({ b: L.match(b.conds[0].pat, x, {}) })).filter(t => t.b) : beta[b.left].mem;
          lefts.forEach(t => { const nb = L.match(c.pat, f, t.b); if (nb && !b.mem.some(m => JSON.stringify(m.b) === JSON.stringify(nb))) { const nt = { b: nb }; b.mem.push(nt); hot.push(b.id); propagate({ beta: bi }, nt, hot); } }); });
      });
      snap(`${why} ${L.show(f)}: ${hot.length ? "activates " + [...new Set(hot)].join(", ") : "matches no pattern"}`, [...new Set(hot)]);
    };
    const WM = [];
    P.facts0.forEach(f => { WM.push(f.join(" ")); addFact(f, "Add fact"); });
    for (let k = 0; k < 60; k++) {
      const c = conflict.find(x => !x.fired); if (!c) break;
      c.fired = true;
      const adds = c.r.acts.filter(a => a.op === "add").map(a => L.subst(a.pat, c.b)).filter(f => !WM.includes(f.join(" ")));
      snap(`Fire ${c.r.name} ${Object.entries(c.b).map(([q, v]) => q + "=" + v).join(" ")}: ${adds.length ? "adds " + adds.map(L.show).join(", ") : "nothing new"}`, [c.r.name]);
      adds.forEach(f => { WM.push(f.join(" ")); addFact(f, "New fact"); });
    }
    snap(`Quiescent: no unfired instantiations. ${WM.length} facts, every match found incrementally.`);
    return { steps, result: { facts: WM.map(f => "(" + f + ")") } };
  },
});
