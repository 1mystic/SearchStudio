/* Forward chaining inference engine: match – resolve – execute. */
Studio.register({
  id: "rules-forward-chaining",
  name: "Forward chaining",
  family: "Rule-based systems",
  week: 10,
  problem: "rules",
  order: 10,
  summary: "Repeat the recognise–act cycle: match every rule against working memory to build the conflict set, choose one instantiation by a conflict-resolution strategy, fire it (add or remove facts), until no new instantiation remains.",
  pseudocode: `repeat
    MATCH:   conflict set ← every (rule, bindings) whose conditions hold in WM and that has not fired
    if the conflict set is empty: stop
    RESOLVE: pick one by the strategy (rule order, recency or specificity)
    EXECUTE: apply its actions to WM (add / remove facts); remember it fired (refractoriness)`,
  complexity: "Naive matching re-tests every rule against all of WM each cycle; Rete avoids this",
  learn: {
    "intro": "A rule-based system holds facts in working memory and knowledge as if–then rules. Forward chaining starts from the facts and keeps firing rules whose conditions match until nothing new can be derived.",
    "definition": "The recognise–act cycle: match all rules against working memory to form the conflict set of rule instantiations; resolve the conflict by choosing one (rule order, recency, specificity); execute its actions; repeat. A fired instantiation is not fired again (refractoriness).",
    "steps": [
      [
        "MATCH",
        "Find every way to bind each rule's variables to facts."
      ],
      [
        "RESOLVE",
        "Choose one instantiation by the strategy."
      ],
      [
        "EXECUTE",
        "Add or remove facts."
      ],
      [
        "stop when the conflict set is empty",
        ""
      ]
    ],
    "formulas": [
      {
        "f": "instantiation = (rule, variable bindings)",
        "read": "a rule with its ?variables filled in consistently",
        "why": "The same rule can fire several times with different bindings."
      }
    ],
    "why": "Data-driven reasoning, natural for monitoring and configuration. Naive matching repeats work each cycle; Rete removes that cost.",
    "traps": [
      "A variable must bind to the same value in every condition of a rule.",
      "Conflict resolution changes the order, not the final set of derived facts (for rules that only add)."
    ],
    "props": {
      "complete": "derives every consequence (add-only rules)",
      "optimal": "n/a",
      "time": "match cost per cycle",
      "space": "WM + conflict set"
    }
  },
  params: [{ key: "strategy", label: "Conflict resolution", type: "select", default: "order", options: [["order", "rule order (first rule listed)"], ["recency", "recency (newest facts first)"], ["specificity", "specificity (most conditions)"]] }],
  run(P, { strategy }) {
    const L = Studio.rulesLib, steps = [];
    let WM = P.facts0.map((f, i) => ({ f, t: i + 1 }));
    let clock = WM.length;
    const fired = new Set();
    const has = f => WM.find(w => w.f.join(" ") === f.join(" "));
    const instantiate = r => {
      let out = [{ b: {}, used: [] }];
      for (const c of r.conds) {
        const next = [];
        for (const inst of out) {
          if (c.neg) { if (!WM.some(w => L.match(c.pat, w.f, inst.b))) next.push(inst); continue; }
          WM.forEach(w => { const nb = L.match(c.pat, w.f, inst.b); if (nb) next.push({ b: nb, used: inst.used.concat([w.t]) }); });
        }
        out = next;
      }
      return out.map(o => ({ r, b: o.b, used: o.used, key: r.name + JSON.stringify(Object.entries(o.b).sort()) }));
    };
    const show = i => `${i.r.name} ${Object.entries(i.b).map(([k, v]) => k + "=" + v).join(" ")}`.trim();
    const wmList = (fresh = []) => [{ label: "WM", items: WM.map(w => ({ text: `${w.t}:${L.show(w.f)}`, state: fresh.includes(w.t) ? "open" : "plain" })) }];
    for (let cycle = 1; cycle <= 60; cycle++) {
      const cs = P.rulesP.flatMap(instantiate).filter(i => !fired.has(i.key));
      if (!cs.length) { steps.push({ caption: `Cycle ${cycle}: the conflict set is empty — stop. Working memory has ${WM.length} facts.`, lists: wmList(), stats: [{ label: "facts", value: WM.length, state: "ok" }] }); break; }
      const ranked = cs.slice().sort((a, b) => strategy === "recency" ? Math.max(...b.used, 0) - Math.max(...a.used, 0) || a.r.order - b.r.order
        : strategy === "specificity" ? b.r.conds.length - a.r.conds.length || a.r.order - b.r.order : a.r.order - b.r.order || Math.max(...b.used, 0) - Math.max(...a.used, 0));
      const pick = ranked[0];
      const table = { title: `conflict set (${strategy})`, columns: ["instantiation", "uses facts", "chosen"], rows: ranked.map(i => [show(i), i.used.join(","), i === pick ? "fire" : ""]), rowStates: ranked.map(i => (i === pick ? "cur" : "")) };
      steps.push({ caption: `Cycle ${cycle} — match: ${cs.length} instantiation${cs.length > 1 ? "s" : ""}; resolve: ${show(pick)}`, lists: wmList(), table, stats: [{ label: "cycle", value: cycle }, { label: "facts", value: WM.length }] });
      fired.add(pick.key);
      const fresh = [], changes = [];
      pick.r.acts.forEach(a => { const f = L.subst(a.pat, pick.b);
        if (a.op === "add") { if (!has(f)) { WM.push({ f, t: ++clock }); fresh.push(clock); changes.push("+" + L.show(f)); } }
        else { const k = has(f); if (k) { WM = WM.filter(w => w !== k); changes.push("−" + L.show(f)); } } });
      steps.push({ caption: `Cycle ${cycle} — execute ${pick.r.name}: ${changes.join(", ") || "no change (facts already present)"}`, lists: wmList(fresh), table, stats: [{ label: "cycle", value: cycle }, { label: "facts", value: WM.length }] });
    }
    return { steps, result: { facts: WM.map(w => L.show(w.f)), cycles: fired.size } };
  },
});
