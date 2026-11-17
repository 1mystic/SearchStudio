/* Tic-tac-toe positions for k-ply game search (Week 7).
 * Problem JSON : { type:"tictactoe", name, board:"X.O......", toMove:"X" }   board = 9 characters, row by row, X O or .
 * Text format  : three rows of three characters, then a line  "move X"  (or "move O")
 * Cells are named A1 A2 A3 / B1 B2 B3 / C1 C2 C3 (row letter, column number), so reading order is alphabetical order.
 * MAX is always X.  Static evaluator (course): e(n) = (rows, columns, diagonals still open for X) - (those still open for O),
 * +infinity when X has three in a row, -infinity when O has.
 * Reusable API: Studio.tttLib { LINES, cell(i), winner(b), moves(b), play(b, i, who), open(b, who), e(b), search(b, toMove, depth), fmt(v) } */
(function (S) {
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const cell = i => "ABC"[Math.floor(i / 3)] + (i % 3 + 1);
  const winner = b => { for (const [x, y, z] of LINES) if (b[x] !== "." && b[x] === b[y] && b[y] === b[z]) return b[x]; return null; };
  const moves = b => (winner(b) ? [] : [...b].map((c, i) => (c === "." ? i : -1)).filter(i => i >= 0));
  const play = (b, i, who) => b.slice(0, i) + who + b.slice(i + 1);
  const other = w => (w === "X" ? "O" : "X");
  // lines still open for `who`: containing no mark of the opponent
  const open = (b, who) => LINES.filter(l => l.every(i => b[i] !== other(who))).length;
  const e = b => { const w = winner(b); return w === "X" ? Infinity : w === "O" ? -Infinity : open(b, "X") - open(b, "O"); };
  const fmt = v => (v === Infinity ? "+∞" : v === -Infinity ? "−∞" : String(v));
  /* depth-limited minimax from X's point of view: returns { v, pv } (pv = best line of cell indices); ties go to the first (alphabetical) move */
  const search = (b, toMove, depth, memo = new Map()) => {
    const key = b + toMove + depth;
    if (memo.has(key)) return memo.get(key);
    let res;
    const ms = moves(b);
    if (winner(b) || !ms.length) res = { v: winner(b) ? e(b) : 0, pv: [] };
    else if (depth <= 0) res = { v: e(b), pv: [] };
    else {
      let best = null;
      for (const i of ms) {
        const r = search(play(b, i, toMove), other(toMove), depth - 1, memo);
        if (!best || (toMove === "X" ? r.v > best.v : r.v < best.v)) best = { v: r.v, pv: [i].concat(r.pv) };
      }
      res = best;
    }
    memo.set(key, res);
    return res;
  };
  S.tttLib = { LINES, cell, winner, moves, play, other, open, e, fmt, search };

  const norm = s => String(s ?? "").replace(/[\s\/|,]/g, "").replace(/[_\-]/g, ".").replace(/0/g, "O").toUpperCase();
  S.registerType({
    type: "tictactoe", label: "tic-tac-toe position", plural: "tic-tac-toe positions",
    validate(p) {
      const b = norm(p.board);
      if (!/^[XO.]{9}$/.test(b)) throw new Error('board must be 9 characters, row by row, each X, O or . (e.g. "X.O......")');
      if (p.toMove !== "X" && p.toMove !== "O") throw new Error('toMove must be "X" or "O"');
      const nx = [...b].filter(c => c === "X").length, no = [...b].filter(c => c === "O").length;
      if (nx - no !== 0 && nx - no !== 1) throw new Error("X must have the same number of marks as O, or one more (X moves first)");
    },
    prepare(p) {
      const board = norm(p.board), ids = Array.from({ length: 9 }, (_, i) => cell(i));
      const nodes = ids.map((id, i) => ({ id, x: 0.3 + 0.2 * (i % 3), y: Math.floor(i / 3) / 2, shape: "box", w: 2.4, label: board[i] === "." ? id : board[i], state: board[i] === "X" ? "open" : board[i] === "O" ? "alt" : "dim" }));
      return Object.assign({}, p, { board, ids, scene: { nodes, edges: [], aspect: 0.55, r: 26, pad: 40 } });
    },
    toText: p => { const b = norm(p.board); return [0, 3, 6].map(i => [...b.slice(i, i + 3)].join(" ")).join("\n") + `\nmove ${p.toMove}`; },
    fromText(txt, base) {
      const lines = txt.split(/\n/).map(l => l.replace(/#.*/, "").trim()).filter(Boolean);
      const mv = lines.find(l => /^move\b/i.test(l));
      const rows = lines.filter(l => !/^move\b/i.test(l)).join("");
      const b = norm(rows), nx = [...b].filter(c => c === "X").length, no = [...b].filter(c => c === "O").length;
      return { id: base.id, type: "tictactoe", name: base.name, board: b, toMove: mv ? mv.split(/\s+/)[1].toUpperCase() : nx === no ? "X" : "O" };
    },
    help: 'Edit as JSON: board is 9 characters row by row (X, O or .), toMove is "X" or "O". Or type three rows of three, then a line "move X".',
    generator: { params: [{ key: "marks", label: "Marks already played", default: 3, min: 0, max: 7 }, { key: "seed", label: "Seed", default: 1, min: 1, max: 9999 }],
      make({ marks = 3, seed = 1 }) {
        const rnd = S.rng(seed);
        for (let tries = 0; tries < 200; tries++) {
          let b = ".........", who = "X";
          for (let k = 0; k < marks; k++) { const ms = moves(b); if (!ms.length) break; b = play(b, rnd.pick(ms), who); who = other(who); }
          if (!winner(b) && moves(b).length) return { id: `ttt-random-${marks}-${seed}`, type: "tictactoe", name: `Random position, ${marks} marks (seed ${seed})`, board: b, toMove: who, generated: true };
        }
        return { id: "ttt-random-empty", type: "tictactoe", name: "Empty board", board: ".........", toMove: "X", generated: true };
      } },
    describe: p => `${norm(p.board).replace(/\./g, "·")} · ${p.toMove} to move`,
  });
})(Studio);
