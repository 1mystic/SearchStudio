/* Game trees for Minimax, Alpha-Beta and SSS*. Leaves hold values for MAX. */
(function (S) {
  const parse = txt => {
    // "((3 12 8) (2 4 6) (14 5 2))" -> nested arrays
    const tok = txt.replace(/[\[\]]/g, m => (m === "[" ? "(" : ")")).replace(/,/g, " ").match(/\(|\)|-?\d+(\.\d+)?/g) || [];
    let i = 0;
    const read = () => {
      const t = tok[i++];
      if (t === "(") { const arr = []; while (tok[i] !== ")") { if (i >= tok.length) throw new Error("Unbalanced brackets"); arr.push(read()); } i++; return arr; }
      if (t === ")" || t === undefined) throw new Error("Unexpected end or ')'");
      return Number(t);
    };
    const tree = read();
    if (!Array.isArray(tree)) throw new Error("The root must be a bracketed list");
    return tree;
  };
  const show = t => (Array.isArray(t) ? "(" + t.map(show).join(" ") + ")" : String(t));
  S.registerType({
    type: "game", label: "game tree", plural: "game trees",
    validate(p) {
      if (!Array.isArray(p.tree)) throw new Error("A game tree needs a nested list 'tree' of leaf values");
      const chk = t => { if (Array.isArray(t)) { if (!t.length) throw new Error("Internal nodes need children"); t.forEach(chk); } else if (typeof t !== "number" || !isFinite(t)) throw new Error("Leaves must be numbers"); };
      chk(p.tree);
    },
    prepare(p) {
      const names = [], nodes = {};
      const ids = []; let k = 0;
      const label = i => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + (i % 26)) + Math.floor(i / 26));
      // breadth-first naming: A is the root, then left to right level by level
      const q = [[p.tree, null, 0]];
      while (q.length) {
        const [t, parent, d] = q.shift();
        const id = label(k++);
        const max = (d % 2 === 0) === (p.root !== "MIN");
        nodes[id] = { id, parent, depth: d, player: max ? "MAX" : "MIN", children: [], value: Array.isArray(t) ? null : t };
        ids.push(id);
        if (parent) nodes[parent].children.push(id);
        if (Array.isArray(t)) t.forEach(c => q.push([c, id, d + 1]));
      }
      const root = ids[0];
      const pos = S.treeLayout(root, id => nodes[id].children);
      const maxD = Math.max(...ids.map(i => nodes[i].depth));
      const scene = { nodes: ids.map(id => { const n = nodes[id]; const leaf = !n.children.length;
          return { id, x: pos[id][0], y: pos[id][1], shape: leaf ? "leaf" : n.player === "MAX" ? "max" : "min", label: leaf ? String(n.value) : id, sub: leaf ? id : "" }; }),
        edges: ids.filter(i => nodes[i].parent).map(i => ({ u: nodes[i].parent, v: i })), aspect: Math.min(0.75, 0.25 + maxD * 0.14), r: ids.length > 40 ? 11 : 15, pad: 30 };
      return Object.assign({}, p, { ids, nodes, root, scene, leaves: ids.filter(i => !nodes[i].children.length) });
    },
    toText: p => `root ${p.root || "MAX"}\n${show(p.tree)}`,
    fromText(txt, base) {
      const root = /root\s+MIN/i.test(txt) ? "MIN" : "MAX";
      return { id: base.id, type: "game", name: base.name, root, tree: parse(txt.replace(/root\s+\w+/i, "")) };
    },
    help: "Optional first line 'root MAX' or 'root MIN', then the tree as nested brackets of leaf values, e.g. ((3 12 8) (2 4 6) (14 5 2)).",
    generator: { params: [{ key: "b", label: "Branching", default: 3, min: 2, max: 4 }, { key: "d", label: "Depth", default: 3, min: 1, max: 4 }],
      make({ b = 3, d = 3, seed = 1 }) {
        const r = S.rng(seed);
        const mk = depth => (depth === 0 ? r.int(21) : Array.from({ length: b }, () => mk(depth - 1)));
        return { id: `random-game-${b}-${d}-${seed}`, type: "game", name: `Random game tree · b=${b}, d=${d} · seed ${seed}`, root: "MAX", tree: mk(d) };
      } },
    describe: p => `game tree, root ${p.root || "MAX"}`,
  });
})(Studio);
