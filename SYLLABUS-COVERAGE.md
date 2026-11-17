# Syllabus coverage: *AI: Search Methods for Problem Solving* (Prof. Deepak Khemani), Weeks 1–12

Status as of 2026-11-17: **95 algorithms.** The catalogue brief (SAT type and algorithms, Week 6 and Week 12 methods, Graphplan, expectiminimax, Week 12 in the course structure) is finished and merged.
Everything below the "Not built yet" heading is optional; priorities are P2 (taught in lectures) and P3 (mentioned or supplementary).

## Covered
| Week | Covered in the studio |
|:--:|---|
| 1 | Reading only (About page) |
| 2 | BFS, DFS, DFID, depth-bounded DFS, simple search (no node pairs), water jug / 8-puzzle / missionaries on the `statespace` type |
| 3 | Best first, hill climbing, beam (graph); blocks-world hill climbing h1 vs h2; TSP constructive and perturbation methods, VND, beam, best neighbour, tabu; SAT brute force, hill climbing, beam, VND, best neighbour, tabu |
| 4 | Iterated hill climbing, random walk, stochastic hill climbing, simulated annealing (TSP and SAT); GA (TSP and SAT bit strings); crossover lab; TSP representation lab; ant colony |
| 5 | UCS, Dijkstra, branch and bound (state space and TSP), British Museum, A*, weighted A*, heuristic comparison with b*, admissibility |
| 6 | Monotone check, IDA*, RBFS, DCFS, Frontier Search, Smart Memory Graph Search, A* with upper bound, BFHS, DC-BFHS, Beam Stack Search, sequence alignment (DP and A*) |
| 7 | Minimax, alpha-beta, SSS*, expectiminimax (supplementary) |
| 8 | Forward and backward planning, GSP, POP, Graphplan, means-ends analysis |
| 9 | AO*, forward chaining, backward chaining with goal trees |
| 10 | Forward chaining with conflict resolution, Rete (including `not` and `remove`) |
| 11 | CSP, backtracking, AC-1, AC-3, forward checking, path consistency, Waltz, model-based diagnosis, SAT as a CSP (DPLL) |
| 12 | Partial, full and MAC lookahead, conflict-directed backjumping, nogood recording, depth-first branch and bound |

Course answers that could not be matched exactly (the notes are not in the repo): see HANDOFF.md.

## Extras added after the core catalogue
- Week 1: explainers for the Turing Test, the Chinese Room, the Winograd Schema Challenge and configuration vs planning problems (About page).
- Week 4: Game of Life stepper (emergent systems); GA diversity chart (premature convergence).
- Week 6: Divide and Conquer Beam Search.
- Week 7: k-ply tic-tac-toe with the horizon effect; dominant strategies and Nash equilibria (Prisoner's Dilemma).
- Week 8: multi-arm plan scheduling and makespan.
- Week 10: OPS5-style time tags in forward chaining and Rete.
- Week 11: matching-diagram view; strong k-consistency for k ≤ 3.
- Week 12 / synthesis: "Which algorithm for which question" table (Guide § 6).

Every topic in the course list is now covered. Possible future additions: mixed-strategy equilibria, optimal (not greedy) multi-arm scheduling.
