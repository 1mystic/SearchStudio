# Importing problems: JSON schemas

This file lists the JSON accepted by each problem type. (Only the sections added for rules and game trees are shown here; other types are documented alongside their problem-type files.)

## rules (rule bases)

```json
{
  "id": "rules-family", "type": "rules", "name": "Family relations",
  "goal": "(grandfather tom ?who)",
  "facts": ["(parent tom bob)", "(male tom)"],
  "rules": [{ "name": "R1", "if": ["(parent ?x ?y)", "(parent ?y ?z)"], "then": ["(grandparent ?x ?z)"] }]
}
```

* `facts`, `rules`: as before. Conditions may be prefixed `not`, actions `add` / `remove`.
* `goal` (optional, backward compatible): the query for **Backward chaining (goal tree)**. It is a bracketed tuple and may contain `?variables`, for example `(is cheetah rex)` or `(grandfather tom ?who)`. Forward chaining and Rete ignore it. If it is absent, backward chaining uses its "Query goal" parameter, or, if that is empty too, the first `add` consequent of the last rule.
* Text format: an extra line `goal (grandfather tom ?who)`.

## game (game trees)

```json
{ "id": "game-three-ply", "type": "game", "root": "MAX", "tree": [[3, 12, 8], [2, 4, 6], [14, 5, 2]] }
```

Leaves are numbers (values for MAX), nested lists are MAX/MIN nodes alternating from `root`.

**Chance nodes (supplementary, for Expectiminimax; Russell & Norvig).** A subtree may be an object `{"chance": [[p1, subtree1], [p2, subtree2], ...]}` where each `p` is in [0, 1] and the probabilities sum to 1:

```json
{ "id": "game-chance", "type": "game", "root": "MAX",
  "tree": [ { "chance": [[0.5, [2, 8]], [0.5, [4, 6]]] },
            { "chance": [[0.7, [5, 9]], [0.3, [0, 10]]] } ] }
```

* A chance node does not use up a ply: the MAX/MIN alternation counts only the list nodes above a node. In the example MAX moves (root), the die is rolled (chance), then MIN replies (the inner lists).
* The root must be a list (a MAX or MIN node), not a chance node.
* Trees without chance nodes are unchanged. **Minimax, Alpha-Beta and SSS\*** refuse a tree with chance nodes (their answer would be wrong); use **Expectiminimax**, which also accepts ordinary trees and then equals Minimax.
* Text format: `{ p1 child1 p2 child2 }`, e.g. `({0.5 (2 8) 0.5 (4 6)} {0.7 (5 9) 0.3 (0 10)})`.
