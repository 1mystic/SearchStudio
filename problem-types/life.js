/* Conway's Game of Life patterns (Week 4, emergent systems).
 * Problem JSON : { type:"life", name, width, height, alive:[[row, col], ...], wrap?:false }   rows and columns count from 0 at the top left
 * Text format  : one text row per grid row, "." dead and "#" alive; an optional line "wrap" makes the grid a torus
 * Cells are named r<row>c<col> (r0c0 is the top left).
 * Reusable API: Studio.lifeLib { id(r,c), step(P, set) -> next set, neighbours(P, set, r, c), keyOf(set), parse(keys) }
 * A set is a plain object { "r,c": true } so that it works in every context. */
(function (S) {
  const cid = (r, c) => `r${r}c${c}`;
  const nbrCount = (P, A, r, c) => {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      let rr = r + dr, cc = c + dc;
      if (P.wrap) { rr = (rr + P.height) % P.height; cc = (cc + P.width) % P.width; }
      else if (rr < 0 || cc < 0 || rr >= P.height || cc >= P.width) continue;
      if (A[rr + "," + cc]) n++;
    }
    return n;
  };
  /* one generation under B3/S23: returns { next, births, deaths, survivors } (each a list of [r,c,neighbours]) */
  const step = (P, A) => {
    const next = {}, births = [], deaths = [], survivors = [];
    for (let r = 0; r < P.height; r++) for (let c = 0; c < P.width; c++) {
      const n = nbrCount(P, A, r, c), live = !!A[r + "," + c];
      if (live && (n === 2 || n === 3)) { next[r + "," + c] = true; survivors.push([r, c, n]); }
      else if (live) deaths.push([r, c, n]);
      else if (n === 3) { next[r + "," + c] = true; births.push([r, c, n]); }
    }
    return { next, births, deaths, survivors };
  };
  const list = A => Object.keys(A).map(k => k.split(",").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  S.lifeLib = { id: cid, step, neighbours: nbrCount, list };

  S.registerType({
    type: "life", label: "Life pattern", plural: "Game of Life patterns",
    validate(p) {
      const ok = n => Number.isInteger(n) && n >= 3 && n <= 16;
      if (!ok(p.width) || !ok(p.height)) throw new Error("width and height must be whole numbers from 3 to 16");
      if (!Array.isArray(p.alive)) throw new Error("alive must be a list of [row, column] cells");
      p.alive.forEach(a => { if (!Array.isArray(a) || a.length !== 2 || !Number.isInteger(a[0]) || !Number.isInteger(a[1]) || a[0] < 0 || a[1] < 0 || a[0] >= p.height || a[1] >= p.width) throw new Error(`Cell ${JSON.stringify(a)} is outside the ${p.height} × ${p.width} grid (rows 0–${p.height - 1}, columns 0–${p.width - 1})`); });
    },
    prepare(p) {
      const ids = [], nodes = [], W = p.width, H = p.height;
      const aspect = Math.min(1, Math.max(0.45, H / W));
      const sp = Math.min(548 / Math.max(1, W - 1), (Math.max(260, Math.min(560, 640 * Math.max(0.42, aspect))) - 74) / Math.max(1, H - 1));
      const r = Math.max(5, Math.min(22, (sp * 0.8) / 1.7));
      for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) { ids.push(cid(i, j)); nodes.push({ id: cid(i, j), x: W === 1 ? 0.5 : j / (W - 1), y: H === 1 ? 0.5 : i / (H - 1), shape: "box", w: 1.7, label: "" }); }
      const start = {}; p.alive.forEach(([a, b]) => (start[a + "," + b] = true));
      return Object.assign({}, p, { ids, wrap: !!p.wrap, start, scene: { nodes, edges: [], aspect, r, pad: 30 } });
    },
    toText: p => {
      const A = {}; p.alive.forEach(([a, b]) => (A[a + "," + b] = true));
      return Array.from({ length: p.height }, (_, i) => Array.from({ length: p.width }, (_, j) => (A[i + "," + j] ? "#" : ".")).join("")).join("\n") + (p.wrap ? "\nwrap" : "");
    },
    fromText(txt, base) {
      const lines = txt.split(/\n/).map(l => l.replace(/#\s.*$/, "").trim()).filter(Boolean);
      const wrap = lines.some(l => /^wrap$/i.test(l)), rows = lines.filter(l => !/^wrap$/i.test(l));
      const alive = []; rows.forEach((row, i) => [...row].forEach((ch, j) => { if (ch === "#" || ch === "O" || ch === "1") alive.push([i, j]); }));
      return { id: base.id, type: "life", name: base.name, width: Math.max(3, ...rows.map(r => r.length)), height: Math.max(3, rows.length), alive, wrap };
    },
    help: 'Edit as JSON: width, height, alive [[row, col], ...] (from 0, top left) and optional "wrap": true. Or draw it: one text row per grid row, "." for dead and "#" for alive.',
    generator: { params: [{ key: "n", label: "Grid size (n × n)", default: 8, min: 4, max: 14 }, { key: "density", label: "Alive cells (%)", default: 30, min: 5, max: 70 }, { key: "seed", label: "Seed", default: 1, min: 1, max: 9999 }],
      make({ n = 8, density = 30, seed = 1 }) {
        const rnd = S.rng(seed), alive = [];
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (rnd() * 100 < density) alive.push([i, j]);
        if (!alive.length) alive.push([Math.floor(n / 2), Math.floor(n / 2)]);
        return { id: `life-random-${n}-${seed}`, type: "life", name: `Random soup ${n} × ${n}, ${density}% alive (seed ${seed})`, width: n, height: n, alive, generated: true };
      } },
    describe: p => `${p.width} × ${p.height} grid, ${p.alive.length} alive${p.wrap ? ", wraps around" : ""}`,
  });
})(Studio);
