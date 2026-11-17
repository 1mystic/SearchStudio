/* The Rete algorithm: compile rules into a network of alpha (single-pattern) and beta (join) memories, then push facts through it. */
Studio.register({
  id: "rules-rete",
  name: "Rete algorithm",
  family: "Rule-based systems",
  week: 10,
  problem: "rules",
  order: 20,
  defaultExample: "rules-negation",
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
    "definition": "Alpha nodes test single patterns and store matching facts. Beta (join) nodes combine a stored partial match (token) from the left with a fact from the right when their variable bindings agree, and pass the result on. A negative (NOT) node passes a token on only while no fact matches the negated pattern with consistent bindings; when such a fact arrives later it blocks the token and withdraws everything built from it, and when that fact is removed the token is released again. Terminal nodes add complete matches to the conflict set. Rules that share leading patterns share nodes.",
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
      "Node sharing comes from identical condition prefixes.",
      "A negated condition makes the system non-monotonic: a match can enter the conflict set and later be withdrawn when a blocking fact arrives. Try example rules-negation: R2 opus is withdrawn after R1 adds (penguin opus).",
      "Rete returns the same facts as forward chaining, including with NOT conditions and remove actions; here it fires by rule order, then recency."
    ],
    "props": {
      "complete": "same matches as naive matching",
      "optimal": "n/a",
      "time": "proportional to change",
      "space": "all partial matches"
    }
  },
  params: [],
  run(P) {
    const L = Studio.rulesLib, steps = [];
    const key = pat => pat.map(t => (t.startsWith("?") ? "?" : t)).join(" ");
    const fk = f => f.join(" ");
    // ---- compile. Alpha memories: one per distinct pattern (up to variable names).
    const alpha = [], alphaOf = {};
    P.rulesP.forEach(r => r.conds.forEach(c => { const k = key(c.pat); if (!(k in alphaOf)) { alphaOf[k] = alpha.length; alpha.push({ id: "α" + (alpha.length + 1), pat: c.pat, k, mem: [] }); } }));
    // Join (positive) and negative nodes, shared by identical condition prefixes. A "top" node holds the matches of a first positive condition.
    const root = { kind: "root", mem: [{ b: {}, facts: [] }], children: [], terms: [], shown: false };
    const nodes = [], byPrefix = {}; let nb = 0;
    const ruleLast = P.rulesP.map(r => {
      let prev = root, prefix = "";
      r.conds.forEach((c, i) => {
        prefix += "|" + (c.neg ? "not " : "") + c.pat.join(" ");
        if (!(prefix in byPrefix)) {
          const kind = c.neg ? "neg" : i === 0 ? "top" : "join";
          const nd = { kind, a: alphaOf[key(c.pat)], pat: c.pat, left: prev, mem: [], inn: [], children: [], terms: [], shown: kind !== "top", rules: new Set() };
          if (nd.shown) nd.id = "β" + ++nb;
          byPrefix[prefix] = nd; nodes.push(nd); prev.children.push(nd);
        }
        prev = byPrefix[prefix];
      });
      return prev;
    });
    ruleLast.forEach((nd, i) => nd.terms.push(P.rulesP[i]));
    const disp = nd => (nd.kind === "top" ? alpha[nd.a].id : nd.id); // a top node is drawn as its alpha memory
    // ---- scene: alpha row, beta row, terminals row
    const sc = [], edges = [];
    alpha.forEach((a, i) => sc.push({ id: a.id, x: (i + 0.5) / alpha.length, y: 0, shape: "box", label: a.id, sub: L.show(a.pat) }));
    const shownB = nodes.filter(n => n.shown);
    shownB.forEach((b, i) => sc.push({ id: b.id, x: (i + 0.5) / Math.max(1, shownB.length), y: 0.5, shape: "box", label: b.id, sub: b.kind === "neg" ? "NOT" : "" }));
    P.rulesP.forEach((r, i) => sc.push({ id: r.name, x: (i + 0.5) / P.rulesP.length, y: 1, label: r.name }));
    shownB.forEach(b => { if (b.left.kind !== "root") edges.push({ u: disp(b.left), v: b.id, directed: true }); edges.push({ u: alpha[b.a].id, v: b.id, directed: true, label: b.kind === "neg" ? "not" : undefined }); });
    ruleLast.forEach((nd, i) => edges.push({ u: disp(nd), v: P.rulesP[i].name, directed: true }));
    const scene = { nodes: sc, edges, aspect: 0.62, r: 17, pad: 50 };
    // ---- run-time state
    const WM = new Map(); let clock = 0; // fact text -> timestamp
    const conflict = [], firedKeys = new Set(), firing = [];
    const bkey = (r, b) => r.name + JSON.stringify(Object.entries(b).sort());
    let hot = [];
    const memTable = () => ({ title: "memories", columns: ["node", "contents"], rows: alpha.map(a => [a.id + " " + L.show(a.pat), a.mem.map(L.show).join(" ") || "–"]).concat(shownB.map(b => [b.id + (b.kind === "neg" ? " NOT " + L.show(b.pat) : ""),
      b.kind === "neg" ? (b.inn.map(e => Object.entries(e.tok.b).map(([k, v]) => k.slice(1) + "=" + v).join(",") + (e.blockers.size ? " ✗blocked by " + [...e.blockers].join("; ") : " ✓")).join(" | ") || "–") : b.mem.map(t => Object.entries(t.b).map(([k, v]) => k.slice(1) + "=" + v).join(",")).join(" | ") || "–"])) });
    const showInst = c => `${c.r.name} ${Object.entries(c.b).map(([k, v]) => k + "=" + v).join(" ")}`.trim();
    const snap = (cap, h) => steps.push({ caption: cap, scene, nodes: Object.fromEntries(sc.map(n => [n.id, { state: (h || []).includes(n.id) ? "open" : "plain", badge: n.id.startsWith("α") ? alpha.find(a => a.id === n.id).mem.length : n.id.startsWith("β") ? shownB.find(b => b.id === n.id)[ shownB.find(b => b.id === n.id).kind === "neg" ? "inn" : "mem"].length : undefined }])),
      table: memTable(), lists: [{ label: "WM (time tag: fact)", items: [...WM.entries()].sort((a, b) => a[1] - b[1]).map(([f, t]) => ({ text: `${t}: (${f})`, state: "plain" })) }, { label: "CONFLICT", items: conflict.map(c => ({ text: showInst(c), state: "open" })) }, { label: "FIRED", items: firing.map(x => ({ text: x, state: "closed" })) }] });
    snap(`Compiled ${P.rulesP.length} rules into ${alpha.length} alpha memories, ${shownB.filter(b => b.kind === "join").length} join nodes, ${shownB.filter(b => b.kind === "neg").length} negative node(s) and ${P.rulesP.length} terminals (shared patterns appear once)`);
    // ---- propagation
    const toConflict = (nd, tok) => nd.terms.forEach(r => { const k = bkey(r, tok.b); if (firedKeys.has(k) || conflict.some(c => c.key === k)) return; conflict.push({ r, b: tok.b, facts: tok.facts, key: k }); hot.push(r.name); });
    const emit = (nd, tok) => { hot.push(disp(nd)); nd.children.forEach(ch => leftAdd(ch, tok)); toConflict(nd, tok); };
    const leftAdd = (nd, tok) => {
      if (nd.kind === "join" || nd.kind === "top") {
        alpha[nd.a].mem.forEach(f => { const b2 = L.match(nd.pat, f, tok.b); if (b2) { const t2 = { b: b2, facts: tok.facts.concat([fk(f)]) }; nd.mem.push(t2); emit(nd, t2); } });
      } else { // negative node: pass the token only while no fact matches the negated pattern
        const e = { tok, blockers: new Set(alpha[nd.a].mem.filter(f => L.match(nd.pat, f, tok.b)).map(fk)) };
        nd.inn.push(e); hot.push(nd.id);
        if (!e.blockers.size) { e.out = { b: tok.b, facts: tok.facts }; nd.mem.push(e.out); emit(nd, e.out); }
      }
    };
    const rightAdd = (nd, f) => {
      if (nd.kind === "top") { const b0 = L.match(nd.pat, f, {}); if (b0) { const t = { b: b0, facts: [fk(f)] }; nd.mem.push(t); emit(nd, t); } }
      else if (nd.kind === "join") nd.left.mem.slice().forEach(tok => { const b2 = L.match(nd.pat, f, tok.b); if (b2) { const t2 = { b: b2, facts: tok.facts.concat([fk(f)]) }; nd.mem.push(t2); emit(nd, t2); } });
      else nd.inn.slice().forEach(e => { if (!L.match(nd.pat, f, e.tok.b)) return; hot.push(nd.id); if (!e.blockers.size && e.out) drop(nd, e.out); e.blockers.add(fk(f)); });
    };
    // Remove a token that a negative node just blocked: it and everything built from it disappears downstream.
    const drop = (nd, tok) => {
      const pre = tok.facts, has = a => pre.every((x, i) => a[i] === x), below = [], walk = n => n.children.forEach(ch => { below.push(ch); walk(ch); }); walk(nd);
      nd.mem = nd.mem.filter(t => t !== tok);
      below.forEach(d => { d.mem = d.mem.filter(t => !has(t.facts)); d.inn = d.inn.filter(e => !has(e.tok.facts)); });
      const rules = new Set([nd].concat(below).flatMap(d => d.terms));
      for (let i = conflict.length - 1; i >= 0; i--) if (rules.has(conflict[i].r) && has(conflict[i].facts)) { hot.push(conflict[i].r.name); conflict.splice(i, 1); }
    };
    const addFact = (f, why) => {
      hot = []; WM.set(fk(f), ++clock); const before = conflict.slice();
      alpha.forEach((a, ai) => { if (!L.match(a.pat, f, {})) return; a.mem.push(f); hot.push(a.id); nodes.forEach(nd => { if (nd.a === ai) rightAdd(nd, f); }); });
      const gone = before.filter(c => !conflict.includes(c));
      snap(`${why} ${L.show(f)}: ${hot.length ? "activates " + [...new Set(hot)].join(", ") : "matches no pattern"}${gone.length ? `. It matches the negated pattern of a NOT node, so ${gone.map(showInst).join(", ")} ${gone.length > 1 ? "are" : "is"} withdrawn from the conflict set (the negated condition no longer holds)` : ""}`, [...new Set(hot)]);
    };
    const removeFact = (f, why) => {
      hot = []; const k = fk(f); WM.delete(k);
      alpha.forEach(a => { if (a.mem.some(x => fk(x) === k)) { a.mem = a.mem.filter(x => fk(x) !== k); hot.push(a.id); } });
      for (let i = conflict.length - 1; i >= 0; i--) if (conflict[i].facts.includes(k)) { hot.push(conflict[i].r.name); conflict.splice(i, 1); }
      nodes.forEach(nd => { nd.mem = nd.mem.filter(t => !t.facts.includes(k)); nd.inn = nd.inn.filter(e => !e.tok.facts.includes(k)); });
      const unblocked = [];
      nodes.forEach(nd => { if (nd.kind === "neg") nd.inn.forEach(e => { if (e.blockers.delete(k) && !e.blockers.size) unblocked.push([nd, e]); }); });
      unblocked.forEach(([nd, e]) => { hot.push(nd.id); e.out = { b: e.tok.b, facts: e.tok.facts }; nd.mem.push(e.out); emit(nd, e.out); });
      snap(`${why} ${L.show(f)}: its tokens are removed${unblocked.length ? " and the negative node lets blocked matches through again" : ""}`, [...new Set(hot)]);
    };
    P.facts0.forEach(f => { if (!WM.has(fk(f))) addFact(f, "Add fact"); });
    for (let step = 0; step < 80 && conflict.length; step++) {
      const rank = c => [c.r.order, -Math.max(0, ...c.facts.map(x => WM.get(x) || 0))];
      const c = conflict.slice().sort((x, y) => rank(x)[0] - rank(y)[0] || rank(x)[1] - rank(y)[1])[0];
      conflict.splice(conflict.indexOf(c), 1); firedKeys.add(c.key); firing.push(showInst(c));
      const adds = c.r.acts.filter(a => a.op === "add").map(a => L.subst(a.pat, c.b)).filter(f => !WM.has(fk(f)));
      const dels = c.r.acts.filter(a => a.op === "remove").map(a => L.subst(a.pat, c.b)).filter(f => WM.has(fk(f)));
      snap(`Fire ${showInst(c)} (the conflict set held ${conflict.length + 1}; rule order decides, then recency: this match uses time tag${c.facts.length > 1 ? "s" : ""} ${c.facts.map(x => WM.get(x)).join(",") || "none"}, newest ${Math.max(0, ...c.facts.map(x => WM.get(x) || 0))}): ${adds.length ? "adds " + adds.map(L.show).join(", ") : ""}${adds.length && dels.length ? "; " : ""}${dels.length ? "removes " + dels.map(L.show).join(", ") : ""}${adds.length || dels.length ? "" : "nothing new"}`, [c.r.name]);
      c.r.acts.forEach(a => { const f = L.subst(a.pat, c.b); if (a.op === "add" && !WM.has(fk(f))) addFact(f, "New fact"); else if (a.op === "remove" && WM.has(fk(f))) removeFact(f, "Retract"); });
    }
    snap(`Quiescent: no unfired instantiations. ${WM.size} facts; every match, and every blocked match, was found incrementally. Firing order: ${firing.join(" → ") || "nothing fired"}.`);
    return { steps, result: { facts: [...WM.keys()].map(f => "(" + f + ")"), order: firing } };
  },
});
