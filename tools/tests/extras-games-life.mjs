// Extras: Game of Life, k-ply tic-tac-toe (horizon effect), game theory (dominance, Nash), multi-arm plan scheduling.
export default ({ Studio, ok, eq, ex, run, checkRun }) => {
  // ---------------------------------------------------------------- Game of Life
  const key = cells => cells.map(c => c.join(",")).join(";");
  const shifted = (cells, dr, dc) => key(cells.map(([r, c]) => [r + dr, c + dc]));
  for (const id of ["life-blinker", "life-glider", "life-block"]) ok(!!checkRun(Studio.get("life-stepper"), ex(id)), `life-stepper runs on ${id}`);
  const bl = run("life-stepper", ex("life-blinker"), { generations: 2 });
  eq(key(bl.generations[2]), key(bl.generations[0]), "blinker returns to its start after 2 generations");
  ok(key(bl.generations[1]) !== key(bl.generations[0]), "blinker differs after 1 generation");
  eq(key(bl.generations[1]), "1,2;2,2;3,2", "blinker flips to vertical (hand-checked)");
  eq(bl.period, 2, "blinker: period 2");
  const gl = run("life-stepper", ex("life-glider"), { generations: 4 });
  eq(key(gl.generations[4]), shifted(gl.generations[0], 1, 1), "glider is translated by (1,1) after 4 generations");
  eq(gl.shift, [1, 1], "glider: reported shift (1,1)"); eq(gl.period, 4, "glider: period 4");
  eq(gl.populations, [5, 5, 5, 5, 5], "glider keeps 5 live cells");
  const bk = run("life-stepper", ex("life-block"), { generations: 3 });
  eq(key(bk.generations[3]), key(bk.generations[0]), "block unchanged"); eq(bk.period, 1, "block: still life, period 1");
  const wrapGlider = Object.assign({}, ex("life-glider"), { id: "t-wrap", wrap: true, width: 5, height: 5 });
  eq(run("life-stepper", wrapGlider, { generations: 20 }).populations.every(p => p === 5), true, "glider on a torus keeps 5 cells");
  const lone = { id: "t-lone", type: "life", name: "lone", width: 4, height: 4, alive: [[1, 1]] };
  eq(run("life-stepper", lone, { generations: 1 }).extinct, true, "a single cell dies of loneliness");
  const rnd = Studio.types.life.generator.make({ n: 6, seed: 3 });
  ok(!!checkRun(Studio.get("life-stepper"), rnd), "life-stepper runs on a random soup");
  eq(Studio.types.life.fromText(Studio.types.life.toText(ex("life-glider")), { id: "x", name: "x" }).alive, ex("life-glider").alive, "life text format round-trips the alive cells");

  // ---------------------------------------------------------------- k-ply tic-tac-toe
  const T = Studio.tttLib;
  eq(T.e("........."), 0, "e(empty board) = 0");
  eq(T.e("....X...."), 4, "e(X in the centre) = 8 - 4 = 4");
  eq(T.e("....O...."), -4, "e(O in the centre) = -4");
  eq(T.e("X........"), 3, "e(X in a corner) = 8 - 5 = 3");
  eq(T.e("XXX.OO..."), Infinity, "three X in a row = +infinity");
  eq(T.e("OOOXX.X.."), -Infinity, "three O in a row = -infinity");
  const kp = (id, k) => run("ttt-kply", ex(id), { k });
  for (const id of ["ttt-horizon", "ttt-empty"]) ok(!!checkRun(Studio.get("ttt-kply"), ex(id)), `ttt-kply runs on ${id}`);
  eq(kp("ttt-empty", 1).moves.find(m => m.cell === "B2").value, 4, "empty board, k = 1: centre scores 4");
  eq(kp("ttt-empty", 1).moves.find(m => m.cell === "A1").value, 3, "empty board, k = 1: corner scores 3");
  eq(kp("ttt-empty", 1).moves.find(m => m.cell === "A2").value, 2, "empty board, k = 1: edge scores 2");
  eq(kp("ttt-empty", 1).choice, "B2", "empty board, k = 1: choose the centre");
  // horizon example (hand-checked): X on A1, B1; O on A2, C1; X to move. A3 loses to O's fork C2; B2 is a winning fork.
  eq(kp("ttt-horizon", 1).choice, "A3", "k = 1 picks A3");
  eq(kp("ttt-horizon", 2).choice, "A3", "k = 2 picks A3");
  eq(kp("ttt-horizon", 3).choice, "B2", "k = 3 picks B2");
  eq(kp("ttt-horizon", 3).value, Infinity, "k = 3 sees the win (+infinity)");
  for (const k of [1, 2]) { const r = kp("ttt-horizon", k); eq([r.horizon, r.fullChoice, r.fullValue], [true, "B2", Infinity], `k = ${k}: horizon effect, full search chooses B2`); eq(r.fullValues.find(m => m.cell === "A3").value, -Infinity, `A3 loses by force under full search (k = ${k})`); }
  eq(kp("ttt-horizon", 3).horizon, false, "k = 3: no horizon effect here");
  eq(kp("ttt-horizon", 9).choice, "B2", "full depth chooses B2");
  const oMove = { id: "t-o", type: "tictactoe", name: "o", board: "XO.X..O..".replace("O.X", "O.X"), toMove: "X" };
  ok(!!checkRun(Studio.get("ttt-kply"), oMove), "ttt-kply runs on a plain position");
  const over = { id: "t-over", type: "tictactoe", name: "over", board: "XXXOO....", toMove: "O" };
  eq(run("ttt-kply", over, { k: 2 }).choice, null, "finished game: nothing to choose");
  ok(!!checkRun(Studio.get("ttt-kply"), Studio.types.tictactoe.generator.make({ marks: 4, seed: 2 })), "ttt-kply runs on a random position");
  eq(Studio.types.tictactoe.fromText(Studio.types.tictactoe.toText(ex("ttt-horizon")), { id: "x", name: "x" }).board, "XO.X..O..", "ttt text format round-trips");

  // ---------------------------------------------------------------- game theory
  for (const id of ["gametheory-prisoners", "gametheory-battle", "gametheory-pennies", "gametheory-iterated"]) ok(!!checkRun(Studio.get("game-nash"), ex(id)), `game-nash runs on ${id}`);
  const pd = run("game-nash", ex("gametheory-prisoners"));
  eq(pd.ne, [["Defect", "Defect"]], "Prisoner's Dilemma: unique NE (Defect, Defect)");
  eq(pd.paretoInefficient, [["Defect", "Defect"]], "Prisoner's Dilemma: the equilibrium is Pareto-inefficient");
  eq([pd.dominantRow, pd.dominantCol], ["Defect", "Defect"], "Prisoner's Dilemma: Defect is dominant for both");
  eq(pd.eliminated.map(e => `${e.player}:${e.strategy}`), ["row:Cooperate", "column:Cooperate"], "Prisoner's Dilemma: elimination order");
  eq(pd.survivors, { rows: ["Defect"], cols: ["Defect"] }, "Prisoner's Dilemma: iterated elimination leaves (Defect, Defect)");
  const bs = run("game-nash", ex("gametheory-battle"));
  eq(bs.ne, [["Football", "Football"], ["Opera", "Opera"]], "Battle of the Sexes: two pure NE");
  eq([bs.paretoInefficient, bs.eliminated, bs.dominantRow], [[], [], null], "Battle of the Sexes: both efficient, nothing eliminated, no dominant strategy");
  const mp = run("game-nash", ex("gametheory-pennies"));
  eq(mp.ne, [], "Matching Pennies: no pure NE"); eq(mp.eliminated, [], "Matching Pennies: nothing dominated");
  const it = run("game-nash", ex("gametheory-iterated"));
  eq(it.eliminated.map(e => `${e.player}:${e.strategy}`), ["column:Center", "row:Bottom", "row:Middle", "column:Right"], "3 x 3 game: elimination order (hand-checked)");
  eq(it.ne, [["Top", "Left"]], "3 x 3 game: unique NE (Top, Left)"); eq(it.survivors, { rows: ["Top"], cols: ["Left"] }, "3 x 3 game: iterated elimination survivor");
  eq(it.paretoInefficient, [["Top", "Left"]], "3 x 3 game: (Top, Left) = (4,3) is Pareto-dominated, e.g. by (Middle, Center) = (8,4)");
  // every pure NE survives iterated elimination of strictly dominated strategies
  for (const id of ["gametheory-prisoners", "gametheory-battle", "gametheory-pennies", "gametheory-iterated"]) { const r = run("game-nash", ex(id)); ok(r.ne.every(([a, b]) => r.survivors.rows.includes(a) && r.survivors.cols.includes(b)), `${id}: equilibria survive elimination`); }

  // ---------------------------------------------------------------- multi-arm scheduling
  const BW = Studio.blocks;
  const executes = (id, sched, k) => {
    const Pp = Studio.prepare(ex(id)); let st = Pp.init;
    const times = [...new Set(sched.map(s => s.t))].sort((a, b) => a - b);
    for (const t of times) {
      const now = sched.filter(s => s.t === t).sort((a, b) => a.arm - b.arm);
      if (now.length > k) return false;
      const bl = now.map(s => (s.action.match(/\((\w+)(?:,(\w+))?\)/) || []).slice(1).filter(Boolean));
      for (let i = 0; i < bl.length; i++) for (let j = i + 1; j < bl.length; j++) if (bl[i].some(b => bl[j].includes(b))) return false;   // same-step actions share no block
      const ops = now.map(s => Pp.ops.find(o => o.name === s.action));
      for (const o of ops) if (!o || !o.pre.filter(f => f !== "AE").every(f => st.has(f))) return false;   // preconditions hold (the arm fact AE is per arm)
      for (const o of ops) st = BW.apply(o, st);
    }
    return Pp.goal.every(g => st.has(g));
  };
  for (const id of ["plan-reverse", "plan-sussman", "plan-parallel-towers"]) {
    ok(!!checkRun(Studio.get("plan-multi-arm"), ex(id)), `plan-multi-arm runs on ${id}`);
    for (const planner of ["plan-forward", "plan-backward", "plan-gsp"]) {
      if (id === "plan-parallel-towers" && planner !== "plan-forward") continue;
      const one = run("plan-multi-arm", ex(id), { k: 1, planner });
      eq(one.makespan, one.plan.length, `${id}/${planner}: one arm, makespan = plan length (${one.plan.length})`);
      for (const k of [2, 3]) {
        const r = run("plan-multi-arm", ex(id), { k, planner });
        ok(r.makespan <= r.plan.length, `${id}/${planner}, k = ${k}: makespan ${r.makespan} ≤ plan length ${r.plan.length}`);
        ok(r.makespan >= r.critical, `${id}/${planner}, k = ${k}: makespan ≥ dependency chain`);
        ok(r.schedule.length === r.plan.length && executes(id, r.schedule, k) && r.valid, `${id}/${planner}, k = ${k}: the schedule executes in time order and reaches the goal`);
      }
    }
  }
  eq(run("plan-multi-arm", ex("plan-sussman"), { k: 2 }).makespan, 6, "Sussman anomaly: one dependency chain, 2 arms do not help (6)");
  eq(run("plan-multi-arm", ex("plan-parallel-towers"), { k: 2 }).makespan, 4, "two independent towers: 2 arms, makespan 4");
  eq(run("plan-multi-arm", ex("plan-parallel-towers"), { k: 3 }).makespan, 4, "two independent towers: 3 arms are no better (4)");
  eq(run("plan-multi-arm", ex("plan-parallel-towers"), { k: 1 }).makespan, 8, "two independent towers: 1 arm (8)");
};
