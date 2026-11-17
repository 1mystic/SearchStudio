/* Graphplan: build the planning graph level by level (propositions, actions, no-ops, mutexes), then extract a plan backwards. */
Studio.register({
  id: "plan-graphplan",
  name: "Graphplan",
  family: "Planning",
  week: 8,
  problem: "planning",
  order: 40,
  summary: "Build a planning graph of alternating proposition and action layers with no-op actions and mutex (mutual exclusion) pairs; once the goals appear together without being mutex, search backwards through the graph for a plan, memoising failed goal sets.",
  pseudocode: `P0 ← initial state;  i ← 0
loop
    if all goals ∈ Pi and no two goals are mutex in Pi:
        plan ← EXTRACT(goals, i);  if plan ≠ failure: return plan
    if graph has levelled off and nogoods stopped growing: return failure
    Ai ← actions whose preconditions are in Pi and pairwise non-mutex, plus a no-op for every proposition
    mark action mutexes: inconsistent effects, interference, competing needs
    Pi+1 ← all add-effects of Ai
    mark proposition mutexes: inconsistent support (every pair of achievers is mutex)
    i ← i + 1

EXTRACT(G, i):  if i = 0 return [ ]
    if G ∈ nogood(i) return failure
    choose non-mutex actions in Ai−1 that achieve every g ∈ G (try no-ops first)
    G' ← union of their preconditions;  plan ← EXTRACT(G', i−1)
    if none works: add G to nogood(i); return failure`,
  complexity: "Graph growth is polynomial in the number of propositions and actions; extraction is the exponential part",
  learn: {
    "intro": "Graphplan builds a layered graph in polynomial time that over-approximates what can be true after each number of steps, then does a much smaller backward search inside it. The graph alternates proposition layers P0, P1, … and action layers A0, A1, …. A no-op (persistence) action carries each proposition unchanged to the next layer. Mutex pairs record things that can never hold together (propositions) or be done together (actions) at that level.",
    "definition": "Layer P0 is the initial state. Action layer Ai holds every action whose preconditions are all in Pi and pairwise non-mutex, plus a no-op for each proposition. Pi+1 holds every add effect. Two actions in the same layer are mutex by: (1) inconsistent effects, one adds what the other deletes; (2) interference, one deletes a precondition of the other; (3) competing needs, a precondition of one is mutex with a precondition of the other in Pi. Two propositions in Pi+1 are mutex by inconsistent support: every pair of actions that achieve them is mutex. When all goals are in a layer and pairwise non-mutex, extract a plan backwards: choose a set of non-mutex actions achieving the goals, make their preconditions the subgoals one layer earlier, and repeat; a goal set that fails at a layer is remembered as a nogood. Actions in one layer are mutually non-mutex so they may be done in any order, which gives the flat plan.",
    "steps": [
      ["P0 ← initial state", "Layer 0 holds exactly what is true at the start."],
      ["goals present and non-mutex in Pi?", "A necessary, not a sufficient, condition for a plan of i layers."],
      ["Ai: applicable actions and no-ops", "An action enters only if its preconditions are in Pi and no two are mutex."],
      ["mark action mutexes", "Inconsistent effects, interference, competing needs."],
      ["Pi+1 and its mutexes", "Inconsistent support: all ways of making the two propositions are mutex."],
      ["backward extraction", "Pick non-mutex achievers for the goals, recurse on their preconditions; remember failed goal sets."]
    ],
    "formulas": [
      { "f": "p, q mutex in Pi+1  ⇔  every achiever of p is mutex with every achiever of q", "read": "inconsistent support", "why": "If no non-mutex pair of actions can make both, they cannot both be true after that step." },
      { "f": "a, b mutex  ⇐  add(a) ∩ del(b) ≠ ∅  or  del(a) ∩ pre(b) ≠ ∅  or  pre(a) and pre(b) contain a mutex pair", "read": "inconsistent effects, interference, competing needs", "why": "Each rule names a way the two actions cannot both be carried out in one parallel step." }
    ],
    "why": "Mutex reasoning prunes huge numbers of impossible combinations cheaply before any search, and the first layer in which the goals are non-mutex is a lower bound on the plan length (the plan returned has the fewest layers).",
    "traps": [
      "Goals appearing without mutex is necessary, not sufficient: extraction can still fail and the graph must be extended.",
      "A no-op is an action: it can be mutex with real actions (for example a no-op that keeps AE true is mutex with any action that deletes AE).",
      "Layers count parallel steps; in the one-arm blocks world nearly every pair of actions is mutex, so layers and plan steps coincide.",
      "The termination test (graph levelled off and the nogood table stopped growing) proves that no plan exists; here it is checked after every failed extraction."
    ],
    "props": { "complete": "yes (finds a plan whenever one exists)", "optimal": "fewest layers", "time": "graph: polynomial; extraction: exponential in the worst case", "space": "polynomial in propositions × layers" }
  },
  params: [
    { key: "maxLevels", label: "Maximum number of layers", type: "int", default: 12 },
    { key: "mutexShown", label: "Mutex pairs listed per layer", type: "int", default: 40 },
  ],
  run(P, { maxLevels, mutexShown }) {
    const BW = Studio.blocks, steps = [];
    const key = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
    const goals = [...new Set(P.goal)].sort();
    const L = [{ props: [...P.init].sort(), pm: new Map() }];
    const nogood = [new Set()];
    const draw0 = Object.assign(BW.stacksFromState(P.blocks, P.init), { goal: P.goalDraw });
    const cap = (arr, n) => (arr.length > n ? arr.slice(0, n).concat([{ text: `… and ${arr.length - n} more`, state: "dim" }]) : arr);
    steps.push({ caption: `P0 is the initial state: ${L[0].props.length} propositions, no mutexes. Goals: ${goals.join(", ")}. The graph is extended one layer at a time until all goals are present and pairwise non-mutex.`,
      blocks: draw0, lists: [{ label: "P0", items: L[0].props.map(p => ({ text: p, state: goals.includes(p) ? "open" : "plain" })) }, { label: "GOALS", items: goals.map(g => ({ text: g, state: "goal" })) }], stats: [{ label: "layer", value: 0 }] });

    const goalsOK = i => {
      const S = new Set(L[i].props);
      if (!goals.every(g => S.has(g))) return { ok: false, why: `goal(s) ${goals.filter(g => !S.has(g)).join(", ")} not yet in P${i}` };
      for (let a = 0; a < goals.length; a++) for (let b = a + 1; b < goals.length; b++) if (L[i].pm.has(key(goals[a], goals[b]))) return { ok: false, why: `${goals[a]} and ${goals[b]} are mutex in P${i}` };
      return { ok: true };
    };

    const expand = i => {
      const { props, pm } = L[i], pset = new Set(props);
      const real = P.ops.filter(o => o.pre.every(f => pset.has(f)) && !o.pre.some((f, x) => o.pre.some((g, y) => y > x && pm.has(key(f, g)))));
      real.sort((a, b) => (a.name < b.name ? -1 : 1));
      const noops = props.map(p => ({ name: `noop(${p})`, pre: [p], add: [p], del: [], noop: true }));
      const acts = real.concat(noops), am = new Map();
      for (let x = 0; x < acts.length; x++) for (let y = x + 1; y < acts.length; y++) {
        const a = acts[x], b = acts[y]; let rule = null, why = "";
        let p = a.add.find(f => b.del.includes(f)), q = p ? null : b.add.find(f => a.del.includes(f));
        if (p) { rule = "inconsistent effects"; why = `${a.name} adds ${p} but ${b.name} deletes it`; }
        else if (q) { rule = "inconsistent effects"; why = `${b.name} adds ${q} but ${a.name} deletes it`; }
        else {
          p = a.del.find(f => b.pre.includes(f)); q = p ? null : b.del.find(f => a.pre.includes(f));
          if (p) { rule = "interference"; why = `${a.name} deletes ${p}, a precondition of ${b.name}`; }
          else if (q) { rule = "interference"; why = `${b.name} deletes ${q}, a precondition of ${a.name}`; }
          else for (const f of a.pre) { const g = b.pre.find(h => pm.has(key(f, h))); if (g) { rule = "competing needs"; why = `${a.name} needs ${f} and ${b.name} needs ${g}, mutex in P${i}`; break; } }
        }
        if (rule) am.set(key(a.name, b.name), { rule, why, a: a.name, b: b.name });
      }
      const ach = {};
      acts.forEach(a => a.add.forEach(f => (ach[f] = ach[f] || []).push(a)));
      const nprops = Object.keys(ach).sort(), npm = new Map();
      for (let x = 0; x < nprops.length; x++) for (let y = x + 1; y < nprops.length; y++) {
        const A = ach[nprops[x]], B = ach[nprops[y]];
        if (A.every(a => B.every(b => a !== b && am.has(key(a.name, b.name))))) npm.set(key(nprops[x], nprops[y]), { rule: "inconsistent support", why: `every achiever of ${nprops[x]} is mutex with every achiever of ${nprops[y]}`, a: nprops[x], b: nprops[y] });
      }
      L[i].acts = acts; L[i].am = am; L[i].real = real; L[i + 1] = { props: nprops, pm: npm, ach };
      nogood.push(new Set());
      const count = (m, r) => [...m.values()].filter(v => v.rule === r).length;
      const ratio = new Set(nprops).size, grew = ratio > props.length || npm.size !== pm.size;
      // action layer step
      steps.push({ caption: `A${i}: ${real.length} real action(s) have preconditions in P${i} that are not mutex, plus ${noops.length} no-ops. Mutex pairs: ${count(am, "inconsistent effects")} by inconsistent effects, ${count(am, "interference")} by interference, ${count(am, "competing needs")} by competing needs.`,
        blocks: draw0,
        table: { title: `Action layer A${i}`, columns: ["action", "pre", "add", "delete", "mutex with"], rows: real.map(a => [a.name, a.pre.join(" "), a.add.join(" "), a.del.join(" "), acts.filter(b => b !== a && am.has(key(a.name, b.name))).length]) .concat([["no-ops (" + noops.length + ")", "p", "p", "", ""]]) },
        lists: ["inconsistent effects", "interference", "competing needs"].map(r => ({ label: `A${i} mutex: ${r}`, items: cap([...am.values()].filter(v => v.rule === r).map(v => ({ text: `${v.a} ⊗ ${v.b}: ${v.why}`, state: "rejected" })), mutexShown) })).filter(l => l.items.length),
        stats: [{ label: "layer", value: i }, { label: "actions", value: acts.length }, { label: "action mutexes", value: am.size }] });
      steps.push({ caption: `P${i + 1}: ${nprops.length} propositions (${nprops.length - props.length >= 0 ? nprops.length - props.length + " new" : "fewer"}); ${npm.size} mutex pair(s) by inconsistent support. ${grew ? "" : `P${i + 1} equals P${i}, with the same mutexes: the graph has levelled off. `}`,
        blocks: draw0,
        table: { title: `Proposition layer P${i + 1}`, columns: ["proposition", "achievers", "mutex with"], rows: nprops.map(f => [{ t: f, s: goals.includes(f) ? "ok" : "" }, ach[f].length, nprops.filter(g => npm.has(key(f, g))).join(" ")]) },
        lists: [{ label: `P${i + 1} mutex: inconsistent support`, items: cap([...npm.values()].map(v => ({ text: `${v.a} ⊗ ${v.b}: ${v.why}`, state: "rejected" })), mutexShown) }].filter(l => l.items.length),
        stats: [{ label: "layer", value: i + 1 }, { label: "propositions", value: nprops.length }, { label: "prop mutexes", value: npm.size }] });
      return !grew;
    };

    // ---- backward extraction
    let events = 0;
    const note = (cap_, level, extra) => { if (events++ < 60) steps.push(Object.assign({ caption: cap_, blocks: draw0 }, extra || {})); };
    const extract = (G, i) => {
      if (i === 0) return [];
      const k = G.join(","), pm = L[i - 1].am;
      if (nogood[i].has(k)) { note(`Goal set {${k}} at P${i} is already in the nogood table, so this branch is cut without searching again.`, i); return null; }
      const ach = g => L[i - 1].acts.filter(a => a.add.includes(g)).sort((a, b) => (a.noop === b.noop ? (a.name < b.name ? -1 : 1) : a.noop ? -1 : 1));
      const chosen = [];
      const assign = idx => {
        if (idx === G.length) {
          const sub = [...new Set(chosen.flatMap(a => a.pre))].sort();
          note(`At P${i} the goals {${k}} are achieved by ${chosen.map(a => a.name).join(", ")}; these are pairwise non-mutex in A${i - 1}. Their preconditions become the goals {${sub.join(", ")}} at P${i - 1}.`, i,
            { lists: [{ label: `GOALS at P${i}`, items: G.map(g => ({ text: g, state: "goal" })) }, { label: `CHOSEN in A${i - 1}`, items: chosen.map(a => ({ text: a.name, state: a.noop ? "closed" : "open" })) }, { label: `SUBGOALS at P${i - 1}`, items: sub.map(g => ({ text: g, state: "plain" })) }], stats: [{ label: "level", value: i }] });
          if (sub.some((g, x) => sub.some((h, y) => y > x && L[i - 1].pm.has(key(g, h))))) { note(`Subgoals {${sub.join(", ")}} contain a mutex pair in P${i - 1}, so this choice is rejected.`, i); return null; }
          const r = extract(sub, i - 1);
          return r ? r.concat([chosen.slice()]) : null;
        }
        const g = G[idx];
        if (chosen.some(a => a.add.includes(g))) return assign(idx + 1);
        for (const a of ach(g)) {
          if (chosen.some(c => pm.has(key(a.name, c.name)))) continue;
          chosen.push(a);
          const r = assign(idx + 1);
          if (r) return r;
          chosen.pop();
        }
        return null;
      };
      const r = assign(0);
      if (!r) { nogood[i].add(k); note(`No non-mutex set of actions in A${i - 1} achieves {${k}} with workable subgoals: record {${k}} as a nogood at P${i}.`, i, { stats: [{ label: "nogoods", value: nogood.reduce((s, x) => s + x.size, 0), state: "bad" }] }); }
      return r;
    };

    let n = 0, plan = null, layers = null, leveled = false, prevNo = -1, firstOK = null, failure = null;
    for (;;) {
      const g = goalsOK(n);
      if (g.ok) {
        if (firstOK === null) firstOK = n;
        steps.push({ caption: `All ${goals.length} goal(s) are in P${n} and no two are mutex: try to extract a plan backwards from P${n}.`, blocks: draw0, lists: [{ label: `GOALS at P${n}`, items: goals.map(x => ({ text: x, state: "goal" })) }], stats: [{ label: "layer", value: n }] });
        const r = n === 0 ? [] : extract(goals, n);
        if (r) { layers = r; break; }
        steps.push({ caption: `Extraction from P${n} failed (every way of choosing actions led to a nogood), so the graph is extended by one more layer.`, blocks: draw0, stats: [{ label: "nogoods", value: nogood.reduce((s, x) => s + x.size, 0), state: "bad" }] });
        if (leveled) { const sz = nogood[n].size; if (sz === prevNo) { failure = "the graph has levelled off and the nogood table stopped growing: no plan exists"; break; } prevNo = sz; }
      } else steps.push({ caption: `Goals are not yet usable in P${n}: ${g.why}. Extend the graph.`, blocks: draw0, stats: [{ label: "layer", value: n }] });
      if (n >= maxLevels) { failure = `the layer limit (${maxLevels}) was reached`; break; }
      if (expand(n)) leveled = true;
      n++;
    }
    if (!layers) {
      steps.push({ caption: `No plan: ${failure}.`, blocks: draw0 });
      return { steps, result: { plan: null, levels: n, firstLevel: firstOK, planLayers: null } };
    }
    plan = layers.flatMap(l => l.filter(a => !a.noop).map(a => a.name));
    const planLayers = layers.map(l => l.filter(a => !a.noop).map(a => a.name));
    steps.push({ caption: `Plan found with ${n} layer(s): ${planLayers.map((l, i) => `${i + 1}: ${l.join(" ‖ ") || "(only no-ops)"}`).join("; ")}. Actions within a layer are non-mutex, so they may be ordered arbitrarily: flat plan ${plan.join(", ")}.`,
      blocks: draw0, lists: [{ label: "PLAN", items: plan.map(x => ({ text: x, state: "open" })) }], stats: [{ label: "layers", value: n, state: "ok" }, { label: "plan length", value: plan.length, state: "ok" }, { label: "nogoods", value: nogood.reduce((s, x) => s + x.size, 0) }] });
    let st = P.init;
    plan.forEach((a, i) => {
      st = BW.apply(P.ops.find(o => o.name === a), st);
      steps.push({ caption: `Replay ${i + 1}/${plan.length}: ${a}`, blocks: Object.assign(BW.stacksFromState(P.blocks, st), { goal: P.goalDraw }), lists: [{ label: "PLAN", items: plan.map((x, k) => ({ text: x, state: k === i ? "open" : k < i ? "closed" : "plain" })) }] });
    });
    return { steps, result: { plan, levels: n, firstLevel: firstOK, planLayers, nogoods: nogood.reduce((s, x) => s + x.size, 0) } };
  },
});
