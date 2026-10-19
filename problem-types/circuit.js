/* Circuits of adders and multipliers for model-based diagnosis (the classic polybox). */
(function (S) {
  S.registerType({
    type: "circuit", label: "circuit", plural: "circuits",
    validate(p) {
      if (!Array.isArray(p.components) || !p.components.length) throw new Error("A circuit needs components");
      p.components.forEach(c => { if (!["add", "mul"].includes(c.op) || c.in.length !== 2 || !c.out) throw new Error(`${c.id}: op must be add or mul, with two inputs and one output`); });
    },
    prepare(p) {
      const wires = [...new Set(Object.keys(p.inputs).concat(p.components.flatMap(c => c.in.concat([c.out]))))];
      const ids = p.components.map(c => c.id);
      const L = p.layout || {};
      const nodes = wires.map(w => ({ id: w, x: (L[w] || [0, 0])[0], y: (L[w] || [0, 0])[1], label: w })).concat(p.components.map(c => ({ id: c.id, x: (L[c.id] || [0, 0])[0], y: (L[c.id] || [0, 0])[1], shape: "box", label: `${c.id} ${c.op === "add" ? "+" : "×"}` })));
      const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      nodes.forEach(n => { n.x = (n.x - x0) / Math.max(1e-9, x1 - x0); n.y = (n.y - y0) / Math.max(1e-9, y1 - y0); });
      const edges = p.components.flatMap(c => c.in.map(w => ({ u: w, v: c.id, directed: true })).concat([{ u: c.id, v: c.out, directed: true }]));
      return Object.assign({}, p, { ids, wires, scene: { nodes, edges, aspect: 0.55, r: 16, pad: 40 } });
    },
    help: "Edit as JSON: inputs {A: 3, …}, components [{id, op: add | mul, in: [w1, w2], out}], observed {F: 10, …}, optional layout {name: [x, y]}.",
    describe: p => `${p.components.length} components · observed ${Object.entries(p.observed).map(([k, v]) => k + "=" + v).join(", ")}`,
  });
})(Studio);
