# Importing problems into Search Studio

This guide covers how to bring your own problem into the studio, and the exact JSON each kind of problem needs. Every JSON block below is tested: you can paste it into **Studio → Problem → Import** as it is.

## Contents

1. [Three ways to bring a problem in](#three-ways-to-bring-a-problem-in)
2. [Fields every problem shares](#fields-every-problem-shares)
3. [Which problem type each algorithm uses](#which-problem-type-each-algorithm-uses)
4. Schemas: [TSP](#1-tsp--type-tsp) · [Graph](#2-state-space-graph--type-graph) · [Game tree](#3-game-tree--type-game) · [AND–OR graph](#4-andor-graph--type-andor) · [Planning](#5-blocks-world-planning--type-planning) · [Rule base](#6-rule-base--type-rules) · [CSP](#7-constraint-problem--type-csp) · [Line drawing](#8-line-drawing--type-linedrawing) · [Circuit](#9-circuit-diagnosis--type-circuit) · [Alignment](#10-sequence-alignment--type-alignment)
5. [Adding a problem to the built-in examples](#adding-a-problem-to-the-built-in-examples)
6. [Common errors](#common-errors)

---

## Three ways to bring a problem in

| Way | Where | Best for |
|---|---|---|
| **Import** | Studio → Problem card → **Import** → paste JSON or choose a `.json` file → **Import** | Any problem type, from a file or a friend |
| **Edit** | Studio → Problem card → **Edit** → change the text → **Save to My problems** | Changing an example a little (one cost, one heuristic value) |
| **Export, change, import** | Studio → Export & print → **Export problem** gives the JSON of what's on screen | Starting from a working problem and reshaping it |

Imported and saved problems go under **My problems** in the problem picker. They live in **this browser only**: export them if you want them elsewhere.

When you import a problem whose type doesn't fit the current algorithm, the studio switches to an algorithm that fits and tells you.

> **Fastest route.** Export a built-in example of the same kind, change the values, then import it. You start from JSON that already works.

---

## Fields every problem shares

```jsonc
{
  "type": "tsp",            // REQUIRED. One of: tsp, graph, game, andor, planning, rules, csp, linedrawing, circuit, alignment
  "name": "My problem",     // optional: shown in the picker (default "Imported problem")
  "note": "One line.",      // optional: shown under the name
  "id": "my-problem"        // ignored on import (a new id is given); REQUIRED only for files in examples/
}
```

- Names of cities, nodes, variables and blocks are **case-sensitive strings**. Keep them short (1–3 characters) so they fit inside the circles.
- JSON has no comments. The `//` comments in this guide are for explanation only, so delete them before importing.
- Where a problem has coordinates (`x`, `y`), any scale works: the studio stretches them to fit. **`y` grows downwards**, as on a screen.

---

## Which problem type each algorithm uses

| `type` | Algorithms |
|---|---|
| `tsp` | Nearest Neighbour, Greedy, Savings, Brute force (≤ 9 cities), 2-city exchange, 2-edge exchange (2-opt), Or-opt, 3-edge exchange, VND, Beam search, Tabu search, Iterated hill climbing, Random walk, Simulated annealing, Genetic algorithm, Crossover lab, Ant colony |
| `graph` | BFS, DFS, DFID, Best First, Hill Climbing, Beam Search, UCS, A*, Admissibility & monotone check, IDA*, RBFS, DCFS |
| `game` | Minimax, Alpha-Beta, SSS* |
| `andor` | AO* |
| `planning` | Forward and backward state-space planning, Goal Stack Planning, Partial Order Planning |
| `rules` | Forward chaining, Rete |
| `csp` | Backtracking, Forward checking, Arc consistency (AC-1, AC-3) |
| `linedrawing` | Waltz algorithm |
| `circuit` | Model-based diagnosis |
| `alignment` | Sequence alignment (DP), Sequence alignment (A*) |

Settings such as the start city, tie-break rule, temperature or seed are **not** part of the problem. You set them in the studio's Settings card after importing.

---

## 1. TSP — `"type": "tsp"`

**Used by:** every TSP algorithm (Weeks 3–4).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `cities` | ✔ | array of `{ "id", "x"?, "y"? }` | At least 3 cities with unique ids. `x`, `y` place the city on screen. |
| `matrix` | one of the two | n × n array of numbers ≥ 0 | `matrix[i][j]` = cost from `cities[i]` to `cities[j]`, in the same order as `cities`. The diagonal is ignored (write 0). |
| `x`, `y` on every city | one of the two | numbers | If there is no `matrix`, cost = `round(scale × straight-line distance)`. |
| `scale` | | number, default 10 | Only used when distances come from coordinates. |

Rules:
- Give **either** a `matrix` **or** `x`/`y` on every city. With a matrix and no coordinates, the cities are drawn on a circle.
- Keep the matrix symmetric (`matrix[i][j] = matrix[j][i]`) for course problems. Asymmetric matrices also load (brute force then checks all (n−1)! directed tours), but the construction heuristics and exchange moves are taught for symmetric costs.
- Up to about 12 cities stays readable. Brute force refuses more than 9.

**Example A — a cost matrix (exam style):**

```json
{
  "type": "tsp",
  "name": "Five-city exam matrix",
  "cities": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
  "matrix": [
    [0, 58, 92, 34, 81],
    [58, 0, 20, 46, 70],
    [92, 20, 0, 28, 53],
    [34, 46, 28, 0, 12],
    [81, 70, 53, 12, 0]
  ]
}
```

**Example B — coordinates, distances computed:**

```json
{
  "type": "tsp",
  "name": "Six points on a plane",
  "scale": 10,
  "cities": [
    { "id": "A", "x": 1.0, "y": 1.0 },
    { "id": "B", "x": 4.0, "y": 0.5 },
    { "id": "C", "x": 6.5, "y": 2.0 },
    { "id": "D", "x": 6.0, "y": 5.0 },
    { "id": "E", "x": 3.0, "y": 5.5 },
    { "id": "F", "x": 0.5, "y": 3.5 }
  ]
}
```

**Text format (Edit box):** first line = city names, then one matrix row per city.

```
A B C D E
0 58 92 34 81
58 0 20 46 70
92 20 0 28 53
34 46 28 0 12
81 70 53 12 0
```

---

## 2. State-space graph — `"type": "graph"`

**Used by:** BFS, DFS, DFID, Best First, Hill Climbing, Beam, UCS, A*, monotone check, IDA*, RBFS, DCFS (Weeks 2, 3, 5, 6).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `nodes` | ✔ | array of `{ "id", "h"?, "x"?, "y"? }` | Unique ids. `h` = heuristic estimate to the goal (default 0). |
| `edges` | ✔ | array of `[from, to, cost]` | Cost is a number ≥ 0. |
| `start` | ✔ | node id | Where search begins. |
| `goal` | | node id | Leave it out to explore the whole graph. |
| `directed` | | boolean, default `false` | `true`: an edge only goes from → to. |
| `moveOrder` | | `"listed"` | Children come out in the order the edges are listed. Default is **alphabetical**, the course convention. |

Rules:
- Give `x`/`y` on **all** nodes or on none. With none, the studio lays the graph out itself.
- For A* to be optimal, `h` must never overestimate the true remaining cost (admissible). The **Admissibility & monotone check** algorithm tests this for you.
- Unit-cost graphs for BFS, DFS and DFID: just write cost `1` on every edge.

**Example — weighted graph with an admissible heuristic:**

```json
{
  "type": "graph",
  "name": "My A* graph",
  "start": "S",
  "goal": "G",
  "directed": false,
  "nodes": [
    { "id": "S", "h": 7, "x": 0, "y": 2 },
    { "id": "A", "h": 6, "x": 2, "y": 0 },
    { "id": "B", "h": 4, "x": 2, "y": 4 },
    { "id": "C", "h": 2, "x": 4, "y": 2 },
    { "id": "G", "h": 0, "x": 6, "y": 2 }
  ],
  "edges": [
    ["S", "A", 1],
    ["S", "B", 4],
    ["A", "B", 2],
    ["A", "C", 5],
    ["B", "C", 2],
    ["C", "G", 3]
  ]
}
```

**Text format (Edit box):**

```
start S
goal G
undirected
# heuristic: node h
h S 7
h A 6
h B 4
h C 2
h G 0
# edges: u v cost
S A 1
S B 4
A B 2
A C 5
B C 2
C G 3
```

---

## 3. Game tree — `"type": "game"`

**Used by:** Minimax, Alpha-Beta, SSS* (Week 7).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `tree` | ✔ | nested arrays of numbers | A list is an internal node and holds its children. A number is a leaf's value for MAX. |
| `root` | | `"MAX"` or `"MIN"`, default `"MAX"` | Who moves at the root. Levels then alternate. |

Rules:
- The whole `tree` is the root, so it must be an array. Every internal node needs at least one child, and every leaf must be a number.
- Branches may differ in depth and width.
- Nodes are named automatically, level by level (A, B, C, …), so you never write names.

**Example — the classic 3 × 3 tree (value 3):**

```json
{
  "type": "game",
  "name": "Textbook 3 by 3",
  "root": "MAX",
  "tree": [[3, 12, 8], [2, 4, 6], [14, 5, 2]]
}
```

**Example — four plies, uneven:**

```json
{
  "type": "game",
  "name": "Uneven four-ply tree",
  "tree": [
    [[[5, 6], [7, 4, 5]], [[3]]],
    [[[6], [6, 9]], [[7]]],
    [[[5]], [[9, 8], [6]]]
  ]
}
```

**Text format (Edit box):** brackets instead of JSON arrays.

```
root MAX
((3 12 8) (2 4 6) (14 5 2))
```

---

## 4. AND–OR graph — `"type": "andor"`

**Used by:** AO* (Week 9).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `nodes` | ✔ | array of `{ "id", "h"?, "solved"?, "x"?, "y"? }` | `h` = estimated cost to solve (default 0). `"solved": true` marks a primitive, already-solved node (usually `h: 0`). |
| `start` | ✔ | node id | The problem to solve. |
| `connectors` | ✔ | array of `{ "from", "to": [ids], "cost"? }` | A hyper-arc. **One child = an OR option. Two or more children = an AND arc** (all must be solved). |
| `edgeCost` | | number, default 1 | When a connector has no `cost`, its cost = `edgeCost × number of children`. |

**Example:**

```json
{
  "type": "andor",
  "name": "Small AND–OR graph",
  "start": "A",
  "edgeCost": 1,
  "nodes": [
    { "id": "A", "h": 3 },
    { "id": "B", "h": 4 },
    { "id": "C", "h": 1 },
    { "id": "D", "h": 2 },
    { "id": "E", "h": 0, "solved": true },
    { "id": "F", "h": 0, "solved": true }
  ],
  "connectors": [
    { "from": "A", "to": ["B"] },
    { "from": "A", "to": ["C", "D"] },
    { "from": "B", "to": ["E"] },
    { "from": "C", "to": ["E"] },
    { "from": "D", "to": ["F"] }
  ]
}
```

Here A can be solved through B (an OR option), or through both C **and** D (an AND arc that costs 2).

---

## 5. Blocks-world planning — `"type": "planning"`

**Used by:** Forward and backward state-space planning, Goal Stack Planning, Partial Order Planning (Week 8).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `blocks` | ✔ | array of block names | Every block in the world. |
| `init` | ✔ | array of stacks, each listed **bottom first** | Each block appears in exactly one stack. A one-block stack is a block on the table. The arm starts empty. |
| `goal` | ✔ | array of predicate strings | Allowed: `on(X,Y)`, `ontable(X)`, `clear(X)`, `holding(X)`, `AE` (arm empty). No spaces inside the brackets. |

The operators are the course's four: `pickup(X)`, `putdown(X)`, `stack(X,Y)` and `unstack(X,Y)`, with the usual preconditions and effects.

**Example — the Sussman anomaly:**

```json
{
  "type": "planning",
  "name": "Sussman anomaly",
  "blocks": ["A", "B", "C"],
  "init": [["A", "C"], ["B"]],
  "goal": ["on(A,B)", "on(B,C)"]
}
```

`[["A","C"],["B"]]` means C sits on A, and B is on the table.

**Text format (Edit box):**

```
blocks A B C
# stacks, bottom first, one per line
init A C
init B
goal on(A,B) on(B,C)
```

Keep it to 3–5 blocks. Forward search grows very fast with more.

---

## 6. Rule base — `"type": "rules"`

**Used by:** Forward chaining, Rete (Week 10).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `facts` | ✔ | array of strings | Working memory. Each fact is in brackets: `"(parent tom bob)"`. |
| `rules` | ✔ | array of `{ "name", "if": [...], "then": [...] }` | Patterns use `?x`-style variables. |

Inside a rule:
- `if` patterns may start with `not ` to fire only when **no** matching fact exists: `"not (male ?x)"`.
- `then` actions add a fact by default. Write `"remove (fact …)"` to delete one, or `"add (…)"` to say add explicitly.
- A variable gets the same value everywhere it appears in one rule.

**Example:**

```json
{
  "type": "rules",
  "name": "Family relations",
  "facts": ["(parent tom bob)", "(parent bob ann)", "(male tom)", "(male bob)"],
  "rules": [
    { "name": "R1", "if": ["(parent ?x ?y)", "(parent ?y ?z)"], "then": ["(grandparent ?x ?z)"] },
    { "name": "R2", "if": ["(parent ?x ?y)", "(male ?x)"], "then": ["(father ?x ?y)"] },
    { "name": "R3", "if": ["(grandparent ?x ?z)", "(male ?x)"], "then": ["(grandfather ?x ?z)"] }
  ]
}
```

**Text format (Edit box):**

```
fact (parent tom bob)
fact (parent bob ann)
fact (male tom)
fact (male bob)
rule R1: if (parent ?x ?y) & (parent ?y ?z) then (grandparent ?x ?z)
rule R2: if (parent ?x ?y) & (male ?x) then (father ?x ?y)
rule R3: if (grandparent ?x ?z) & (male ?x) then (grandfather ?x ?z)
```

The conflict-resolution strategy (rule order, recency, specificity) is a setting in the studio, not part of the file.

---

## 7. Constraint problem — `"type": "csp"`

**Used by:** Backtracking, Forward checking, Arc consistency (Week 11).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `variables` | ✔ | array of `{ "id", "domain": [...], "x"?, "y"? }` | `domain` = the values allowed: strings or numbers, at least one. |
| `constraints` | ✔ | array of `{ "scope": [X, Y], "rel", ... }` | Binary constraints only, exactly two variables each. |

`rel` can be:

| `rel` | Meaning | Extra field |
|---|---|---|
| `"neq"` | X ≠ Y | |
| `"eq"` | X = Y | |
| `"lt"` | X < Y | |
| `"gt"` | X > Y | |
| `"noattack"` | queens: X ≠ Y and \|X − Y\| ≠ `dist` | `"dist"`: column distance between the two queens |
| `"table"` | only the listed pairs are allowed | `"allowed": [[x, y], ...]`, in `scope` order |

**Example — map colouring:**

```json
{
  "type": "csp",
  "name": "Four-region map",
  "variables": [
    { "id": "P", "domain": ["r", "g", "b"], "x": 0, "y": 0 },
    { "id": "Q", "domain": ["r", "g", "b"], "x": 2, "y": 0 },
    { "id": "R", "domain": ["r", "g"], "x": 1, "y": 1.5 },
    { "id": "S", "domain": ["r", "g", "b"], "x": 3, "y": 1.5 }
  ],
  "constraints": [
    { "scope": ["P", "Q"], "rel": "neq" },
    { "scope": ["P", "R"], "rel": "neq" },
    { "scope": ["Q", "R"], "rel": "neq" },
    { "scope": ["Q", "S"], "rel": "neq" },
    { "scope": ["R", "S"], "rel": "neq" }
  ]
}
```

**Example — `lt` and `table` constraints:**

```json
{
  "type": "csp",
  "name": "Ordering with a table constraint",
  "variables": [
    { "id": "X", "domain": [1, 2, 3] },
    { "id": "Y", "domain": [1, 2, 3] },
    { "id": "Z", "domain": [1, 2, 3] }
  ],
  "constraints": [
    { "scope": ["X", "Y"], "rel": "lt" },
    { "scope": ["Y", "Z"], "rel": "table", "allowed": [[1, 3], [2, 1], [3, 2]] }
  ]
}
```

**Example — 4-queens (variable = column, value = row):**

```json
{
  "type": "csp",
  "name": "Four queens",
  "variables": [
    { "id": "Q1", "domain": [1, 2, 3, 4], "x": 0, "y": 0 },
    { "id": "Q2", "domain": [1, 2, 3, 4], "x": 1, "y": 0 },
    { "id": "Q3", "domain": [1, 2, 3, 4], "x": 2, "y": 0 },
    { "id": "Q4", "domain": [1, 2, 3, 4], "x": 3, "y": 0 }
  ],
  "constraints": [
    { "scope": ["Q1", "Q2"], "rel": "noattack", "dist": 1 },
    { "scope": ["Q1", "Q3"], "rel": "noattack", "dist": 2 },
    { "scope": ["Q1", "Q4"], "rel": "noattack", "dist": 3 },
    { "scope": ["Q2", "Q3"], "rel": "noattack", "dist": 1 },
    { "scope": ["Q2", "Q4"], "rel": "noattack", "dist": 2 },
    { "scope": ["Q3", "Q4"], "rel": "noattack", "dist": 1 }
  ]
}
```

The studio's **Random** button can also make n-queens for you (n = 4–8).

---

## 8. Line drawing — `"type": "linedrawing"`

**Used by:** Waltz algorithm (Week 11).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `points` | ✔ | array of `{ "id", "x", "y" }` | Junction positions in **screen coordinates (y grows downward)**. The angles between lines decide each junction's type (L, fork, arrow, T), so the positions must be accurate. |
| `edges` | ✔ | array of `[p, q]` | The lines of the drawing. |
| `useBoundary` | | boolean, default `true` | `true`: the outer boundary is fixed as occluding arrows (object on the inside), the usual "object against the background" constraint. |
| `boundary` | | array of `[p, q]` | Lists the outer boundary yourself. Leave it out and it is found from the drawing. |

Rules:
- Every point must meet **2 or 3** lines (trihedral objects).
- Draw it the way the object looks: a 3-line junction whose angles are all under 180° is a fork, one with an angle over 180° is an arrow, and one with two collinear lines is a T.

**Example — a cube seen corner-on (unique labelling with the boundary fixed):**

```json
{
  "type": "linedrawing",
  "name": "Cube",
  "points": [
    { "id": "O", "x": 0, "y": 0 },
    { "id": "P", "x": 0, "y": -100 },
    { "id": "Q", "x": 86.6, "y": -50 },
    { "id": "R", "x": 86.6, "y": 50 },
    { "id": "S", "x": 0, "y": 100 },
    { "id": "T", "x": -86.6, "y": 50 },
    { "id": "U", "x": -86.6, "y": -50 }
  ],
  "edges": [
    ["O", "P"], ["O", "R"], ["O", "T"],
    ["P", "Q"], ["Q", "R"], ["R", "S"], ["S", "T"], ["T", "U"], ["U", "P"]
  ],
  "useBoundary": true
}
```

Set `"useBoundary": false` and the same drawing keeps several interpretations, which is a good way to see why the background constraint matters.

---

## 9. Circuit diagnosis — `"type": "circuit"`

**Used by:** Model-based diagnosis (Week 11).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `inputs` | ✔ | object `{ wire: number }` | Values on the input wires. |
| `components` | ✔ | array of `{ "id", "op", "in": [w1, w2], "out" }` | `op` is `"add"` or `"mul"`. Exactly two inputs and one output wire each. |
| `observed` | ✔ | object `{ wire: number }` | Measured values, usually on the outputs. A mismatch with the prediction triggers diagnosis. |
| `layout` | | object `{ name: [x, y] }` | Positions for wires and components. Without it, everything is drawn at one point, so do give it. |

**Example — the classic polybox (F should be 12 but reads 10):**

```json
{
  "type": "circuit",
  "name": "Polybox",
  "inputs": { "A": 3, "B": 2, "C": 2, "D": 3, "E": 3 },
  "components": [
    { "id": "M1", "op": "mul", "in": ["A", "C"], "out": "X" },
    { "id": "M2", "op": "mul", "in": ["B", "D"], "out": "Y" },
    { "id": "M3", "op": "mul", "in": ["C", "E"], "out": "Z" },
    { "id": "A1", "op": "add", "in": ["X", "Y"], "out": "F" },
    { "id": "A2", "op": "add", "in": ["Y", "Z"], "out": "G" }
  ],
  "observed": { "F": 10, "G": 12 },
  "layout": {
    "A": [0, 0], "B": [0, 1], "C": [0, 2], "D": [0, 3], "E": [0, 4],
    "M1": [1, 0.5], "M2": [1, 2], "M3": [1, 3.5],
    "X": [2, 0.5], "Y": [2, 2], "Z": [2, 3.5],
    "A1": [3, 1.2], "A2": [3, 2.8],
    "F": [4, 1.2], "G": [4, 2.8]
  }
}
```

Expected minimal diagnoses: {M1}, {A1}, {M2, M3}, {M2, A2}.

---

## 10. Sequence alignment — `"type": "alignment"`

**Used by:** Sequence alignment by dynamic programming and by A* (Week 6).

| Field | Required | Type | Meaning |
|---|:--:|---|---|
| `a` | ✔ | string, ≤ 10 letters | First sequence (rows of the lattice). |
| `b` | ✔ | string, ≤ 10 letters | Second sequence (columns). |
| `match` | ✔ | number ≥ 0 | Cost of aligning equal letters (usually 0). |
| `mismatch` | ✔ | number ≥ 0 | Cost of aligning different letters. |
| `gap` | ✔ | number ≥ 0 | Cost of a letter against a gap. |

Costs are minimised. With `match 0, mismatch 1, gap 1` the cost is the edit distance.

```json
{
  "type": "alignment",
  "name": "GATTACA vs GCATGCU",
  "a": "GATTACA",
  "b": "GCATGCU",
  "match": 0,
  "mismatch": 1,
  "gap": 1
}
```

**Text format (Edit box):**

```
a GATTACA
b GCATGCU
match 0
mismatch 1
gap 1
```

---

## Adding a problem to the built-in examples

To ship a problem with the site for everyone, not just your browser:

1. Save the JSON as `examples/<type>-<short-name>.json`.
2. Give it a unique `"id"` (the same as the filename is easiest) and a `"note"` saying what it shows.
3. Run `npm run build`. The build validates the file and runs every matching algorithm on it, and it stops with a message if anything is wrong.

---

## Common errors

| Message | Fix |
|---|---|
| `That is not a valid problem: Unexpected token …` | The JSON is malformed: look for a trailing comma, a `//` comment or a missing quote. |
| `Unknown problem type "…"` | `type` must be one of the ten names above, in lowercase. |
| `Matrix must be n × n` | One row per city, one number per city in every row, in the same order as `cities`. |
| `Edge X–Y uses an unknown node` | Every edge end must be listed in `nodes`, with the same case. |
| `Start node is not in the graph` | `start` (and `goal`) must be node ids. |
| `Leaves must be numbers` | In a game tree, values are numbers and never strings: `3`, not `"3"`. |
| `Every block must appear exactly once in init stacks` | Each block in `blocks` must be in exactly one `init` stack. |
| `Unknown goal predicate` | Write `on(A,B)` with no spaces, or `ontable(A)`, `clear(A)`, `holding(A)`, `AE`. |
| `"…" must be written in brackets` | Facts and patterns look like `(parent tom bob)`. |
| `Constraint … must name two variables` | Each CSP constraint has exactly two variables in `scope`, both declared. |
| `Point X has N lines` | Waltz handles junctions of 2 or 3 lines only. |
| `Keep sequences to 10 letters or fewer` | Shorten `a` and `b` so every lattice node can be drawn. |
| The drawing is squashed into one spot | Give `x`/`y` on all nodes, or none, never only some. For circuits, add `layout`. |
