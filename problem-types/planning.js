/* STRIPS blocks world with an arm (course operators pickup, putdown, stack, unstack; AE = arm empty). */
(function (S) {
  const BW = {};
  BW.stateFromStacks = (stacks, holding) => {
    const st = new Set();
    stacks.forEach(s => s.forEach((b, i) => { st.add(i === 0 ? `ontable(${b})` : `on(${b},${s[i - 1]})`); if (i === s.length - 1) st.add(`clear(${b})`); }));
    if (holding) st.add(`holding(${holding})`); else st.add("AE");
    return st;
  };
  BW.stacksFromState = (blocks, st) => {
    const above = {}, stacks = [];
    blocks.forEach(b => { for (const f of st) { const m = f.match(/^on\((\w+),(\w+)\)$/); if (m) above[m[2]] = m[1]; } });
    blocks.filter(b => st.has(`ontable(${b})`)).sort().forEach(b => { const s = [b]; let t = b; while (above[t]) { t = above[t]; s.push(t); } stacks.push(s); });
    const holding = blocks.find(b => st.has(`holding(${b})`)) || null;
    return { stacks, holding };
  };
  BW.ops = blocks => {
    const ops = [];
    for (const x of blocks) {
      ops.push({ name: `pickup(${x})`, pre: [`ontable(${x})`, `clear(${x})`, "AE"], del: [`ontable(${x})`, `clear(${x})`, "AE"], add: [`holding(${x})`] });
      ops.push({ name: `putdown(${x})`, pre: [`holding(${x})`], del: [`holding(${x})`], add: [`ontable(${x})`, `clear(${x})`, "AE"] });
      for (const y of blocks) if (y !== x) {
        ops.push({ name: `stack(${x},${y})`, pre: [`holding(${x})`, `clear(${y})`], del: [`holding(${x})`, `clear(${y})`], add: [`on(${x},${y})`, `clear(${x})`, "AE"] });
        ops.push({ name: `unstack(${x},${y})`, pre: [`on(${x},${y})`, `clear(${x})`, "AE"], del: [`on(${x},${y})`, `clear(${x})`, "AE"], add: [`holding(${x})`, `clear(${y})`] });
      }
    }
    return ops;
  };
  BW.applicable = (op, st) => op.pre.every(f => st.has(f));
  BW.apply = (op, st) => { const n = new Set(st); op.del.forEach(f => n.delete(f)); op.add.forEach(f => n.add(f)); return n; };
  BW.key = st => [...st].sort().join(" ");
  BW.goalStacks = (blocks, goal) => {
    // draw the goal as stacks where possible (blocks not mentioned stand alone)
    const st = new Set(goal); const on = {}; goal.forEach(g => { const m = g.match(/^on\((\w+),(\w+)\)$/); if (m) on[m[1]] = m[2]; });
    const bottoms = blocks.filter(b => !on[b]); const above = {}; Object.entries(on).forEach(([a, b]) => (above[b] = a));
    return bottoms.filter(b => above[b] || st.has(`ontable(${b})`) || Object.values(on).includes(b) || on[b]).map(b => { const s = [b]; let t = b; while (above[t]) { t = above[t]; s.push(t); } return s; });
  };
  S.blocks = BW;
  S.registerType({
    type: "planning", label: "planning (blocks world)", plural: "planning problems",
    validate(p) {
      if (!Array.isArray(p.blocks) || !p.blocks.length) throw new Error("List the blocks");
      const inInit = p.init.flat();
      if (inInit.length !== p.blocks.length || p.blocks.some(b => !inInit.includes(b))) throw new Error("Every block must appear exactly once in init stacks");
      if (!Array.isArray(p.goal) || !p.goal.length) throw new Error("Give at least one goal predicate");
      p.goal.forEach(g => { if (!/^(on\(\w+,\w+\)|ontable\(\w+\)|clear\(\w+\)|AE|holding\(\w+\))$/.test(g)) throw new Error(`Unknown goal predicate "${g}"`); });
    },
    prepare(p) {
      const init = BW.stateFromStacks(p.init, null);
      return Object.assign({}, p, { ids: p.blocks.slice(), init, goalSet: new Set(p.goal), ops: BW.ops(p.blocks), goalDraw: BW.goalStacks(p.blocks, p.goal) });
    },
    toText: p => `blocks ${p.blocks.join(" ")}\n# stacks, bottom first, one per line\n${p.init.map(s => "init " + s.join(" ")).join("\n")}\ngoal ${p.goal.join(" ")}`,
    fromText(txt, base) {
      const lines = txt.split(/\n/).map(l => l.replace(/#.*/, "").trim()).filter(Boolean);
      const p = { id: base.id, type: "planning", name: base.name, blocks: [], init: [], goal: [] };
      lines.forEach(l => { const [k, ...r] = l.split(/\s+/); if (k === "blocks") p.blocks = r; else if (k === "init") p.init.push(r); else if (k === "goal") p.goal = r; });
      return p;
    },
    help: "blocks A B C · one 'init' line per stack listed bottom first · goal predicates like on(A,B) ontable(C) clear(A).",
    describe: p => `${p.blocks.length} blocks · goal ${p.goal.join(" ∧ ")}`,
  });
})(Studio);
