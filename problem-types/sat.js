/* Propositional satisfiability (CNF). A candidate is a bit string, one bit per variable in `vars` order
 * (bit i = 1 means vars[i] is true). h(candidate) = number of satisfied clauses, MAXIMISED; h = m means solved.
 *
 * Problem JSON : { type:"sat", name, vars:["a","b","c","d"], clauses:[["-b","-c"],["-b","d"],…], start?:"0000" }
 * Text format  : first line  a b c d      then one clause per line, e.g.  -b -c      optional line  start: 0000
 *
 * ---------------------------------------------------------------- reusable API (for every SAT algorithm)
 * Studio.prepare(problem) returns P with  (all bit strings are plain strings such as "1000"; index 0 = leftmost = first variable)
 *   P.vars, P.n, P.m, P.clauses (original strings), P.lits (parsed [{v, neg}]), P.start (default all zeros), P.ids (= vars)
 *   P.h(bits)            number of satisfied clauses
 *   P.satisfied(bits)    array of m booleans, one per clause
 *   P.solved(bits)       h(bits) === m
 *   P.flip(bits, i)      bits with bit i toggled;   P.flipSet(bits, [i, j, …]) toggles several
 *   P.nbrs(bits, k)      neighbourhood of EXACTLY k flips, in lowest-bit-first (lexicographic index) order:
 *                        [{ bits, flips:[i…], move:"b,d", k, h }]   k = 1 is N1, k = 2 is the pairs, …
 *   P.nbrsUpTo(bits, k)  N1–k = N1 ∪ N2 ∪ … ∪ Nk, ordered by k then lexicographically
 *   P.scene              default drawing: the variables as a row of nodes (ids are the variable names)
 * Studio.satLib has the shared helpers:
 *   best(list, score?)           first element with the largest score (default h): ties go to the earliest = lowest bit
 *   choose(n, k), combos(n, k)   C(n,k) and the k-subsets of 0..n-1 in lexicographic order
 *   startBits(P, text)           a valid start bit string (falls back to P.start)
 *   startParam                   the shared "start" algorithm parameter
 *   clauseText(P, i)             "(¬b ∨ ¬c)";  litText(P, lit)
 *   clauseTable(P, bits)         step.table showing every clause with T/F;  unsatText(P, bits) lists the false clauses
 *   drawBits(P, bits, {flipped}) step fragment { nodes } drawing the candidate as a row of bits
 *   drawNeighbourhood(P, bits, nbrs, {chosen, cmp, states}) step fragment { scene, nodes, edges }: the centre plus its
 *                        neighbours each labelled with its h (falls back to drawBits when the graph would be too big)
 *   nbrTable(P, nbrs, cur, chosenBits, extra)  step.table listing the neighbours
 *   stats(P, bits, extra)        the usual [candidate, h] stats
 */
(function (S) {
  const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const parseLit = (s, vars) => {
    const t = String(s).trim(), neg = /^[-~!¬]/.test(t), name = neg ? t.slice(1).trim() : t;
    const v = vars.indexOf(name);
    if (v < 0) throw new Error(`Literal "${s}" uses an unknown variable (variables: ${vars.join(" ")})`);
    return { v, neg };
  };
  const combos = (n, k) => {
    const out = [], cur = [];
    const go = from => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = from; i < n; i++) { cur.push(i); go(i + 1); cur.pop(); } };
    go(0); return out;
  };
  const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
  const lib = S.satLib = {
    parseLit, combos, choose,
    best(list, score = x => x.h) { let b = null, bs = -Infinity; for (const x of list) { const s = score(x); if (s > bs) { b = x; bs = s; } } return b; },
    startBits(P, text) { const t = String(text ?? "").trim(); return /^[01]+$/.test(t) && t.length === P.n ? t : P.start; },
    startParam: { key: "start", label: "Start (bit string)", type: "text", default: P => P.start, help: "One bit per variable in order, e.g. 0000" },
    litText(P, l) { return (l.neg ? "¬" : "") + P.vars[l.v]; },
    clauseText(P, i) { return "(" + P.lits[i].map(l => lib.litText(P, l)).join(" ∨ ") + ")"; },
    unsatText(P, bits) { const s = P.satisfied(bits), u = []; s.forEach((x, i) => { if (!x) u.push(lib.clauseText(P, i)); }); return u.length ? u.join(" ") : "none"; },
    clauseTable(P, bits) {
      const sat = P.satisfied(bits);
      return { title: `h(${bits}) = ${sat.filter(Boolean).length} of ${P.m} clauses satisfied`, columns: ["#", "clause", "made true by", "value"],
        rows: P.lits.map((ls, i) => { const by = ls.filter(l => (bits[l.v] === "1") !== l.neg).map(l => lib.litText(P, l)).join(", ");
          return [i + 1, lib.clauseText(P, i), by || "–", { t: sat[i] ? "T" : "F", s: sat[i] ? "ok" : "bad" }]; }),
        rowStates: sat.map(x => (x ? "" : "bad")) };
    },
    stats(P, bits, extra = []) { const h = P.h(bits); return [{ label: "candidate", value: bits }, { label: "h", value: `${h} / ${P.m}`, state: h === P.m ? "ok" : "" }].concat(extra); },
    drawBits(P, bits, { flipped = [], state } = {}) {
      const nodes = {};
      P.vars.forEach((v, i) => { nodes[v] = { label: bits[i], sub: v, state: flipped.includes(i) ? "current" : state || (bits[i] === "1" ? "path" : "dim") }; });
      return { nodes };
    },
    /* centre + neighbours on rings (one ring per number of flips). states: bit string -> node state override. */
    drawNeighbourhood(P, bits, nbrs, { chosen = null, cmp = null, states = {}, label = true } = {}) {
      if (!nbrs.length || nbrs.length > 31) return lib.drawBits(P, bits);
      const cmpH = cmp ?? P.h(bits), K = Math.max(...nbrs.map(x => x.k));
      const small = nbrs.length <= 8, nodesS = [{ id: bits, x: 0.5, y: 0.5, label: bits, sub: "h=" + P.h(bits) }], edges = [], nodes = { [bits]: { state: "current" } };
      const byK = {}; nbrs.forEach(x => (byK[x.k] = byK[x.k] || []).push(x));
      for (const k of Object.keys(byK).map(Number).sort((a, b) => a - b)) {
        const ring = byK[k], rad = K === 1 ? 0.4 : 0.2 + 0.25 * (k - 1) / (K - 1);
        ring.forEach((x, i) => {
          const a = -Math.PI / 2 + (2 * Math.PI * (i + (k % 2) * 0.5)) / ring.length;
          nodesS.push({ id: x.bits, x: 0.5 + rad * Math.cos(a), y: 0.5 + rad * Math.sin(a), label: x.bits, sub: "h=" + x.h });
          const st = states[x.bits] || (x.bits === chosen ? "path" : x.h > cmpH ? "open" : x.h === cmpH ? "visited" : "dim");
          nodes[x.bits] = { state: st };
          edges.push({ u: bits, v: x.bits, state: x.bits === chosen ? "path" : st === "rejected" || st === "pruned" ? "rejected" : "candidate", label: label && (small || k === 1) ? x.move : undefined });
        });
      }
      return { scene: { nodes: nodesS, edges: [], aspect: 0.8, r: small ? 26 : 19, pad: 40 }, nodes, edges };
    },
    nbrTable(P, nbrs, cur, chosenBits, extra = {}) {
      const ch = extra.cols || [], rowx = extra.row || (() => []), h0 = P.h(cur);
      return { title: `neighbours of ${cur} (h = ${h0})`, columns: ["flip", "neighbour", "h", "vs " + h0].concat(ch),
        rows: nbrs.map(x => [x.move, x.bits, x.h, x.h > h0 ? { t: "better", s: "ok" } : x.h === h0 ? { t: "equal", s: "warn" } : { t: "worse", s: "bad" }].concat(rowx(x))),
        rowStates: nbrs.map(x => (x.bits === chosenBits ? "ok" : "")) };
    },
  };

  const lines = txt => txt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  S.registerType({
    type: "sat", label: "SAT problem", plural: "propositional satisfiability problems",
    validate(p) {
      if (!Array.isArray(p.vars) || !p.vars.length) throw new Error("A SAT problem needs a list of variables");
      if (p.vars.length > 20) throw new Error("Keep SAT problems to 20 variables or fewer");
      p.vars.forEach(v => { if (typeof v !== "string" || !NAME.test(v)) throw new Error(`Variable "${v}" must be a name such as a or x1`); });
      if (new Set(p.vars).size !== p.vars.length) throw new Error("Variable names must be unique");
      if (!Array.isArray(p.clauses) || !p.clauses.length) throw new Error("A SAT problem needs at least one clause");
      p.clauses.forEach(c => { if (!Array.isArray(c) || !c.length) throw new Error("Every clause needs at least one literal"); c.forEach(l => parseLit(l, p.vars)); });
      if (p.start !== undefined && !(typeof p.start === "string" && /^[01]+$/.test(p.start) && p.start.length === p.vars.length)) throw new Error(`start must be a string of ${p.vars.length} bits (0 or 1)`);
    },
    prepare(p) {
      const vars = p.vars.slice(), n = vars.length, lits = p.clauses.map(c => c.map(l => parseLit(l, vars)));
      const satisfied = bits => lits.map(c => c.some(l => (bits[l.v] === "1") !== l.neg));
      const h = bits => { let s = 0; for (const c of lits) if (c.some(l => (bits[l.v] === "1") !== l.neg)) s++; return s; };
      const flipSet = (bits, is) => { const a = bits.split(""); for (const i of is) a[i] = a[i] === "1" ? "0" : "1"; return a.join(""); };
      const nbrs = (bits, k) => combos(n, k).map(is => { const b = flipSet(bits, is); return { bits: b, flips: is, move: is.map(i => vars[i]).join(","), k, h: h(b) }; });
      const nbrsUpTo = (bits, k) => { let out = []; for (let j = 1; j <= Math.min(k, n); j++) out = out.concat(nbrs(bits, j)); return out; };
      const scene = { nodes: vars.map((v, i) => ({ id: v, x: n === 1 ? 0.5 : i / (n - 1), y: 0.5, sub: v })), edges: [], aspect: 0.4, r: n > 10 ? 14 : 20, pad: 40 };
      return Object.assign({}, p, { ids: vars, vars, n, m: lits.length, lits, start: p.start || "0".repeat(n), h, satisfied, solved: b => h(b) === lits.length,
        flip: (b, i) => flipSet(b, [i]), flipSet, nbrs, nbrsUpTo, scene });
    },
    toText(p) {
      return [p.vars.join(" ")].concat(p.clauses.map(c => c.join(" ")), p.start ? ["start: " + p.start] : []).join("\n");
    },
    fromText(txt, base) {
      const L = lines(txt);
      if (!L.length) throw new Error("Type the variables on the first line (a b c d), then one clause per line");
      const vars = L[0].split(/[\s,]+/).filter(Boolean), o = { id: base.id, type: "sat", name: base.name, vars, clauses: [] };
      for (const l of L.slice(1)) {
        const m = /^start\s*[:=]\s*([01]+)$/i.exec(l);
        if (m) { o.start = m[1]; continue; }
        const c = l.replace(/[()]/g, " ").split(/[\s,∨|]+/).filter(Boolean).map(t => (t.startsWith("¬") || t.startsWith("~") || t.startsWith("!") ? "-" + t.slice(1) : t));
        if (c.length) o.clauses.push(c);
      }
      return o;
    },
    help: "Text: first line the variables (a b c d), then one clause per line with - for NOT (e.g. -b -c), optional line start: 0000. Or JSON: {vars, clauses, start}.",
    generator: { params: [{ key: "n", label: "Variables (n)", default: 6, min: 3, max: 12 }, { key: "m", label: "Clauses (m)", default: 20, min: 1, max: 60 }],
      make({ n = 6, m = 20, seed = 1 }) {
        const r = S.rng(seed), vars = Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i)), seen = new Set(), clauses = [];
        for (let tries = 0; clauses.length < m && tries < 50 * m; tries++) {
          const pick = r.shuffle(vars.map((_, i) => i)).slice(0, Math.min(3, n)).sort((a, b) => a - b);
          const c = pick.map(i => (r() < 0.5 ? "-" : "") + vars[i]), key = c.join(" ");
          if (!seen.has(key)) { seen.add(key); clauses.push(c); }
        }
        return { id: `sat-random-${n}-${m}-${seed}`, type: "sat", name: `Random 3-SAT (${n} variables, ${clauses.length} clauses, seed ${seed})`, vars, clauses, start: "0".repeat(n) };
      } },
    describe: p => `${p.vars.length} variables, ${p.clauses.length} clauses${p.start ? ", start " + p.start : ""}`,
  });
})(Studio);
