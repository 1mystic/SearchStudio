/* Search Studio app: routing, theme, library, course map, learn pages, studio, pickers, player, exports. */
(function () {
  "use strict";
  const S = window.Studio, R = S.render, esc = R.esc;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const STORE = "search-studio.v1";

  /* ------------------------------------------------------------ course structure */
  const WEEKS = [
    [1, "Introduction and philosophy", "The Turing Test, the Winograd Schema Challenge, and where search sits in the landscape of AI. No algorithms to run: start with the About page."],
    [2, "State space search", "Search spaces and examples; depth first, breadth first and iterative deepening; their analysis."],
    [3, "Heuristic and local search", "Heuristic functions; solution space search (the TSP); escaping local optima; stochastic local search."],
    [4, "Population based methods", "Genetic algorithms, emergent systems and ant colony optimisation."],
    [5, "Finding optimal paths", "Uniform cost search, algorithm A* and the admissibility of A*."],
    [6, "Monotone condition and saving space", "The monotone condition; space saving versions of A*; sequence alignment."],
    [7, "Game playing", "Board games; Minimax, Alpha-Beta and SSS*."],
    [8, "Planning", "Domain independent planning: state-space planning, Goal Stack Planning, Partial Order Planning."],
    [9, "Problem decomposition", "Goal trees and AND–OR graphs; algorithm AO*."],
    [10, "Rule-based systems", "Pattern directed inference, the forward chaining engine and the Rete algorithm."],
    [11, "Constraint processing", "Backtracking, arc consistency, combining search and reasoning, the Waltz algorithm, model based diagnosis."],
  ];
  const FAMILY_ORDER = ["Graph search · uninformed", "Graph search · informed", "Graph search · optimal", "Graph search · space saving", "Sequence alignment",
    "TSP · exact", "TSP · constructive", "TSP · perturbation", "TSP · local search", "TSP · genetic", "TSP · swarm",
    "Game playing", "Planning", "Problem decomposition", "Rule-based systems", "Constraint processing"];
  const famRank = f => { const i = FAMILY_ORDER.indexOf(f); return i < 0 ? 99 : i; };
  S.algorithms.sort((a, b) => (a.week || 99) - (b.week || 99) || famRank(a.family) - famRank(b.family) || a.order - b.order);
  const POPULAR = ["search-bfs", "search-astar", "tsp-nearest-neighbour", "tsp-savings", "tsp-sa", "tsp-ga", "game-alpha-beta", "plan-gsp", "andor-ao-star", "rules-rete", "csp-ac3", "csp-waltz"];
  const weekTitle = n => (WEEKS[n - 1] ? WEEKS[n - 1][1] : "Other");

  /* ------------------------------------------------------------ persistence (per viewer) */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } },
    set(patch) { try { localStorage.setItem(STORE, JSON.stringify(Object.assign(store.get(), patch))); } catch (e) { /* storage unavailable */ } },
  };

  /* ------------------------------------------------------------ theme */
  const themeBtn = $("#theme-btn");
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeBtn.textContent = t === "light" ? "◐ Dark" : "◑ Light";
    themeBtn.setAttribute("aria-label", t === "light" ? "Switch to dark theme" : "Switch to light theme");
  }
  applyTheme(store.get().theme || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  themeBtn.addEventListener("click", () => { const t = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light"; applyTheme(t); store.set({ theme: t }); });
  $("#menu-btn").addEventListener("click", () => { const n = $("#nav"); n.classList.toggle("open"); $("#menu-btn").setAttribute("aria-expanded", n.classList.contains("open")); });

  /* ------------------------------------------------------------ problems */
  const mine = () => store.get().mine || [];
  let generated = null;
  const allProblems = () => S.examples.concat(mine(), generated ? [generated] : []);
  const findProblem = id => allProblems().find(p => p.id === id);
  const typeLabel = t => (S.types[t] ? S.types[t].label : t);
  const WEIGHTED = ["search-ucs", "search-astar", "search-best-first", "search-ida-star", "search-rbfs", "search-dcfs", "search-monotone-check", "search-hill-climbing", "search-beam"];
  function defaultProblemFor(algo) {
    if (algo.defaultExample && findProblem(algo.defaultExample)) return algo.defaultExample;
    if (algo.problem === "tsp") return "tsp-six-cities";
    if (algo.problem === "graph") return WEIGHTED.includes(algo.id) ? "graph-weighted" : "graph-g1";
    const ex = S.examples.find(e => e.type === algo.problem);
    return ex ? ex.id : null;
  }
  const describe = p => (p.note || (S.types[p.type] && S.types[p.type].describe ? S.types[p.type].describe(p) : ""));
  const ordered = () => S.algorithms.slice();
  const algoIndex = id => ordered().findIndex(a => a.id === id);
  const fileOf = a => (S.files && S.files[a.id]) || `algorithms/${a.id}.js`;

  /* ------------------------------------------------------------ router */
  const pages = $$(".page");
  let current = "";
  function route() {
    const h = (location.hash || "#home").slice(1);
    let page = h, algoId = null;
    if (h.startsWith("algo-")) { page = "learn"; algoId = h.slice(5); }
    if (h.startsWith("try-")) { page = "studio"; algoId = h.slice(4); }
    if (h.startsWith("week-")) page = "course";
    if (!pages.some(p => p.dataset.page === page)) page = "home";
    pages.forEach(p => (p.hidden = p.dataset.page !== page));
    const navKey = page === "learn" ? "library" : page;
    $$("#nav a").forEach(a => (a.getAttribute("href") === "#" + navKey ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    $("#nav").classList.remove("open");
    if (page !== "home") demo.stop();
    if (page === "home") renderHome();
    if (page === "library") renderLibrary();
    if (page === "course") renderCourse(h.startsWith("week-") ? Number(h.slice(5)) : null);
    if (page === "learn") renderLearn(algoId);
    if (page === "studio") openStudio(algoId);
    if (current !== h && !h.startsWith("week-")) window.scrollTo(0, 0);
    current = h;
    const a = algoId && S.get(algoId);
    document.title = (a ? a.name + " · " : { library: "Learn · ", course: "Course map · ", studio: "Studio · ", guide: "Guide · ", about: "About · ", contribute: "Contribute · " }[page] || "") + "Search Studio";
  }
  window.addEventListener("hashchange", route);

  /* ------------------------------------------------------------ picker modal */
  const modal = { el: $("#modal"), onPick: null, items: [], groupings: {}, mode: null, active: 0, last: null, cur: null };
  function openPicker({ title, items, groupings, onPick, foot, current: cur }) {
    Object.assign(modal, { onPick, items, groupings, mode: Object.keys(groupings)[0], cur, last: document.activeElement });
    $("#modal-title").textContent = title;
    const keys = Object.keys(groupings);
    $("#modal-seg").innerHTML = keys.length > 1 ? keys.map(k => `<button type="button" role="tab" data-mode="${esc(k)}" aria-selected="${k === modal.mode}">${esc(k)}</button>`).join("") : "";
    $$("#modal-seg button").forEach(b => b.addEventListener("click", () => { modal.mode = b.dataset.mode; $$("#modal-seg button").forEach(x => x.setAttribute("aria-selected", x === b)); drawPicker(); }));
    $("#modal-foot").innerHTML = foot || `<span><kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> choose · <kbd>Esc</kbd> close</span>`;
    $("#modal-search").value = "";
    modal.el.hidden = false; document.body.classList.add("modal-open");
    drawPicker();
    setTimeout(() => $("#modal-search").focus(), 30);
  }
  function drawPicker() {
    const q = $("#modal-search").value.trim().toLowerCase();
    const list = modal.items.filter(it => !q || it.search.includes(q));
    const groupOf = modal.groupings[modal.mode];
    const groups = new Map();
    list.forEach(it => { const g = groupOf(it); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(it); });
    $("#modal-list").innerHTML = [...groups].map(([g, its]) => `<div class="mg"><div class="mg-h">${esc(g)}</div>${its.map(it => `<button type="button" class="mi${it.id === modal.cur ? " cur" : ""}" role="option" data-id="${esc(it.id)}"><span class="mi-t">${esc(it.title)}</span><span class="mi-m">${esc(it.meta || "")}</span>${it.desc ? `<span class="mi-d">${esc(it.desc)}</span>` : ""}</button>`).join("")}</div>`).join("") || `<p class="note">Nothing matches “${esc(q)}”.</p>`;
    $$("#modal-list .mi").forEach(b => b.addEventListener("click", () => choose(b.dataset.id)));
    const all = $$("#modal-list .mi");
    modal.active = Math.max(0, q ? 0 : all.findIndex(b => b.classList.contains("cur"))); highlight();
  }
  function highlight() { const all = $$("#modal-list .mi"); all.forEach((b, i) => b.classList.toggle("active", i === modal.active)); const a = all[modal.active]; if (a) a.scrollIntoView({ block: "nearest" }); }
  function choose(id) { closePicker(); if (modal.onPick) modal.onPick(id); }
  function closePicker() { modal.el.hidden = true; document.body.classList.remove("modal-open"); if (modal.last && modal.last.focus) modal.last.focus(); }
  $("#modal-search").addEventListener("input", drawPicker);
  $("#modal-close").addEventListener("click", closePicker);
  modal.el.addEventListener("click", e => { if (e.target === modal.el) closePicker(); });
  modal.el.addEventListener("keydown", e => {
    const all = $$("#modal-list .mi");
    if (e.key === "Escape") { e.preventDefault(); closePicker(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); modal.active = Math.min(all.length - 1, modal.active + 1); highlight(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); modal.active = Math.max(0, modal.active - 1); highlight(); }
    else if (e.key === "Enter" && all[modal.active] && e.target.id === "modal-search") { e.preventDefault(); choose(all[modal.active].dataset.id); }
    else if (e.key === "Tab") {
      const f = $$("button, input", modal.el).filter(x => x.offsetParent);
      if (f.length) { const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    }
  });
  const algoItems = () => ordered().map(a => ({ id: a.id, title: a.name, meta: `W${a.week} · ${a.family}`, desc: a.summary, search: (a.name + " " + a.family + " week " + a.week + " " + (a.summary || "")).toLowerCase(), a }));
  const algoGroupings = { "By week": it => `Week ${it.a.week} · ${weekTitle(it.a.week)}`, "By family": it => it.a.family, "By problem": it => typeLabel(it.a.problem) };
  function pickAlgorithm(onPick, cur) { openPicker({ title: "Choose an algorithm", items: algoItems(), groupings: algoGroupings, onPick, current: cur }); }
  $("#find-btn").addEventListener("click", () => pickAlgorithm(id => (location.hash = "algo-" + id)));
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !e.target.closest("input,textarea,select,[contenteditable]") && modal.el.hidden) { e.preventDefault(); pickAlgorithm(id => (location.hash = (current.startsWith("try-") || current === "studio" ? "try-" : "algo-") + id)); }
  });

  /* ------------------------------------------------------------ home */
  const demo = {
    timer: null, i: 0, run: null,
    start() {
      const el = $("#demo-stage"); if (!el) return;
      try { if (!this.run) this.run = S.run(S.get("tsp-nearest-neighbour"), S.examples.find(e => e.id === "tsp-six-cities"), { start: "A" }); } catch (e) { return; }
      const draw = () => { const s = this.run.steps[this.i]; el.innerHTML = `<div class="demo-inner">${R.graphSVG(this.run.P, s)}<p class="st-cap">${esc(s.caption)}</p></div>`; };
      this.stop();
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { this.i = this.run.steps.length - 1; draw(); return; }
      const tick = () => { draw(); const last = this.i === this.run.steps.length - 1; this.i = last ? 0 : this.i + 1; this.timer = setTimeout(tick, last ? 3200 : 1300); };
      tick();
    },
    stop() { clearTimeout(this.timer); this.timer = null; },
  };
  function renderHome() {
    const q = $("#home-quick");
    if (q && !q.dataset.ready) {
      q.dataset.ready = "1";
      q.innerHTML = POPULAR.map(id => S.get(id)).filter(Boolean).map(a => `<a class="chip" href="#algo-${esc(a.id)}"><span>W${a.week}</span>${esc(a.name)}</a>`).join("") + `<a class="chip more" href="#course">All ${S.algorithms.length} by week →</a>`;
    }
    demo.start();
  }

  /* ------------------------------------------------------------ library */
  let libFilter = "", libMode = "week";
  function renderLibrary() {
    const root = $("#page-library");
    if (!root.dataset.ready) {
      root.innerHTML = `<div class="page-head"><div><p class="eyebrow">Learn</p><h1>Algorithm library</h1><p class="lede">${S.algorithms.length} algorithms. Each has a beginner introduction, line-by-line pseudocode, formulas with reasons, and a studio run.</p></div>
        <div class="lib-tools"><input id="lib-search" class="search" type="search" placeholder="Filter by name, family or week" aria-label="Filter algorithms">
        <div class="seg" role="tablist" aria-label="Group by"><button type="button" data-m="week" aria-selected="true">By week</button><button type="button" data-m="family" aria-selected="false">By family</button></div></div></div><div id="lib-list"></div>`;
      root.dataset.ready = "1";
      $("#lib-search").addEventListener("input", e => { libFilter = e.target.value; drawLib(); });
      $$(".seg button", root).forEach(b => b.addEventListener("click", () => { libMode = b.dataset.m; $$(".seg button", root).forEach(x => x.setAttribute("aria-selected", x === b)); drawLib(); }));
    }
    $("#lib-search").value = libFilter;
    drawLib();
  }
  const card = a => {
    const p = (a.learn && a.learn.props) || {};
    return `<article class="card"><div class="card-top"><span class="tag">W${a.week} · ${esc(typeLabel(a.problem))}</span>${p.optimal ? `<span class="tag ${/^yes/.test(p.optimal) ? "ok" : ""}">optimal: ${esc(p.optimal)}</span>` : ""}</div>
      <h3><a href="#algo-${esc(a.id)}">${esc(a.name)}</a></h3><p>${esc(a.summary || "")}</p>
      <div class="row"><a class="btn small" href="#algo-${esc(a.id)}">Learn</a><a class="btn small primary" href="#try-${esc(a.id)}">Try it</a></div></article>`;
  };
  function drawLib() {
    const q = libFilter.trim().toLowerCase();
    let groups = new Map();
    ordered().filter(a => !q || (a.name + " " + a.family + " week " + a.week + " " + (a.summary || "")).toLowerCase().includes(q)).forEach(a => {
      const g = libMode === "week" ? `Week ${a.week} · ${weekTitle(a.week)}` : a.family;
      if (!groups.has(g)) groups.set(g, []); groups.get(g).push(a);
    });
    if (libMode === "family") groups = new Map([...groups].sort((x, y) => famRank(x[0]) - famRank(y[0])));
    $("#lib-list").innerHTML = [...groups].map(([g, list]) => `<h2 class="lib-fam">${esc(g)} <small>${list.length}</small></h2><div class="cards">${list.map(card).join("")}</div>`).join("") || `<p class="note">No algorithm matches “${esc(libFilter)}”.</p>`;
  }

  /* ------------------------------------------------------------ course map */
  function renderCourse(week) {
    const root = $("#page-course");
    if (!root.dataset.ready) {
      root.dataset.ready = "1";
      root.innerHTML = `<div class="page-head"><div><p class="eyebrow">Course map</p><h1>AI: Search Methods for Problem Solving</h1><p class="lede">Eleven weeks, ${S.algorithms.length} runnable algorithms. Each week lists what it covers; every algorithm links to its learn page and a studio run.</p></div></div>
      <ol class="weeks">${WEEKS.map(([n, t, d]) => {
        const al = ordered().filter(a => a.week === n);
        return `<li class="week" id="week-${n}"><div class="wk-n">${String(n).padStart(2, "0")}</div><div class="wk-b"><h2>${esc(t)}</h2><p>${esc(d)}</p>
        ${al.length ? `<div class="wk-list">${al.map(a => `<div class="wk-a"><a href="#algo-${esc(a.id)}">${esc(a.name)}</a><span class="tag">${esc(a.family)}</span><a class="chip-link" href="#try-${esc(a.id)}">Try</a></div>`).join("")}</div>` : `<p class="tag">No algorithms to run this week. <a href="#about">About the course</a></p>`}</div></li>`;
      }).join("")}</ol>`;
    }
    if (week) setTimeout(() => { const el = $("#week-" + week); if (el) el.scrollIntoView({ block: "start" }); }, 30);
  }

  /* ------------------------------------------------------------ learn page */
  function renderLearn(id) {
    const a = S.get(id), root = $("#page-learn");
    if (!a) { root.innerHTML = `<div class="prose"><h1>Not found</h1><p>No algorithm called “${esc(id)}”. <a href="#library">Back to the library</a>.</p></div>`; return; }
    const L = a.learn || {}, props = L.props || {};
    const ex = findProblem(defaultProblemFor(a));
    const list = ordered(), i = algoIndex(id), prev = list[i - 1], next = list[i + 1];
    const parts = fileOf(a).split("/");
    const crumbs = parts.map((p, k) => k === parts.length - 1 ? `<span class="fc-file">${esc(p)}</span>` : k === 0 ? `<a class="fc-dir" href="#library">${esc(p)}</a>` : `<span class="fc-dir">${esc(p)}</span>`).join('<span class="fc-sep">/</span>');
    const pager = cls => `<nav class="pager ${cls}" aria-label="Previous and next algorithm">${prev ? `<a class="pg prev" href="#algo-${esc(prev.id)}"><span>← Previous</span><b>${esc(prev.name)}</b></a>` : `<span class="pg empty"></span>`}<span class="pg-pos">${i + 1} / ${list.length}</span>${next ? `<a class="pg next" href="#algo-${esc(next.id)}"><span>Next →</span><b>${esc(next.name)}</b></a>` : `<span class="pg empty"></span>`}</nav>`;
    const siblings = list.filter(b => b.family === a.family);
    const sameWeek = list.filter(b => b.week === a.week && b.family !== a.family);
    root.innerHTML = `<article class="learn">
      <div class="filebar"><div class="filecrumb" aria-label="Source file"><span class="fc-ic" aria-hidden="true">▤</span>${crumbs}</div>${pager("top")}</div>
      <div class="learn-grid">
        <aside class="tree" aria-label="Related algorithms"><p class="tree-h">${esc(a.family)}</p><ul>${siblings.map(b => `<li${b.id === a.id ? ' class="on"' : ""}><a href="#algo-${esc(b.id)}"${b.id === a.id ? ' aria-current="page"' : ""}><code>${esc(fileOf(b).split("/").pop())}</code><span>${esc(b.name)}</span></a></li>`).join("")}</ul>
          ${sameWeek.length ? `<p class="tree-h">Also in week ${a.week}</p><ul>${sameWeek.map(b => `<li><a href="#algo-${esc(b.id)}"><code>${esc(fileOf(b).split("/").pop())}</code><span>${esc(b.name)}</span></a></li>`).join("")}</ul>` : ""}</aside>
        <div class="learn-body">
          <div class="learn-head"><div><p class="eyebrow"><a href="#week-${a.week}">Week ${a.week}</a> · ${esc(a.family)}</p><h1>${esc(a.name)}</h1></div>
            <a class="btn primary" href="#try-${esc(a.id)}">Try it${ex ? " on " + esc(ex.name) : ""}</a></div>
          <p class="intro">${esc(L.intro || a.summary || "")}</p>
          ${L.definition ? `<h2><small>01</small>Definition</h2><p>${esc(L.definition)}</p>` : ""}
          <h2><small>02</small>Pseudocode</h2><pre>${esc(a.pseudocode || "")}</pre>
          ${L.steps && L.steps.length ? `<h2><small>03</small>Line by line</h2><div class="tbl-plain"><table class="steps-tbl"><tbody>${L.steps.map(([l, w]) => `<tr><td>${esc(l)}</td><td>${esc(w)}</td></tr>`).join("")}</tbody></table></div>` : ""}
          ${L.formulas && L.formulas.length ? `<h2><small>04</small>Formulas and why they hold</h2>${L.formulas.map(f => `<div class="formula"><div class="f">${esc(f.f)}</div><p class="read">${esc(f.read)}</p><p class="why">${esc(f.why)}</p></div>`).join("")}` : ""}
          ${L.why ? `<h2><small>05</small>Why it works, and when it does not</h2><p>${esc(L.why)}</p>` : ""}
          <h2><small>06</small>Properties</h2><div class="props">
            <div class="prop"><span>complete</span>${esc(props.complete || "–")}</div><div class="prop"><span>optimal</span>${esc(props.optimal || "–")}</div>
            <div class="prop"><span>time</span>${esc(props.time || a.complexity || "–")}</div><div class="prop"><span>space</span>${esc(props.space || "–")}</div></div>
          ${L.traps && L.traps.length ? `<h2><small>07</small>Traps</h2><ul class="traps">${L.traps.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          <div class="learn-end"><a class="btn primary" href="#try-${esc(a.id)}">Try it in the studio</a></div>
          ${pager("bottom")}
        </div>
      </div>
    </article>`;
  }

  /* ------------------------------------------------------------ studio */
  const st = { algoId: null, problemId: null, params: {}, run: null, i: 0, timer: null, speed: 1.2 };
  let studioReady = false;
  function openStudio(algoId) {
    if (!studioReady) initStudio();
    const prefs = store.get();
    if (algoId && S.get(algoId)) { const a = S.get(algoId), cur = findProblem(st.problemId); if (st.algoId !== algoId) st.params = {}; st.algoId = algoId; if (!cur || cur.type !== a.problem) st.problemId = defaultProblemFor(a); }
    if (!st.algoId) st.algoId = prefs.algo && S.get(prefs.algo) ? prefs.algo : "tsp-nearest-neighbour";
    const A = S.get(st.algoId);
    if (!st.problemId || !findProblem(st.problemId) || findProblem(st.problemId).type !== A.problem) {
      const p = prefs.problem && findProblem(prefs.problem);
      st.problemId = p && p.type === A.problem ? p.id : defaultProblemFor(A);
    }
    refresh();
  }
  function setAlgo(id) {
    const a = S.get(id); st.algoId = id; st.params = {};
    const p = findProblem(st.problemId);
    if (!p || p.type !== a.problem) { st.problemId = defaultProblemFor(a); msg(`Loaded “${findProblem(st.problemId).name}”: ${a.name} works on ${(S.types[a.problem] && S.types[a.problem].plural) || typeLabel(a.problem)}.`, "ok"); } else msg("");
    if (location.hash !== "#try-" + id) history.replaceState(null, "", "#try-" + id), (current = "try-" + id);
    refresh();
  }
  function setProblem(id) {
    const p = findProblem(id); st.problemId = id;
    const a = S.get(st.algoId);
    if (a.problem !== p.type) { const alt = ordered().find(x => x.problem === p.type); st.algoId = alt.id; st.params = {}; msg(`Switched to ${alt.name}: ${a.name} does not work on ${typeLabel(p.type)} problems.`, "ok"); } else msg("");
    refresh();
  }
  function refresh() { fillPickers(); buildParams(); runNow(); }
  function initStudio() {
    studioReady = true;
    $("#pick-algo").addEventListener("click", () => pickAlgorithm(setAlgo, st.algoId));
    $("#pick-problem").addEventListener("click", () => {
      const a = S.get(st.algoId);
      const kindOf = p => (p.id.startsWith("mine-") ? "My problems" : p.generated ? "Generated" : "Examples");
      const items = allProblems().map(p => ({ id: p.id, title: p.name, meta: typeLabel(p.type) + (p.type === a.problem ? "" : " · switches algorithm"), desc: describe(p), search: (p.name + " " + p.type + " " + describe(p)).toLowerCase(), p }));
      items.sort((x, y) => (x.p.type === a.problem ? 0 : 1) - (y.p.type === a.problem ? 0 : 1));
      openPicker({ title: "Choose a problem", items, current: st.problemId, onPick: setProblem,
        groupings: { "Fits this algorithm": it => (it.p.type === a.problem ? kindOf(it.p) : "Other problem types (switches algorithm)"), "By type": it => typeLabel(it.p.type) },
        foot: `<span>Need another? Use <b>Random</b>, <b>Edit</b> or <b>Import</b> under the problem card.</span>` });
    });
    $$("[data-tab-open]").forEach(b => b.addEventListener("click", () => { openTab(b.dataset.tabOpen); const t = $(".tabs"); if (t) t.scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
    const panels = { random: $("#panel-random"), edit: $("#panel-edit"), import: $("#panel-import") };
    const buttons = { random: $("#btn-random"), edit: $("#btn-edit"), import: $("#btn-import") };
    const toggle = which => Object.entries(panels).forEach(([k, el]) => { el.hidden = k !== which || !el.hidden; buttons[k].setAttribute("aria-expanded", String(!el.hidden)); buttons[k].classList.toggle("on", !el.hidden); });
    $("#btn-random").addEventListener("click", () => { toggle("random"); if (!panels.random.hidden) fillRandom(); });
    $("#btn-edit").addEventListener("click", () => { toggle("edit"); if (!panels.edit.hidden) fillEditor(); });
    $("#btn-import").addEventListener("click", () => toggle("import"));
    $("#rnd-go").addEventListener("click", () => {
      const kind = $("#rnd-kind").value, G = S.types[kind].generator, opts = { seed: Number($("#rnd-seed").value) || 1 };
      G.params.forEach(q => { const v = Number($("#rnd-" + q.key).value); opts[q.key] = Math.max(q.min ?? 1, Math.min(q.max ?? 99, Number.isFinite(v) && v ? v : q.default)); });
      try {
        generated = G.make(opts); generated.generated = Object.assign({ kind }, opts);
        S.validateProblem(generated);
        st.problemId = generated.id;
        const a = S.get(st.algoId); if (a.problem !== kind) { st.algoId = ordered().find(x => x.problem === kind).id; st.params = {}; }
        refresh(); msg(`Generated ${generated.name}.`, "ok");
      } catch (e) { msg(e.message, "err"); }
    });
    $("#rnd-seed-new").addEventListener("click", () => { $("#rnd-seed").value = 1 + Math.floor(Math.random() * 9999); });
    $("#edit-save").addEventListener("click", () => {
      const base = findProblem(st.problemId), T = S.types[base.type] || {};
      try {
        const name = $("#edit-name").value.trim() || "My problem";
        const txt = $("#edit-text").value;
        const p = T.fromText && !/^\s*\{/.test(txt) ? T.fromText(txt, Object.assign({}, base, { name })) : Object.assign(JSON.parse(txt), { type: base.type });
        p.id = base.id.startsWith("mine-") ? base.id : "mine-" + Date.now().toString(36);
        p.name = name; p.note = "Saved in this browser."; delete p.generated;
        S.validateProblem(p); S.prepare(p);
        store.set({ mine: mine().filter(x => x.id !== p.id).concat([p]) });
        st.problemId = p.id; toggle(null);
        refresh(); msg(`Saved “${p.name}” under My problems.`, "ok");
      } catch (e) { msg(e.message, "err"); }
    });
    $("#edit-delete").addEventListener("click", () => {
      const p = findProblem(st.problemId); if (!p || !p.id.startsWith("mine-")) return;
      store.set({ mine: mine().filter(x => x.id !== p.id) });
      st.problemId = defaultProblemFor(S.get(st.algoId)); toggle(null);
      refresh(); msg(`Deleted “${p.name}”.`, "ok");
    });
    $("#imp-file").addEventListener("change", e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $("#imp-text").value = r.result; }; r.readAsText(f); });
    $("#imp-go").addEventListener("click", () => {
      try {
        const p = JSON.parse($("#imp-text").value);
        p.id = "mine-" + Date.now().toString(36); p.name = p.name || "Imported problem"; delete p.generated;
        S.validateProblem(p); S.prepare(p);
        store.set({ mine: mine().concat([p]) });
        toggle(null); setProblem(p.id); msg(`Imported “${p.name}”.`, "ok");
      } catch (e) { msg("That is not a valid problem: " + e.message, "err"); }
    });
    $("#p-first").addEventListener("click", () => go(0));
    $("#p-prev").addEventListener("click", () => go(st.i - 1));
    $("#p-next").addEventListener("click", () => go(st.i + 1));
    $("#p-last").addEventListener("click", () => go(Infinity));
    $("#p-play").addEventListener("click", () => (st.timer ? pause() : play()));
    $("#p-range").addEventListener("input", e => go(Number(e.target.value)));
    $("#p-speed").addEventListener("change", e => { st.speed = Number(e.target.value); });
    document.addEventListener("keydown", e => {
      if ($('[data-page="studio"]').hidden || !modal.el.hidden || e.target.closest("input,select,textarea,button,[contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(st.i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(st.i - 1); }
      else if (e.key === " ") { e.preventDefault(); st.timer ? pause() : play(); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(Infinity); }
    });
    $$(".tabs button").forEach(b => b.addEventListener("click", () => openTab(b.dataset.tab)));
    $("#x-print").addEventListener("click", () => download(fileBase() + "-trace.html", printableHTML(), "text/html"));
    $("#x-json").addEventListener("click", () => download(fileBase() + "-trace.json", JSON.stringify(traceJSON(), null, 1), "application/json"));
    $("#x-csv").addEventListener("click", () => download(fileBase() + "-trace.csv", traceCSV(), "text/csv"));
    $("#x-svg").addEventListener("click", () => download(fileBase() + `-step-${st.i + 1}.svg`, stepSVG(), "image/svg+xml"));
    $("#x-problem").addEventListener("click", () => { const p = findProblem(st.problemId); const c = Object.assign({}, p); delete c.generated; download((p.id || "problem") + ".json", JSON.stringify(c, null, 1), "application/json"); });
    // The artifact viewer cannot open the print dialog; the downloadable trace covers printing there.
    const inViewer = window.top !== window.self;
    if (inViewer) $("#x-print-now").hidden = true;
    else $("#x-print-now").addEventListener("click", () => window.print());
  }
  function openTab(id) { $$(".tabs button").forEach(x => x.setAttribute("aria-selected", x.dataset.tab === id ? "true" : "false")); $$(".tabpanel").forEach(p => (p.hidden = p.id !== id)); }
  function msg(text, kind) { const m = $("#problem-msg"); m.textContent = text || ""; m.className = "msg " + (kind || ""); }
  function fillRandom() {
    const kinds = Object.values(S.types).filter(t => t.generator);
    const cur = findProblem(st.problemId).type;
    const draw = kind => {
      const G = S.types[kind].generator;
      $("#rnd-fields").innerHTML = `<div class="field"><label for="rnd-kind">Kind</label><select id="rnd-kind" class="inp">${kinds.map(k => `<option value="${esc(k.type)}"${k.type === kind ? " selected" : ""}>${esc(k.label)}</option>`).join("")}</select></div>` +
        G.params.map(q => `<div class="field"><label for="rnd-${esc(q.key)}">${esc(q.label)}</label><input id="rnd-${esc(q.key)}" class="inp" type="number" min="${q.min ?? 1}" max="${q.max ?? 99}" value="${q.default}"></div>`).join("");
      $("#rnd-kind").addEventListener("change", e => draw(e.target.value));
    };
    draw(kinds.some(k => k.type === cur) ? cur : kinds[0].type);
  }
  function fillPickers() {
    const a = S.get(st.algoId), p = findProblem(st.problemId);
    $("#pick-algo-name").textContent = a.name;
    $("#pick-algo-sub").textContent = `Week ${a.week} · ${a.family}`;
    $("#learn-link").href = "#algo-" + a.id;
    $("#pick-problem-name").textContent = p.name;
    const dsc = describe(p); $("#problem-note").textContent = dsc && dsc.toLowerCase().startsWith(typeLabel(p.type).toLowerCase()) ? dsc : `${typeLabel(p.type)}${dsc ? " · " + dsc : ""}`;
    $("#edit-delete").hidden = !p.id.startsWith("mine-");
    if (!$("#panel-edit").hidden) fillEditor();
    if (!$("#panel-random").hidden && $("#rnd-kind") && $("#rnd-kind").value !== p.type && S.types[p.type] && S.types[p.type].generator) fillRandom();
    store.set({ algo: st.algoId, problem: p.generated ? null : p.id });
  }
  function fillEditor() {
    const p = findProblem(st.problemId), T = S.types[p.type] || {};
    $("#edit-name").value = p.id.startsWith("mine-") ? p.name : p.name + " (copy)";
    const clean = Object.assign({}, p); delete clean.generated;
    $("#edit-text").value = T.toText ? T.toText(p) : JSON.stringify(clean, null, 1);
    $("#edit-help").textContent = T.help || "Edit the JSON.";
  }
  function buildParams() {
    const a = S.get(st.algoId), form = $("#params");
    let P;
    try { P = S.prepare(findProblem(st.problemId)); } catch (e) { form.innerHTML = ""; return; }
    if (!a.params.length) { form.innerHTML = `<p class="problem-note">No settings for this algorithm.</p>`; return; }
    const vals = S.paramsFor(a, P, st.params);
    form.innerHTML = a.params.map(p => {
      const id = "prm-" + p.key, v = vals[p.key];
      let input;
      if (p.type === "city" || p.type === "node") input = `<select class="inp" id="${id}" name="${p.key}">${P.ids.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
      else if (p.type === "select") {
        const known = p.options.some(o => o[0] === v);
        input = `<select class="inp" id="${id}" name="${p.key}">${p.options.map(([k, l]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>` +
          (p.allowText ? `<input class="inp" id="${id}-txt" name="${p.key}__txt" aria-label="${esc(p.label)} as text" placeholder="or type a tour, e.g. ${esc(P.ids.join(","))}" value="${known ? "" : esc(v)}">` : "");
      }
      else if (p.type === "int" || p.type === "number") input = `<input class="inp" id="${id}" name="${p.key}" type="number" step="${p.type === "int" ? 1 : "any"}"${p.min !== undefined ? ` min="${p.min}"` : ""}${p.max !== undefined ? ` max="${p.max}"` : ""} value="${esc(v)}">`;
      else input = `<input class="inp" id="${id}" name="${p.key}" value="${esc(v)}">`;
      const wide = p.type === "select" || p.type === "text" || p.allowText;
      return `<div class="field${wide ? " wide" : ""}"><label for="${id}">${esc(p.label)}</label>${input}${p.help ? `<span class="help">${esc(p.help)}</span>` : ""}</div>`;
    }).join("");
    let t = null;
    form.oninput = form.onchange = e => {
      clearTimeout(t);
      t = setTimeout(() => {
        const out = {};
        a.params.forEach(p => { const el = form.elements[p.key]; if (!el) return; const txt = form.elements[p.key + "__txt"]; out[p.key] = txt && txt.value.trim() ? txt.value.trim() : el.value; });
        st.params = out; runNow(true);
      }, e && e.type === "input" && e.target.tagName !== "SELECT" ? 350 : 0);
    };
  }
  function runNow(keepStep) {
    pause();
    const a = S.get(st.algoId), p = findProblem(st.problemId);
    $("#stage-h1").textContent = a.name;
    $("#stage-sub").textContent = `on ${p.name}`;
    try {
      const prev = st.run ? st.i : 0;
      st.run = S.run(a, p, st.params);
      st.i = keepStep ? Math.min(prev, st.run.steps.length - 1) : 0;
      $("#p-range").max = st.run.steps.length - 1;
      $$(".player button, #p-range").forEach(b => (b.disabled = false));
      $("#tab-pseudo-pre").textContent = a.pseudocode || "";
      $("#trace-list").innerHTML = st.run.steps.map((s, i) => `<li data-i="${i}"><span>${i + 1}</span>${esc(s.caption)}</li>`).join("");
      $$("#trace-list li").forEach(li => li.addEventListener("click", () => go(Number(li.dataset.i))));
      draw();
    } catch (e) {
      st.run = null;
      $("#stage").innerHTML = `<div class="err-box">${esc(e.message)}</div>`;
      $("#p-count").textContent = "–";
      $$(".player button, #p-range").forEach(b => (b.disabled = true));
      $("#trace-list").innerHTML = "";
    }
  }
  function draw() {
    if (!st.run) return;
    const s = st.run.steps[st.i], stage = $("#stage");
    const keep = $(".tscroll", stage) ? $(".tscroll", stage).scrollTop : 0;
    stage.innerHTML = R.stageHTML(st.run.P, s, { title: S.get(st.algoId).name, showH: st.run.P.type === "graph" && /best|astar|hill|beam|ida|rbfs|dcfs|monotone/.test(st.algoId) });
    const sc = $(".tscroll", stage);
    if (sc) { sc.scrollTop = keep; const cur = $("tr.cur", sc) || $("tbody tr:last-child", sc); if (cur && (cur.offsetTop < sc.scrollTop + 30 || cur.offsetTop > sc.scrollTop + sc.clientHeight - 30)) sc.scrollTop = Math.max(0, cur.offsetTop - sc.clientHeight / 2); }
    $("#p-range").value = st.i;
    $("#p-count").textContent = `${st.i + 1} / ${st.run.steps.length}`;
    $$("#trace-list li").forEach(li => li.classList.toggle("on", Number(li.dataset.i) === st.i));
    const on = $("#trace-list li.on"), list = $("#trace-list");
    if (on && list && !list.closest("[hidden]") && (on.offsetTop < list.scrollTop || on.offsetTop > list.scrollTop + list.clientHeight - 30)) list.scrollTop = on.offsetTop - 40;
  }
  function go(i) { if (!st.run) return; st.i = Math.max(0, Math.min(st.run.steps.length - 1, i)); draw(); if (st.i === st.run.steps.length - 1) pause(); }
  function play() {
    if (!st.run) return;
    if (st.i >= st.run.steps.length - 1) st.i = 0;
    $("#p-play").textContent = "❚❚ Pause"; $("#p-play").setAttribute("aria-label", "Pause");
    const tick = () => { draw(); if (st.i >= st.run.steps.length - 1) { pause(); return; } st.timer = setTimeout(() => { st.i++; tick(); }, st.speed * 1000); };
    clearTimeout(st.timer); st.timer = setTimeout(() => { st.i++; tick(); }, st.speed * 1000); draw();
  }
  function pause() { clearTimeout(st.timer); st.timer = null; const b = $("#p-play"); if (b) { b.textContent = "▶ Play"; b.setAttribute("aria-label", "Play"); } }

  /* ------------------------------------------------------------ exports */
  const fileBase = () => (st.algoId + "-" + st.problemId).replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  function traceJSON() { const a = S.get(st.algoId), p = findProblem(st.problemId); return { generator: "Search Studio", algorithm: { id: a.id, name: a.name }, problem: p, params: st.run.params, result: st.run.result, steps: st.run.steps }; }
  function traceCSV() {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["step", "caption", "stats", "lists"].map(q).join(",")];
    st.run.steps.forEach((s, i) => rows.push([i + 1, s.caption, (s.stats || []).map(x => `${x.label}=${x.value}`).join("; "), (s.lists || []).map(l => `${l.label}: ${l.items.map(x => x.text).join(" ")}`).join(" | ")].map(q).join(",")));
    return rows.join("\n");
  }
  function cssVars() { const cs = getComputedStyle(document.documentElement); return ["--bg", "--panel", "--panel-2", "--ink", "--muted", "--dim", "--rule", "--node", "--ring", "--edge-faint", "--orange", "--orange-fill", "--green", "--green-fill", "--red", "--blue", "--violet", "--yellow", "--serif", "--mono"].map(v => `${v}:${cs.getPropertyValue(v).trim()}`).join(";"); }
  function stepSVG() {
    const s = st.run.steps[st.i];
    const svg = s.blocks ? R.blocksSVG(s.blocks) : R.graphSVG(st.run.P, s, { label: S.get(st.algoId).name });
    const rules = (S.CSS || "").split("\n").filter(l => /^svg\.g/.test(l.trim())).join("\n");
    return svg.replace(/(<svg[^>]*>)/, m => `${m}<style>svg{${cssVars()}} ${rules}</style><rect width="100%" height="100%" style="fill:var(--panel)"/>`);
  }
  function printableHTML() {
    const a = S.get(st.algoId), p = findProblem(st.problemId), run = st.run, T = S.types[p.type] || {};
    const params = Object.entries(run.params).map(([k, v]) => { const d = a.params.find(x => x.key === k); return `<tr><td>${esc(d ? d.label : k)}</td><td>${esc(v)}</td></tr>`; }).join("");
    const L = a.learn || {};
    const steps = run.steps.map((s, i) => `<section class="pstep"><header class="ph"><span>${esc(a.name)} · ${esc(p.name)}</span><span>step ${i + 1} of ${run.steps.length}</span></header><div class="stage">${R.stageHTML(run.P, s, { print: true })}</div></section>`).join("");
    const clean = Object.assign({}, p); delete clean.generated;
    return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><title>${esc(a.name)} on ${esc(p.name)} · Search Studio trace</title>
<style>${S.CSS || ""}
body{background:#fff} .pcover,.pstep{max-width:1100px;margin:0 auto;padding:18px 24px}
.pstep{break-after:page;page-break-after:always} .pstep .stage{border:1px solid var(--rule);min-height:0}
.ph{display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted);border-bottom:1px solid var(--rule);padding-bottom:6px;margin-bottom:10px}
.pcover{break-after:page;page-break-after:always} .pcover h1{font-size:34px;margin:0 0 6px} .pcover h2{font-size:20px;margin:22px 0 8px;color:var(--yellow)}
.tbl .tscroll{max-height:none;overflow:visible} @page{size:A4 landscape;margin:10mm}
@media print{.pcover,.pstep{padding:0;max-width:none} .stage{border:0!important}}
</style></head><body>
<section class="pcover"><p class="eyebrow">Search Studio · step-by-step trace</p><h1>${esc(a.name)}</h1><p class="lede">${esc(L.intro || a.summary || "")}</p>
<h2>Problem</h2><p>${esc(p.name)}${describe(p) ? " — " + esc(describe(p)) : ""}</p><pre>${esc(T.toText ? T.toText(p) : JSON.stringify(clean, null, 1))}</pre>
<h2>Settings</h2>${params ? `<div class="tbl-plain"><table><tbody>${params}</tbody></table></div>` : "<p>None.</p>"}
<h2>Pseudocode</h2><pre>${esc(a.pseudocode || "")}</pre>
<h2>Result</h2><p>${esc(run.steps[run.steps.length - 1].caption)}</p></section>
${steps}</body></html>`;
  }
  async function download(filename, text, mime) {
    const note = $("#export-msg");
    try {
      if (window.claude && window.claude.use) { const dl = await window.claude.use("downloads"); if (dl) { await dl.save({ filename, data: new Blob([text], { type: mime }) }); note.textContent = `Saved ${filename}.`; note.className = "msg ok"; return; } }
      const url = URL.createObjectURL(new Blob([text], { type: mime }));
      const el = document.createElement("a"); el.href = url; el.download = filename; document.body.appendChild(el); el.click(); el.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      note.textContent = `Downloaded ${filename}.`; note.className = "msg ok";
    } catch (e) {
      note.textContent = e && e.code === "declined" ? "Download cancelled." : `Could not save the file${e && e.message ? ": " + e.message : ""}.`;
      note.className = "msg " + (e && e.code === "declined" ? "" : "err");
    }
  }

  route();
})();
