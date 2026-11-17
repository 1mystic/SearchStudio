/* k-ply minimax with a static evaluator on tic-tac-toe, and the horizon effect. Week 7. */
Studio.register({
  id: "ttt-kply",
  name: "k-ply tic-tac-toe (static evaluator, horizon effect)",
  family: "Game playing",
  week: 7,
  problem: "tictactoe",
  order: 30,
  defaultExample: "ttt-horizon",
  summary: "Look only k plies ahead, score the frontier with e(n) = (lines still open for X) − (lines still open for O), and back the values up with minimax. Then compare with a full-depth search to see what lies beyond the horizon.",
  pseudocode: `e(n) = (rows, columns, diagonals open for MAX) − (those open for MIN)
        +∞ if MAX has three in a row, −∞ if MIN has
Search(n, depth):
    if n is won or full: return its value (±∞ or 0)
    if depth = 0:        return e(n)            ← the horizon: static evaluation
    MAX node: max over moves of Search(child, depth − 1)
    MIN node: min over moves of Search(child, depth − 1)
choose the root move with the best backed-up value (ties: alphabetical cell order)`,
  complexity: "O(b^k) positions for k plies (b ≤ 9)",
  learn: {
    "intro": "Real games are too deep to search to the end, so a program searches only k plies ahead and judges the positions at that frontier with a static evaluation function. In tic-tac-toe a simple evaluator counts the lines that are still open: e(n) = (rows, columns and diagonals not yet blocked for MAX) − (those not yet blocked for MIN). Minimax then backs these numbers up. The weakness is the horizon effect: a loss (or win) that arrives just beyond k plies is invisible, so a shallow search can happily walk into it.",
    "definition": "MAX is X, MIN is O. A line is open for a player if it contains none of the opponent's marks. e(n) is the number of lines open for MAX minus the number open for MIN; a won position is +∞ (MAX) or −∞ (MIN) and a full board without a winner is 0. A k-ply search looks k moves ahead (counting the move being chosen), evaluates the frontier positions with e and backs up with max at MAX nodes and min at MIN nodes.",
    "steps": [
      ["for each root move, search k − 1 plies below it", "Each candidate move is scored by what the best play within the horizon leads to."],
      ["at the frontier (depth 0) return e(n)", "Count the lines open for X and for O and subtract."],
      ["a won position is ±∞, a full board is 0", "Real outcomes are not estimated: they are exact."],
      ["back up: max at MAX nodes, min at MIN nodes", "Each player is assumed to pick the reply that is best for themselves, as far as the horizon sees."],
      ["pick the best root move; ties go to the alphabetically first cell", "A1 before A2 before B1 and so on."],
      ["compare with full-depth search", "If the k-ply choice is worse under full search, the evaluator was fooled by the horizon."]
    ],
    "formulas": [
      { "f": "e(n) = openlines(MAX) − openlines(MIN)", "read": "lines still winnable for X minus lines still winnable for O", "why": "More winnable lines means more chances to win and fewer to lose. The empty board has 8 lines open for each side, so e = 0; X alone in the centre keeps 8 lines but takes 4 from O, so e = 8 − 4 = 4." },
      { "f": "v(n, d) = e(n) if d = 0;  max or min over children of v(child, d − 1) otherwise", "read": "depth-limited minimax", "why": "Minimax is exact only at the leaves of the game; at the frontier it trusts e." }
    ],
    "why": "It is how chess programs and every game player with a big tree work: look as deep as the time allows and guess at the frontier. The horizon effect is the price: the guess is only as good as e, and some dangers (forks, forced sequences) take more plies to show up than the horizon allows.",
    "traps": [
      "k counts plies (single moves), not pairs of moves: k = 2 is your move and one reply.",
      "Values are always from MAX's point of view. When O is to move, O picks the smallest value, not the largest.",
      "A higher k is not a guarantee: the evaluator can still be wrong at the frontier. Only the full-depth search is exact.",
      "e counts open lines, not threats: two marks in a row and one mark in a row look similar to it, which is exactly why it misses forks."
    ],
    "props": { "complete": "no (only looks k plies ahead)", "optimal": "only when k reaches the end of the game", "time": "O(b^k)", "space": "O(k)" }
  },
  params: [
    { key: "k", label: "Plies to look ahead (k)", type: "int", default: 2, min: 1, max: 9 },
    { key: "compare", label: "Compare with full search", type: "select", default: "yes", options: [["yes", "Yes: show the horizon effect"], ["no", "No"]] },
  ],
  run(P, { k, compare }) {
    const L = Studio.tttLib, steps = [];
    const K = Math.max(1, Math.min(9, Math.round(k) || 2));
    const b0 = P.board, who = P.toMove, max = who === "X";
    const name = i => L.cell(i), fmt = L.fmt;
    const pl = n => `${n} ${n === 1 ? "ply" : "plies"}`;
    const who2 = w => (w === "X" ? "X (MAX)" : "O (MIN)");
    const draw = (b, hl = {}) => {
      const nodes = {};
      for (let i = 0; i < 9; i++) nodes[name(i)] = { label: b[i] === "." ? name(i) : b[i], state: b[i] === "X" ? "open" : b[i] === "O" ? "alt" : "dim" };
      (hl.cand || []).forEach(i => (nodes[name(i)] = Object.assign({}, nodes[name(i)], { state: "candidate" })));
      (hl.cur || []).forEach(i => (nodes[name(i)] = Object.assign({}, nodes[name(i)], { state: "current" })));
      (hl.path || []).forEach(i => (nodes[name(i)] = Object.assign({}, nodes[name(i)], { state: "path" })));
      (hl.goal || []).forEach(i => (nodes[name(i)] = Object.assign({}, nodes[name(i)], { state: "goal" })));
      return nodes;
    };
    const winLine = b => { const w = L.winner(b); return w ? L.LINES.find(l => l.every(i => b[i] === w)) : []; };
    const eText = b => { const w = L.winner(b); return w ? `${w} has three in a row, so the value is ${fmt(L.e(b))}` : L.moves(b).length ? `e = ${L.open(b, "X")} lines open for X − ${L.open(b, "O")} lines open for O = ${fmt(L.e(b))}` : "the board is full with no winner, so the value is 0"; };
    const apply = (b, w, pv) => { let cur = b, p = w; for (const i of pv) { cur = L.play(cur, i, p); p = L.other(p); } return cur; };
    const lineText = (w, pv) => pv.map((i, n) => `${name(i)} (${n % 2 === 0 ? w : L.other(w)})`).join(", ");
    const roots = L.moves(b0);
    if (!roots.length) {
      const w = L.winner(b0);
      steps.push({ caption: w ? `The game is already over: ${w} has three in a row. There is no move to choose.` : "The board is full: a draw. There is no move to choose.", nodes: draw(b0, { goal: winLine(b0) }) });
      return { steps, result: { k: K, moves: [], choice: null, value: L.e(b0), horizon: false } };
    }
    steps.push({ caption: `${who2(who)} to move. MAX is X and MIN is O. Evaluator: ${eText(b0)}. We look ${pl(K)} ahead from here: for each of the ${roots.length} legal moves we search ${pl(K - 1)} more below it and evaluate the frontier with e.`,
      nodes: draw(b0), stats: [{ label: "open for X", value: L.open(b0, "X") }, { label: "open for O", value: L.open(b0, "O") }, { label: "e(root)", value: fmt(L.e(b0)) }, { label: "k", value: K }] });
    const memo = new Map(), rows = [], res = [];
    for (const i of roots) {
      const b1 = L.play(b0, i, who), r = L.search(b1, L.other(who), K - 1, memo), pv = [i].concat(r.pv), leaf = apply(b0, who, pv);
      const val = r.v; res.push({ i, cell: name(i), value: val, pv });
      rows.push([name(i), { t: fmt(val), s: val === Infinity ? "ok" : val === -Infinity ? "bad" : "" }, lineText(who, pv), fmt(L.e(leaf))]);
      const why = pv.length === 1 ? `With k = ${K} the search stops right after this move, so the value is e of the resulting position: ${eText(leaf)}.`
        : `Best play inside the horizon is ${lineText(who, pv)}; that frontier position ${eText(leaf)}. ${who === "X" ? "O (MIN) picks its reply to minimise" : "X (MAX) picks its reply to maximise"} the value, so ${name(i)} is worth ${fmt(val)} to X.`;
      steps.push({ caption: `Try ${name(i)} for ${who}. ${why}`, nodes: draw(leaf, { cand: pv.slice(1), cur: [i], goal: winLine(leaf) }),
        table: { title: `root moves, ${K}-ply values (for X)`, columns: ["move", "backed-up value", "best line within the horizon", "e at frontier"], rows: rows.map(x => x.slice()), rowStates: rows.map((_, n) => (n === rows.length - 1 ? "cur" : "")) },
        stats: [{ label: "move", value: name(i) }, { label: "value", value: fmt(val), state: val === Infinity ? "ok" : val === -Infinity ? "bad" : "" }] });
    }
    let best = res[0];
    for (const m of res) if (max ? m.value > best.value : m.value < best.value) best = m;
    const tied = res.filter(m => m.value === best.value);
    steps.push({ caption: `${who} picks the ${max ? "largest" : "smallest"} backed-up value: ${best.cell} with ${fmt(best.value)}${tied.length > 1 ? `. ${tied.map(m => m.cell).join(", ")} tie, so the alphabetically first cell wins` : ""}. ${max ? "MAX wants e high." : "MIN wants e low."}`,
      nodes: draw(L.play(b0, best.i, who), { path: [best.i] }),
      table: { title: `root moves, ${K}-ply values (for X)`, columns: ["move", "backed-up value", "best line within the horizon", "e at frontier"], rows, rowStates: res.map(m => (m.i === best.i ? "ok" : "")) },
      stats: [{ label: `${K}-ply choice`, value: best.cell, state: "ok" }, { label: "value", value: fmt(best.value) }] });
    const result = { k: K, moves: res.map(m => ({ cell: m.cell, value: m.value })), choice: best.cell, value: best.value, e: L.e(b0), horizon: false, fullChoice: null, fullValue: null };
    const empties = roots.length;
    if (compare !== "no") {
      const fm = new Map(), full = roots.map(i => ({ i, cell: name(i), r: L.search(L.play(b0, i, who), L.other(who), 99, fm) }));
      let fb = full[0]; for (const m of full) if (max ? m.r.v > fb.r.v : m.r.v < fb.r.v) fb = m;
      const mine = full.find(m => m.i === best.i), outcome = v => (v === 0 ? "draw" : (v > 0) === max ? `${who} wins` : `${who} loses`);
      result.fullChoice = fb.cell; result.fullValue = fb.r.v; result.fullValues = full.map(m => ({ cell: m.cell, value: m.r.v })); result.horizon = mine.r.v !== fb.r.v;
      const horizonSees = K >= empties && roots.length === empties; // k reaches the end of the game from here
      const rows2 = full.map(m => [m.cell, fmt(res.find(x => x.i === m.i).value), { t: fmt(m.r.v), s: m.r.v === fb.r.v ? "ok" : "bad" }, outcome(m.r.v), m.i === best.i ? `<- ${K}-ply choice` : m.i === fb.i ? "<- full-depth choice" : ""]);
      const states2 = full.map(m => (m.i === best.i && mine.r.v !== fb.r.v ? "bad" : m.r.v === fb.r.v ? "ok" : ""));
      steps.push({ caption: result.horizon
          ? `Full-depth search (all the way to the end of the game) disagrees. ${best.cell}, the ${K}-ply choice, really leads to: ${outcome(mine.r.v)} (value ${fmt(mine.r.v)}), while ${fb.cell} leads to: ${outcome(fb.r.v)} (value ${fmt(fb.r.v)}). That is the horizon effect: the problem lies more than ${pl(K)} away, where the static evaluator cannot see it.`
          : `Full-depth search agrees: ${best.cell} leads to: ${outcome(mine.r.v)}, which is the best result available${full.some(m => m.i !== best.i && m.r.v === fb.r.v) ? ` (${full.filter(m => m.r.v === fb.r.v).map(m => m.cell).join(", ")} are all equally good)` : ""}. No horizon effect from this position${horizonSees ? ", and k reaches the end of the game" : ""}.`,
        nodes: draw(L.play(b0, fb.i, who), { path: [fb.i] }),
        table: { title: `${K}-ply value against full-depth value (for X)`, columns: ["move", `${K}-ply value`, "full-depth value", "full-depth outcome", ""], rows: rows2, rowStates: states2 },
        stats: [{ label: `${K}-ply choice`, value: best.cell, state: result.horizon ? "bad" : "ok" }, { label: "full-depth choice", value: fb.cell, state: "ok" }] });
      if (result.horizon) {
        const line = [best.i].concat(mine.r.pv), end = apply(b0, who, line);
        steps.push({ caption: `Why ${best.cell} fails: the full search follows ${lineText(who, line)}, ${L.winner(end) ? `and ${L.winner(end)} completes three in a row` : "reaching a draw"}. Every ply after the first ${pl(K)} lies beyond the horizon, so a ${K}-ply search never looked at them.`,
          nodes: draw(end, { goal: winLine(end), cur: [best.i] }), stats: [{ label: "line length", value: line.length }, { label: "horizon", value: K, state: "bad" }] });
      }
    }
    return { steps, result };
  },
});
