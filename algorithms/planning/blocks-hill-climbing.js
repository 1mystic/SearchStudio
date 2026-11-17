/* Hill climbing in the blocks world with two heuristics (course: h1 counts blocks on the right thing, h2 counts whole correct structures). */
Studio.register({
  id: "plan-hill-climbing",
  name: "Hill climbing in the blocks world (h1 vs h2)",
  family: "Planning",
  week: 3,
  problem: "planning",
  order: 5,
  summary: "Steepest-ascent hill climbing on blocks-world states. The simple heuristic h1 (+1 per block on the right thing, −1 otherwise) gets stuck at a local maximum; h2 (credit for a whole correct tower) reaches the goal.",
  pseudocode: `N ← start
loop
    pick the neighbour M (move one top block to the table or onto another stack) with the highest h(M)
    if h(M) ≤ h(N): return N      // local maximum or plateau: stuck
    N ← M
    if N is the goal: return N

h1(N) = Σ over blocks: +1 if on the thing it should be on in the goal, −1 otherwise
h2(N) = Σ over blocks: +k if its whole structure of k blocks (down to the table) is right, −k otherwise`,
  complexity: "O(moves × neighbours): each step scores every neighbour",
  learn: {
    "intro": "Here a state is a set of stacks and a move takes the top block of one stack and puts it on the table or on top of another stack. The heuristic is only as good as the information it holds: h1 looks at each block's immediate support, h2 looks at the entire structure beneath it. Same search, same moves, different heuristic: one gets stuck, the other solves the problem.",
    "definition": "Steepest-ascent hill climbing: move to the best neighbour as long as it is strictly better than the current state. h1 gives +1 to a block that sits on the right thing (the table for a bottom block) and −1 otherwise. h2 gives a block +k when it and the k−1 blocks below it all stand on the right things, and −k (its height in the stack) otherwise. The goal scores n under h1 and n(n+1)/2 for a single tower under h2. (The exact course picture is not reproduced here; this is the standard construction of the example.)",
    "steps": [
      ["start from the initial state", "Score it with the chosen heuristic."],
      ["generate every neighbour", "Move the top block of any stack to the table or onto any other stack. Ties are broken alphabetically by move name."],
      ["pick the best neighbour", "Steepest ascent: highest h wins."],
      ["if it is not strictly better, stop", "A local maximum (or plateau): hill climbing cannot see past it."],
      ["otherwise move and repeat", "Stop when the goal is reached."]
    ],
    "formulas": [
      { "f": "h1 = Σ ±1 per block, + if on the right thing", "read": "count blocks that are locally right", "why": "Cheap, but a block resting on a wrongly built tower still scores +1, so dismantling that tower looks like a loss." },
      { "f": "h2 = Σ ±k per block, + if its whole support structure is correct", "read": "credit a correct structure of k blocks with k, penalise a wrong one with k", "why": "A wrongly placed block pulls down everything above it, so dismantling a wrong tower is rewarded and building a right one is rewarded more with height." }
    ],
    "why": "The same algorithm with a different evaluation function turns failure into success: the quality of the heuristic decides whether a hill-climber can find the goal.",
    "traps": [
      "A block that is on the right thing is not necessarily correct: if what it stands on is wrong, h2 counts it as wrong.",
      "Stuck does not mean the goal is unreachable: it means no single move improves h.",
      "The goal is read from on(x,y) and ontable(x) facts; a block with no fact is assumed to belong on the table."
    ],
    "props": { "complete": "no", "optimal": "no", "time": "one pass over the neighbours per move", "space": "O(1) states" }
  },
  params: [
    { key: "heuristic", label: "Heuristic", type: "select", default: "h1", options: [["h1", "h1: +1 right thing / −1 otherwise"], ["h2", "h2: whole supporting structure, +k / −k"]] },
    { key: "limit", label: "Max moves", type: "int", default: 30 },
  ],
  run(P, { heuristic, limit }) {
    const BW = Studio.blocks, steps = [];
    const want = {};
    P.blocks.forEach(b => (want[b] = "table"));
    P.goal.forEach(g => { const m = g.match(/^on\((\w+),(\w+)\)$/); if (m) want[m[1]] = m[2]; });
    const sup = (i, s) => (i ? s[i - 1] : "table");
    const marks = st => { const mark = {}; st.forEach(s => { let good = true; s.forEach((b, i) => { good = good && sup(i, s) === want[b]; mark[b] = good ? "goal" : ""; }); }); return mark; };
    const h1 = st => st.reduce((t, s) => t + s.reduce((u, b, i) => u + (sup(i, s) === want[b] ? 1 : -1), 0), 0);
    const h2 = st => st.reduce((t, s) => { let good = true; return t + s.reduce((u, b, i) => { good = good && sup(i, s) === want[b]; return u + (good ? i + 1 : -(i + 1)); }, 0); }, 0);
    const hn = heuristic === "h2" ? "h2" : "h1", H = hn === "h2" ? h2 : h1;
    const isGoal = st => P.goal.every(g => {
      const m = g.match(/^on\((\w+),(\w+)\)$/); if (m) return st.some(s => s.indexOf(m[1]) > 0 && s[s.indexOf(m[1]) - 1] === m[2]);
      const t = g.match(/^ontable\((\w+)\)$/); if (t) return st.some(s => s[0] === t[1]);
      return true;
    });
    const norm = st => st.filter(s => s.length).map(s => s.slice());
    const nbrs = st => {
      const out = [];
      st.forEach((s, i) => {
        const b = s[s.length - 1];
        if (s.length > 1) out.push({ name: `move(${b},table)`, st: norm(st.map((x, j) => (j === i ? x.slice(0, -1) : x)).concat([[b]])) });
        st.forEach((t, j) => { if (j !== i) { const n = st.map((x, k) => (k === i ? x.slice(0, -1) : x.slice())); n[j].push(b); out.push({ name: `move(${b},${t[t.length - 1]})`, st: norm(n) }); } });
      });
      return out.sort((a, b) => (a.name < b.name ? -1 : 1));
    };
    const n = P.blocks.length, goalMax = hn === "h2" ? n * (n + 1) / 2 : n;
    let cur = BW.stacksFromState(P.blocks, P.init).stacks;
    const moves = [], trace = [H(cur)];
    let stuck = false;
    const mv = () => ({ label: "MOVES", items: moves.map(m => ({ text: m, state: "closed" })) });
    steps.push({ caption: `Start: ${hn} = ${H(cur)} (a single-tower goal would score ${goalMax}). Hill climbing moves to the best neighbour only while it is strictly better.`,
      blocks: { stacks: cur, goal: P.goalDraw, mark: marks(cur) }, stats: [{ label: hn, value: H(cur) }] });
    for (let it = 0; it < limit && !isGoal(cur); it++) {
      const c = H(cur), ns = nbrs(cur).map(x => Object.assign(x, { h: H(x.st) }));
      const best = ns.reduce((a, b) => (b.h > a.h ? b : a), ns[0]);
      const table = { title: `Neighbours scored with ${hn}`, columns: ["move", hn, "change"], rows: ns.map(x => [x.name, x.h, { t: (x.h - c > 0 ? "+" : "") + (x.h - c), s: x.h > c ? "ok" : x.h < c ? "bad" : "warn" }]), rowStates: ns.map(x => (x === best ? "cur" : "")) };
      if (best.h <= c) {
        stuck = true;
        steps.push({ caption: `Stuck: the best neighbour (${best.name}) scores ${best.h}, not above the current ${hn} = ${c}. No single move improves the picture, so hill climbing stops here, short of the goal.`,
          blocks: { stacks: cur, goal: P.goalDraw, mark: marks(cur) }, table, lists: moves.length ? [mv()] : undefined, stats: [{ label: hn, value: c, state: "bad" }, { label: "moves", value: moves.length }] });
        break;
      }
      cur = best.st; moves.push(best.name); trace.push(best.h);
      steps.push({ caption: `Best neighbour is ${best.name} with ${hn} = ${best.h} (was ${c}); it is strictly better, so move there.`,
        blocks: { stacks: cur, goal: P.goalDraw, mark: marks(cur) }, table, lists: [mv()], stats: [{ label: hn, value: best.h, state: "ok" }, { label: "moves", value: moves.length }] });
    }
    const reached = isGoal(cur);
    if (reached) steps.push({ caption: `Goal reached in ${moves.length} move(s): ${moves.join(", ") || "none needed"}.`, blocks: { stacks: cur, goal: P.goalDraw, mark: marks(cur) }, lists: [mv()], stats: [{ label: hn, value: H(cur), state: "ok" }, { label: "moves", value: moves.length }] });
    else if (!stuck) steps.push({ caption: `Stopped after ${moves.length} moves (limit) without reaching the goal.`, blocks: { stacks: cur, goal: P.goalDraw, mark: marks(cur) } });
    return { steps, result: { heuristic: hn, moves, reached, stuck, finalH: H(cur), startH: trace[0], trace, final: cur.map(s => s.join("")).join("|") } };
  },
});
