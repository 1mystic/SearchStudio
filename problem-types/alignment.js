/* Pairwise sequence alignment as a shortest path in the alignment lattice. Costs are minimised. */
(function (S) {
  S.registerType({
    type: "alignment", label: "sequence alignment", plural: "alignment problems",
    validate(p) {
      if (!p.a || !p.b) throw new Error("Give two sequences a and b");
      if (p.a.length > 10 || p.b.length > 10) throw new Error("Keep sequences to 10 letters or fewer so every step can be drawn");
      for (const k of ["match", "mismatch", "gap"]) if (!(Number(p[k]) >= 0)) throw new Error(`${k} cost must be a number ≥ 0`);
    },
    prepare(p) {
      const a = p.a.toUpperCase(), b = p.b.toUpperCase(), m = a.length, n = b.length;
      const id = (i, j) => i + "," + j, ids = [];
      const nodes = [], edges = [];
      for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) {
        ids.push(id(i, j));
        nodes.push({ id: id(i, j), x: (j + 1) / (n + 1), y: (i + 1) / (m + 1), r: 8, label: "" });
        if (j < n) edges.push({ u: id(i, j), v: id(i, j + 1), quiet: true });
        if (i < m) edges.push({ u: id(i, j), v: id(i + 1, j), quiet: true });
        if (i < m && j < n) edges.push({ u: id(i, j), v: id(i + 1, j + 1), quiet: true });
      }
      for (let j = 0; j < n; j++) nodes.push({ id: "b" + j, x: (j + 1.5) / (n + 1), y: 0, shape: "point", label: b[j] });
      for (let i = 0; i < m; i++) nodes.push({ id: "a" + i, x: 0, y: (i + 1.5) / (m + 1), shape: "point", label: a[i] });
      const cost = (i, j) => (a[i] === b[j] ? Number(p.match) : Number(p.mismatch));
      return Object.assign({}, p, { a, b, m, n, ids, nid: id, cost, gapC: Number(p.gap), scene: { nodes, edges, aspect: (m + 1) / (n + 1), r: 8, pad: 34 } });
    },
    toText: p => `a ${p.a}\nb ${p.b}\nmatch ${p.match}\nmismatch ${p.mismatch}\ngap ${p.gap}`,
    fromText(txt, base) {
      const o = { id: base.id, type: "alignment", name: base.name };
      txt.split(/\n/).map(l => l.trim()).filter(Boolean).forEach(l => { const [k, v] = l.split(/\s+/); o[k] = ["a", "b"].includes(k) ? v : Number(v); });
      return o;
    },
    help: "a SEQ1 · b SEQ2 · match, mismatch and gap costs (lower total cost is better).",
    describe: p => `${p.a} vs ${p.b} · match ${p.match}, mismatch ${p.mismatch}, gap ${p.gap}`,
  });
})(Studio);
