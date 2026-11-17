/* Implicit state spaces: the problem is a start state, a goal test and a MoveGen written in code.
 * The graph is never listed. prepare() enumerates reachable states breadth-first up to a cap
 * (P.ids and the preview scene), and the algorithms draw the part they have explored in each step's own scene.
 * Domains: "water-jug", "8-puzzle", "missionaries". A state is a string (its own key). */
(function (S) {
  const LET = "ABCDEFGHIJ";
  const ci = (a, k) => Math.ceil(a / k);

  /* ---------------------------------------------------------------- water jugs */
  const jug = {
    check(p) {
      const cap = p.capacities, st = p.start;
      if (!Array.isArray(cap) || cap.length < 2 || cap.length > 6 || cap.some(c => !Number.isInteger(c) || c < 1)) throw new Error("capacities must be 2 to 6 whole numbers ≥ 1");
      if (!Array.isArray(st) || st.length !== cap.length || st.some((v, i) => !Number.isInteger(v) || v < 0 || v > cap[i])) throw new Error("start needs one level per jug, between 0 and its capacity");
      const g = p.goal, bad = 'goal must be {"contains": k} or {"state": [levels]}';
      if (!g || typeof g !== "object") throw new Error(bad);
      if (g.contains !== undefined) { if (!Number.isInteger(g.contains) || g.contains < 0 || g.contains > Math.max(...cap)) throw new Error("goal.contains must be a whole number the biggest jug can hold"); }
      else if (!Array.isArray(g.state) || g.state.length !== cap.length || g.state.some((v, i) => !Number.isInteger(v) || v < 0 || v > cap[i])) throw new Error(bad);
    },
    make(p) {
      const cap = p.capacities, n = cap.length, dec = s => s.split(",").map(Number), enc = a => a.join(",");
      const g = p.goal;
      return {
        init: enc(p.start), txt: s => "(" + s + ")",
        goalText: g.contains !== undefined ? `some jug holds ${g.contains}` : `jugs hold (${g.state.join(",")})`,
        isGoal: s => { const a = dec(s); return g.contains !== undefined ? a.includes(g.contains) : a.every((v, i) => v === g.state[i]); },
        moves(s) {
          const a = dec(s), out = [];
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const amt = Math.min(a[i], cap[j] - a[j]); if (amt <= 0) continue;
            const b = a.slice(); b[i] -= amt; b[j] += amt;
            out.push({ to: enc(b), label: `${LET[i]}→${LET[j]}` });
          }
          return out;
        },
        h: () => 0,
        table(s) {
          const a = dec(s);
          return { title: "jug levels", columns: ["jug", "capacity", "level", "water"], rows: a.map((v, i) => [LET[i], cap[i], { t: v, s: g.contains !== undefined && v === g.contains ? "ok" : "" }, "█".repeat(v) + "░".repeat(cap[i] - v)]) };
        },
      };
    },
  };

  /* ---------------------------------------------------------------- 8-puzzle */
  const norm9 = s => String(s ?? "").replace(/[\s\/,|]/g, "").replace(/[_.]/g, "0");
  const inv = s => { const a = s.split("").filter(c => c !== "0"); let n = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) n++; return n; };
  const puz = {
    check(p) {
      const st = norm9(p.start), go = norm9(p.goal ?? "123456780");
      for (const [nm, v] of [["start", st], ["goal", go]]) if (v.length !== 9 || [...v].sort().join("") !== "012345678") throw new Error(`${nm} must list the tiles 1–8 and one blank (0 or _) exactly once, e.g. "283164705"`);
      if (inv(st) % 2 !== inv(go) % 2) throw new Error("This start can never reach the goal (the parity of inversions differs): half of all 8-puzzle arrangements are unreachable from the other half");
    },
    make(p) {
      const goal = norm9(p.goal ?? "123456780"), start = norm9(p.start);
      const gp = {}; [...goal].forEach((c, i) => (gp[c] = i));
      const txt = s => [0, 3, 6].map(i => s.slice(i, i + 3).replace("0", "_")).join("/");
      const DIRS = [[-3, "blank ↑"], [3, "blank ↓"], [-1, "blank ←"], [1, "blank →"]];
      return {
        init: start, txt, goalText: "tiles as in " + txt(goal),
        isGoal: s => s === goal,
        moves(s) {
          const b = s.indexOf("0"), out = [];
          for (const [d, label] of DIRS) {
            const t = b + d;
            if (t < 0 || t > 8 || (d === -1 && b % 3 === 0) || (d === 1 && b % 3 === 2)) continue;
            const a = s.split(""); a[b] = a[t]; a[t] = "0";
            out.push({ to: a.join(""), label });
          }
          return out;
        },
        h(s, kind) {
          if (kind === "none") return 0;
          let n = 0;
          for (let i = 0; i < 9; i++) {
            const c = s[i]; if (c === "0") continue;
            if (kind === "misplaced") { if (gp[c] !== i) n++; }
            else n += Math.abs(Math.floor(i / 3) - Math.floor(gp[c] / 3)) + Math.abs((i % 3) - (gp[c] % 3));
          }
          return n;
        },
        table(s) {
          const cell = i => ({ t: s[i] === "0" ? "_" : s[i], s: s[i] === "0" ? "warn" : goal[i] === s[i] ? "ok" : "bad" });
          return { title: "board (green: tile already on its goal square)", columns: ["", "", ""], rows: [0, 1, 2].map(r => [cell(3 * r), cell(3 * r + 1), cell(3 * r + 2)]) };
        },
      };
    },
  };

  /* ---------------------------------------------------------------- missionaries and cannibals */
  const mc = {
    check(p) {
      const m = p.missionaries ?? 3, c = p.cannibals ?? 3, k = p.boat ?? 2;
      for (const [n, v, lo] of [["missionaries", m, 1], ["cannibals", c, 0], ["boat", k, 1]]) if (!Number.isInteger(v) || v < lo || v > 9) throw new Error(`${n} must be a whole number from ${lo} to 9`);
      if (c > m) throw new Error("With more cannibals than missionaries the start bank is already unsafe");
    },
    make(p) {
      const M = p.missionaries ?? 3, C = p.cannibals ?? 3, K = p.boat ?? 2;
      const dec = s => s.split(",").map(Number);
      const safe = (m, c) => (m === 0 || m >= c) && (M - m === 0 || M - m >= C - c);
      const hl = n => (n <= 0 ? 0 : n <= K ? 1 : K < 2 ? 0 : 2 * ci(n - K, K - 1) + 1);
      return {
        init: `${M},${C},0`,
        txt: s => { const [m, c, b] = dec(s); return `(${m}M ${c}C ${b === 0 ? "boat left" : "boat right"})`; },
        goalText: "everyone on the right bank",
        isGoal: s => s === "0,0,1",
        moves(s) {
          const [m, c, b] = dec(s), out = [];
          for (let tot = 1; tot <= K; tot++) for (let a = tot; a >= 0; a--) {
            const k = tot - a, nm = b === 0 ? m - a : m + a, nc = b === 0 ? c - k : c + k;
            if (nm < 0 || nm > M || nc < 0 || nc > C || !safe(nm, nc)) continue;
            out.push({ to: `${nm},${nc},${1 - b}`, label: (b === 0 ? "→ " : "← ") + (a ? a + "M" : "") + (k ? k + "C" : "") });
          }
          return out;
        },
        // fewest crossings if every trip carried a full boat and no safety rule applied (never overestimates)
        h(s, kind) { if (kind === "none") return 0; const [m, c, b] = dec(s), n = m + c; return n === 0 ? 0 : b === 0 ? hl(n) : 1 + hl(n + 1); },
        table(s) {
          const [m, c, b] = dec(s);
          return { title: "banks", columns: ["bank", "missionaries", "cannibals", "boat"], rows: [["left", m, c, b === 0 ? "boat" : ""], ["right", M - m, C - c, b === 1 ? "boat" : ""]] };
        },
      };
    },
  };

  const DOMAINS = { "water-jug": jug, "8-puzzle": puz, missionaries: mc };

  /* breadth-first enumeration of reachable states, stopping once `cap` states are known */
  function reach(dom, cap) {
    const parent = new Map([[dom.init, null]]), q = [dom.init], kids = {};
    let truncated = false;
    for (let i = 0; i < q.length; i++) {
      kids[q[i]] = [];
      for (const m of dom.moves(q[i])) {
        if (!parent.has(m.to)) {
          if (q.length >= cap) { truncated = true; continue; }
          parent.set(m.to, q[i]); q.push(m.to); kids[q[i]].push(m.to);
        }
      }
    }
    return { ids: q, kids, parent, truncated };
  }

  /* ---------------------------------------------------------------- the search engine
   * kind: "bfs" | "dfs" | "best" | "astar"; opts: { h, tie, pairs, depthBound, maxExpand }
   * Course notation: OPEN and CLOSED hold node pairs (state, parent, depth) or (state, parent, g, f); goal test when a node is picked from OPEN.
   * pairs:false is the "simple search" of the course: OPEN and CLOSED hold bare states, so the path cannot be read back. */
  function search(P, kind, o = {}) {
    const D = P.dom, steps = [], hk = o.h || "manhattan", pairs = o.pairs !== false, maxExpand = o.maxExpand || 400, bound = o.depthBound || 0;
    const tieMode = o.tie || "alpha", informed = kind === "best" || kind === "astar";
    let seq = 0;
    const mk = (id, par, g) => { const h = D.h(id, hk); return { id, parent: par, depth: g, g, h, f: g + h, seq: seq++ }; };
    const root = mk(D.init, null, 0);
    let OPEN = [root]; const CLOSED = [], order = [D.init], idx = { [D.init]: 1 }, alt = new Set();
    const info = new Map([[D.init, root]]), find = id => info.get(id);
    const prio = x => (kind === "astar" ? x.f : kind === "best" ? x.h : 0);
    const tie = (a, b) => (tieMode === "fifo" ? a.seq - b.seq : tieMode === "lifo" ? b.seq - a.seq : a.id < b.id ? -1 : a.id > b.id ? 1 : a.seq - b.seq);
    const sortOpen = () => { if (informed) OPEN.sort((a, b) => prio(a) - prio(b) || tie(a, b)); };
    const T = s => D.txt(s);
    const pair = x => !pairs ? T(x.id) : kind === "astar" ? `(${T(x.id)}, ${x.parent ? T(x.parent) : "nil"}, g=${x.g}, f=${x.f})` : kind === "best" ? `(${T(x.id)}, ${x.parent ? T(x.parent) : "nil"}, h=${x.h})` : `(${T(x.id)}, ${x.parent ? T(x.parent) : "nil"}, ${x.depth})`;
    const badge = x => (kind === "astar" ? x.f : kind === "best" ? x.h : x.depth);
    const pathTo = N => { const p = []; for (let x = N; x; x = x.parent ? find(x.parent) : null) p.unshift(x); return p; };

    function snapshot(cur, caption, extra = {}) {
      const all = order.map(id => find(id)), many = all.length > 24;
      const kidsOf = {}; all.forEach(x => { if (x.parent) (kidsOf[x.parent] = kidsOf[x.parent] || []).push(x.id); });
      const pos = S.treeLayout(D.init, id => kidsOf[id] || []);
      let depth = 0; all.forEach(x => (depth = Math.max(depth, x.depth)));
      const nodes = {}, openSet = new Set(OPEN);
      const pathSet = new Set((extra.path || []).map(x => x.id));
      for (const x of all) {
        const inOpen = openSet.has(x);
        nodes[x.id] = { state: pathSet.has(x.id) ? (D.isGoal(x.id) ? "goal" : "path") : cur && cur.id === x.id ? "current" : inOpen ? (D.isGoal(x.id) ? "goalcand" : "open") : "closed", badge: pairs ? badge(x) : undefined };
      }
      const scene = {
        nodes: all.map(x => ({ id: x.id, x: pos[x.id][0], y: pos[x.id][1], label: String(idx[x.id]), sub: !many || (cur && cur.id === x.id) || pathSet.has(x.id) ? T(x.id) : undefined })),
        edges: [...alt].map(k => { const [u, v] = k.split(">"); return { u, v }; }).concat(all.filter(x => x.parent).map(x => ({ u: x.parent, v: x.id }))),
        aspect: Math.min(0.9, 0.42 + 0.08 * depth), r: all.length > 60 ? 8 : all.length > 30 ? 10 : all.length > 14 ? 13 : 17, pad: 40,
      };
      const edges = all.filter(x => x.parent).map(x => ({ u: x.parent, v: x.id, state: "tree", label: many ? undefined : (D.moves(x.parent).find(m => m.to === x.id) || {}).label }));
      if (extra.path) for (let i = 1; i < extra.path.length; i++) edges.push({ u: extra.path[i - 1].id, v: extra.path[i].id, state: "path" });
      steps.push({
        caption, nodes, edges, scene,
        table: extra.table || D.table(cur ? cur.id : D.init),
        lists: [{ label: "OPEN", items: OPEN.map(x => ({ text: pair(x), state: "open" })) }, { label: "CLOSED", items: CLOSED.slice().reverse().map(x => ({ text: pair(x), state: "closed" })) }],
        stats: [{ label: "expanded", value: CLOSED.length }, { label: "generated", value: order.length }, { label: "OPEN", value: OPEN.length }].concat(extra.stats || []),
      });
    }

    snapshot(null, `OPEN ← [${pair(root)}], CLOSED ← [ ]. ${kind === "bfs" ? "OPEN is a queue: the oldest node is picked first, so shallow nodes go before deep ones." : kind === "dfs" ? "OPEN is a stack: the newest children are picked first, so the search dives deep before it backs up." : kind === "astar" ? `OPEN is kept sorted by f = g + h (${hk === "misplaced" ? "tiles out of place" : hk === "none" ? "h = 0" : "the heuristic h"}); the least f is picked first.` : "OPEN is kept sorted by h alone: the node that looks closest to the goal is picked first."} Goal: ${D.goalText}.`);
    while (OPEN.length) {
      if (CLOSED.length >= maxExpand) {
        snapshot(null, `Stopped after ${CLOSED.length} expansions (the studio's cap) with ${OPEN.length} nodes still on OPEN. Raise "Expansion cap" to go on.`, { stats: [{ label: "capped", value: "yes", state: "warn" }] });
        return { steps, result: { found: false, capped: true, expanded: CLOSED.length, generated: order.length } };
      }
      const N = OPEN.shift();
      if (D.isGoal(N.id)) {
        CLOSED.push(N);
        if (!pairs) {
          snapshot(N, `Goal ${T(N.id)} picked from OPEN after ${CLOSED.length} expansions. The goal test succeeds, but OPEN and CLOSED hold bare states, so there is no parent to follow: the path cannot be recovered. Keep node pairs (state, parent, depth) to read the path back.`, { stats: [{ label: "path", value: "lost", state: "bad" }] });
          return { steps, result: { found: true, path: null, expanded: CLOSED.length, generated: order.length } };
        }
        const nodesOnPath = pathTo(N), path = nodesOnPath.map(x => x.id), moves = [];
        for (let i = 1; i < path.length; i++) moves.push(D.moves(path[i - 1]).find(m => m.to === path[i]).label);
        const table = { title: "solution", columns: ["#", "move", "state"], rows: path.map((s, i) => [i, i ? moves[i - 1] : "start", T(s)]) };
        snapshot(N, `Goal ${T(N.id)} picked from OPEN, so the goal test succeeds. Following the parents back gives a path of ${moves.length} moves (${moves.join(", ")}); ${CLOSED.length} nodes were expanded and ${order.length} generated. ${kind === "bfs" ? "BFS takes rings in order, so no solution has fewer moves." : kind === "dfs" ? "DFS stops at the first goal it dives into, so a shorter solution may exist." : kind === "best" ? "Best First looked only at h, so a shorter solution may exist." : "With an admissible h the first goal picked is a shortest solution (unit move cost)."}`, { path: nodesOnPath, table, stats: [{ label: "path length", value: moves.length, state: "ok" }] });
        return { steps, result: { found: true, path, moves, length: moves.length, cost: N.g, expanded: CLOSED.length, generated: order.length } };
      }
      CLOSED.push(N);
      const added = [], dropped = [], improved = [];
      if (bound && N.depth >= bound) {
        snapshot(N, `Pick ${T(N.id)} from OPEN: not a goal, but it is at the depth bound ${bound}, so it is moved to CLOSED without generating children.`);
        continue;
      }
      for (const m of D.moves(N.id)) {
        const g2 = N.g + 1, old = find(m.to);
        if (!old) { const c = mk(m.to, N.id, g2); info.set(c.id, c); order.push(c.id); idx[c.id] = order.length; added.push(c); }
        else if (kind === "astar" && g2 < old.g) { Object.assign(old, { parent: N.id, g: g2, depth: g2, f: g2 + old.h }); improved.push(old); if (CLOSED.includes(old)) { CLOSED.splice(CLOSED.indexOf(old), 1); added.push(old); } }
        else { dropped.push(m.to); alt.add(N.id + ">" + m.to); }
      }
      if (kind === "dfs") OPEN = added.concat(OPEN); else OPEN = OPEN.concat(added.filter(x => !OPEN.includes(x)));
      sortOpen();
      const why = kind === "bfs" ? "the oldest node on OPEN" : kind === "dfs" ? "the newest node on OPEN" : kind === "astar" ? `the least f = g + h on OPEN (${N.f}${OPEN.some(x => prio(x) === N.f) ? ", ties broken alphabetically" : ""})` : `the least h on OPEN (${N.h})`;
      snapshot(N, `Pick ${T(N.id)}, ${why}. It is not a goal, so MoveGen gives its neighbours: ${added.length} new go onto OPEN${kind === "dfs" ? " at the front" : kind === "bfs" ? " at the back" : ""}${added.length ? " (" + added.map(c => T(c.id) + (informed ? ` h=${c.h}` : "")).join(", ") + ")" : ""}${dropped.length ? `; ${dropped.length} already on OPEN or CLOSED, so not added again (graph search)` : ""}${improved.length ? `; a cheaper path to ${improved.length} known state(s) updates its parent` : ""}.`);
    }
    snapshot(null, `OPEN is empty and no picked node passed the goal test, so there is no solution${bound ? " within the depth bound " + bound : ""}.`);
    return { steps, result: { found: false, expanded: CLOSED.length, generated: order.length } };
  }

  S.statespace = { domains: DOMAINS, reach, search };

  S.registerType({
    type: "statespace", label: "state-space problem", plural: "state-space problems",
    validate(p) {
      const d = DOMAINS[p.domain];
      if (!d) throw new Error(`domain must be one of: ${Object.keys(DOMAINS).join(", ")}`);
      d.check(p);
    },
    prepare(p) {
      const dom = DOMAINS[p.domain].make(p);
      const R = reach(dom, p.cap ?? 40), set = new Set(R.ids);
      const pos = S.treeLayout(dom.init, id => R.kids[id]);
      const edges = [], seen = new Set();
      for (const u of R.ids) for (const m of dom.moves(u)) {
        if (!set.has(m.to)) continue;
        const k = u < m.to ? u + "|" + m.to : m.to + "|" + u;
        if (!seen.has(k)) { seen.add(k); edges.push({ u, v: m.to }); }
      }
      const scene = { nodes: R.ids.map((id, i) => ({ id, x: pos[id][0], y: pos[id][1], label: String(i + 1) })), edges, aspect: 0.6, r: R.ids.length > 30 ? 10 : 14, pad: 40 };
      return Object.assign({}, p, { ids: R.ids, dom, scene, truncated: R.truncated, reachable: R.truncated ? null : R.ids.length });
    },
    help: 'Edit as JSON. {"domain":"water-jug","capacities":[8,5,3],"start":[8,0,0],"goal":{"contains":4}} · {"domain":"8-puzzle","start":"283164705","goal":"123804765"} (0 or _ is the blank) · {"domain":"missionaries","missionaries":3,"cannibals":3,"boat":2}. Optional "cap": how many reachable states to preview (default 40).',
    generator: {
      params: [{ key: "moves", label: "Scramble moves", default: 8, min: 2, max: 20 }, { key: "seed", label: "Seed", default: 1, min: 1, max: 999 }],
      make({ moves = 8, seed = 1 }) {
        const rnd = S.rng(seed), goal = "123456780", dom = puz.make({ start: goal, goal });
        let cur = goal, prev = null;
        for (let i = 0; i < moves; i++) { const m = rnd.pick(dom.moves(cur).filter(x => x.to !== prev)); prev = cur; cur = m.to; }
        if (cur === goal) cur = dom.moves(goal)[0].to;
        return { id: `space-8puzzle-${seed}-${moves}`, type: "statespace", domain: "8-puzzle", name: `8-puzzle scrambled by ${moves} random moves (seed ${seed})`, start: cur, goal };
      },
    },
    describe: p => ({ "water-jug": `water jugs ${(p.capacities || []).join("/")}`, "8-puzzle": "8-puzzle", missionaries: `${p.missionaries ?? 3} missionaries, ${p.cannibals ?? 3} cannibals` }[p.domain]) || "state space",
  });
})(Studio);
