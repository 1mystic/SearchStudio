// Search engine and AI-crawler support, generated at build time from the same registry the site uses.
//   head      <meta> description, canonical, Open Graph, Twitter card, JSON-LD (WebSite, WebApplication, Course, ItemList)
//   meta      the same without canonical/JSON-LD (for copies: the single file and the artifact)
//   noscript  a plain HTML index of every algorithm, readable without JavaScript
//   files     learn/<id>.html (one static, crawlable page per algorithm), sitemap.xml, robots.txt, llms.txt, llms-full.txt
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const json = o => JSON.stringify(o).replace(/</g, "\\u003c");

const TITLE = "Search Studio — learn and trace AI search algorithms step by step";
const DESC = "Free, open-source visual studio for AI search algorithms: BFS, DFS, DFID, A*, IDA*, hill climbing, simulated annealing, genetic algorithms, ant colony, TSP heuristics, Minimax, Alpha-Beta, SSS*, planning, AO*, Rete and constraint satisfaction. Step-by-step OPEN/CLOSED traces, beginner explanations and printable exports.";
const KEYWORDS = ["AI search algorithms", "search methods for problem solving", "BFS DFS visualizer", "A* algorithm step by step", "admissible heuristic", "travelling salesman heuristics", "2-opt", "simulated annealing", "genetic algorithm TSP crossover", "PMX OX CX crossover", "ant colony optimization", "minimax alpha beta pruning", "SSS* algorithm", "goal stack planning", "partial order planning", "AO* algorithm", "Rete algorithm", "arc consistency AC-3", "Waltz algorithm", "NPTEL", "IIT Madras", "Deepak Khemani"];

const IC = { "skip-back": `<svg class="ic solid" viewBox="0 0 24 24" aria-hidden="true"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/></svg>`, "skip-forward": `<svg class="ic solid" viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>`, "chevron-left": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`, "chevron-right": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`, "play": `<svg class="ic solid" viewBox="0 0 24 24" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>`, "pause": `<svg class="ic solid" viewBox="0 0 24 24" aria-hidden="true"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`, "arrow-left": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`, "arrow-right": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`, "search": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`, "menu": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`, "sun": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`, "moon": `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>` };

export function build(Studio, owner, SITE, PKG) {
  const A = Studio.algorithms.slice().sort((a, b) => (a.week || 99) - (b.week || 99) || a.order - b.order);
  const N = A.length;
  const og = SITE + "assets/og.png";
  const meta = [
    `<meta name="description" content="${esc(DESC)}">`,
    `<meta name="keywords" content="${esc(KEYWORDS.join(", "))}">`,
    `<meta name="author" content="1mystic">`,
    `<meta name="theme-color" content="#121212">`,
    `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="Search Studio">`,
    `<meta property="og:title" content="${esc(TITLE)}">`, `<meta property="og:description" content="${esc(DESC)}">`,
    `<meta property="og:image" content="${og}">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(TITLE)}">`,
    `<meta name="twitter:description" content="${esc(DESC)}">`, `<meta name="twitter:image" content="${og}">`,
  ].join("\n");
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": SITE + "#site", url: SITE, name: "Search Studio", description: DESC, inLanguage: "en", author: { "@id": SITE + "#author" }, license: "https://unlicense.org/" },
      { "@type": "Person", "@id": SITE + "#author", name: "1mystic", url: "https://github.com/1mystic" },
      { "@type": "WebApplication", name: "Search Studio", url: SITE, applicationCategory: "EducationalApplication", operatingSystem: "Any (web browser)", isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, author: { "@id": SITE + "#author" }, codeRepository: "https://github.com/1mystic/SearchStudio", license: "https://unlicense.org/",
        featureList: ["Step-by-step traces with OPEN and CLOSED lists", `${N} algorithms`, "Random and custom problems", "Printable HTML, JSON, CSV and SVG exports", "Light and dark themes"] },
      { "@type": "LearningResource", name: "AI: Search Methods for Problem Solving — interactive companion", url: SITE, learningResourceType: ["interactive visualization", "worked example"], educationalLevel: "undergraduate",
        teaches: A.map(a => a.name), isAccessibleForFree: true, inLanguage: "en", about: ["Artificial intelligence", "State space search", "Heuristic search", "Game tree search", "Automated planning", "Constraint satisfaction"] },
      { "@type": "ItemList", name: "Algorithms", numberOfItems: N, itemListElement: A.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}learn/${a.id}.html`, name: a.name })) },
    ],
  };
  const head = `<link rel="canonical" href="${SITE}">\n${meta}\n<link rel="icon" href="assets/icon.svg" type="image/svg+xml">\n<link rel="alternate" type="text/plain" title="LLM summary" href="llms.txt">\n<script type="application/ld+json">${json(ld)}</script>`;

  const byWeek = new Map(); A.forEach(a => { const k = a.week || 0; if (!byWeek.has(k)) byWeek.set(k, []); byWeek.get(k).push(a); });
  const noscript = `<noscript><div class="prose"><h1>Search Studio</h1><p>${esc(DESC)}</p><p>The interactive studio needs JavaScript. Every algorithm also has a plain page:</p>${[...byWeek].map(([w, list]) => `<h2>Week ${w}</h2><ul>${list.map(a => `<li><a href="learn/${a.id}.html">${esc(a.name)}</a> — ${esc(a.summary || "")}</li>`).join("")}</ul>`).join("")}</div></noscript>`;

  const files = {};
  const shell = (title, desc, url, body, ldx) => `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image"><meta name="author" content="1mystic">
<link rel="icon" href="../assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../src/styles/studio.css">
<script>try{var t=JSON.parse(localStorage.getItem("search-studio.v1")||"{}").theme;if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<script type="application/ld+json">${json(ldx)}</script>
</head>
<body>
<header class="top"><div class="top-in"><a class="brand" href="../"><b>Search</b> Studio <small>AI-SMPS</small></a><nav class="nav" aria-label="Main"><a href="../#library" aria-current="page">Learn</a><a href="../#studio">Studio</a><a href="../#course">Course map</a><a href="../#guide">Guide</a><a href="../#about">About</a><a href="../#contribute">Contribute</a></nav><div class="top-tools"><a class="icon-btn" href="../#library" aria-label="Find an algorithm"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> <span class="hide-sm">Find</span> <kbd class="hide-sm">/</kbd></a><button class="icon-btn" id="theme-btn" type="button"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> <span>Light</span></button></div></div></header><script>(function(){var b=document.getElementById("theme-btn"),K="search-studio.v1",d=document.documentElement;function l(){var L=d.getAttribute("data-theme")==="light";b.innerHTML=(L?'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>':'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>')+" <span>"+(L?"Dark":"Light")+"</span>"}l();b.addEventListener("click",function(){var t=d.getAttribute("data-theme")==="light"?"dark":"light";d.setAttribute("data-theme",t);try{var s=JSON.parse(localStorage.getItem(K)||"{}");s.theme=t;localStorage.setItem(K,JSON.stringify(s))}catch(e){}l()})})();</script>
<main>${body}</main>
<footer class="foot"><div class="foot-in"><div class="foot-l"><a class="brand small" href="../"><b>Search</b> Studio</a><span>${N} algorithms · free and public domain (Unlicense)</span></div><div class="foot-r"><span class="made">made by <a href="https://github.com/1mystic" rel="author noopener">1mystic</a></span></div></div></footer>
</body>
</html>
`;
  A.forEach((a, i) => {
    const L = a.learn || {}, p = L.props || {}, url = `${SITE}learn/${a.id}.html`;
    const prev = A[i - 1], next = A[i + 1];
    const desc = (L.intro || a.summary || "").slice(0, 300);
    const body = `<article class="learn" style="max-width:900px"><div class="filebar"><div class="filecrumb"><a class="fc-dir" href="../#week-${a.week}">Week ${a.week}</a><span class="fc-sep">·</span><span class="fc-dir">${esc(a.family)}</span><span class="fc-sep">›</span><span class="fc-file">${esc(a.name)}</span></div></div>
<div class="learn-body" style="margin:0 auto">
<div class="learn-head"><div><p class="eyebrow">Week ${a.week} · ${esc(a.family)}</p><h1>${esc(a.name)}</h1></div><a class="btn primary" href="../#try-${a.id}">Run it step by step</a></div>
<p class="intro">${esc(L.intro || a.summary || "")}</p>
<p class="print-tip no-print"><span class="pt-ic" aria-hidden="true">⎙</span><span>Tip: press <kbd>Ctrl</kbd>+<kbd>P</kbd> to print or save this page as PDF.</span></p>
${L.definition ? `<h2><small>01</small>Definition</h2><p>${esc(L.definition)}</p>` : ""}
<h2><small>02</small>Pseudocode</h2><pre>${esc(a.pseudocode || "")}</pre>
${L.steps && L.steps.length ? `<h2><small>03</small>Line by line</h2><div class="tbl-plain"><table class="steps-tbl"><tbody>${L.steps.map(([l, w]) => `<tr><td>${esc(l)}</td><td>${esc(w)}</td></tr>`).join("")}</tbody></table></div>` : ""}
${L.formulas && L.formulas.length ? `<h2><small>04</small>Formulas and why they hold</h2>${L.formulas.map(f => `<div class="formula"><div class="f">${esc(f.f)}</div><p class="read">${esc(f.read)}</p><p class="why">${esc(f.why)}</p></div>`).join("")}` : ""}
${L.why ? `<h2><small>05</small>Why it works, and when it does not</h2><p>${esc(L.why)}</p>` : ""}
<h2><small>06</small>Properties</h2><div class="props"><div class="prop"><span>complete</span>${esc(p.complete || "–")}</div><div class="prop"><span>optimal</span>${esc(p.optimal || "–")}</div><div class="prop"><span>time</span>${esc(p.time || a.complexity || "–")}</div><div class="prop"><span>space</span>${esc(p.space || "–")}</div></div>
${L.traps && L.traps.length ? `<h2><small>07</small>Traps</h2><ul class="traps">${L.traps.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
<nav class="pager bottom">${prev ? `<a class="pg prev" href="${prev.id}.html"><span>${IC["arrow-left"]} Previous</span><b>${esc(prev.name)}</b></a>` : `<span class="pg empty"></span>`}${next ? `<a class="pg next" href="${next.id}.html"><span>Next ${IC["arrow-right"]}</span><b>${esc(next.name)}</b></a>` : `<span class="pg empty"></span>`}</nav>
</div></article>`;
    const ldx = { "@context": "https://schema.org", "@type": "LearningResource", name: a.name, description: desc, url, learningResourceType: "explanation with pseudocode and worked trace", isAccessibleForFree: true, inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: "Search Studio", url: SITE }, author: { "@type": "Person", name: "1mystic", url: "https://github.com/1mystic" }, teaches: a.name, educationalLevel: "undergraduate" };
    files[`learn/${a.id}.html`] = shell(`${a.name} — step by step · Search Studio`, desc, url, body, ldx);
  });
  const today = new Date().toISOString().slice(0, 10);
  files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE}</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>\n${A.map(a => `<url><loc>${SITE}learn/${a.id}.html</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`).join("\n")}\n</urlset>\n`;
  files["robots.txt"] = `# Everyone is welcome, including AI search and answer engines.\nUser-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: Claude-SearchBot\nAllow: /\nUser-agent: Claude-User\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`;
  const line = a => `- [${a.name}](${SITE}learn/${a.id}.html): ${(a.summary || "").replace(/\s+/g, " ")}`;
  files["llms.txt"] = `# Search Studio\n\n> ${DESC}\n\nSearch Studio is a free, public-domain web app (made by 1mystic, https://github.com/1mystic) that accompanies the course "AI: Search Methods for Problem Solving" (NPTEL / IIT Madras, Prof. Deepak Khemani). It is an independent study aid. Every algorithm has a static explanation page and an interactive step-by-step trace at ${SITE}#try-<id>.\n\nConventions used in every trace: OPEN and CLOSED hold node pairs (node, parent, depth or g); ties break alphabetically; the goal test happens when a node is picked from OPEN; simulated annealing accepts a worse move with probability 1/(1+e^(-ΔE/T)); savings are S(i,j) = C(b,i) + C(b,j) − C(i,j).\n\n${[...byWeek].map(([w, list]) => `## Week ${w}\n\n${list.map(line).join("\n")}`).join("\n\n")}\n\n## Optional\n\n- [Full text of every explanation](${SITE}llms-full.txt)\n- [Source code](https://github.com/1mystic/SearchStudio)\n`;
  files["llms-full.txt"] = `# Search Studio — full explanations\n\n${A.map(a => { const L = a.learn || {}, p = L.props || {}; return `## ${a.name} (week ${a.week}, ${a.family})\n\nURL: ${SITE}learn/${a.id}.html\n\n${L.intro || a.summary || ""}\n\n${L.definition ? "Definition: " + L.definition + "\n\n" : ""}Pseudocode:\n\n\`\`\`\n${a.pseudocode || ""}\n\`\`\`\n\n${(L.formulas || []).map(f => `- ${f.f}: ${f.read}. ${f.why}`).join("\n")}\n\n${L.why || ""}\n\nComplete: ${p.complete || "–"}. Optimal: ${p.optimal || "–"}. Time: ${p.time || a.complexity || "–"}. Space: ${p.space || "–"}.\n\n${(L.traps || []).map(t => "- Trap: " + t).join("\n")}\n`; }).join("\n")}`;
  return { head, meta, noscript, files };
}
