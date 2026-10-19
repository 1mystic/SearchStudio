"""Beginner learning content per algorithm. Injected into algorithms/*.js by inject_learn.py (one-off authoring helper).
Fields: intro, definition, steps [[line, explanation]], formulas [{f, read, why}], why, traps [..], props {complete, optimal, time, space}."""

L = {}

L["tsp-brute-force"] = dict(
    intro="The travelling salesperson problem (TSP) asks for the shortest round trip that visits every city exactly once. Brute force simply tries every possible round trip and keeps the shortest. It is the only method here that is guaranteed to find the best tour, and it is how every other method's answer is checked.",
    definition="Fix the first city (a round trip can start anywhere), list every ordering of the remaining n−1 cities, compute each tour's cost, and return the cheapest.",
    steps=[["best ← ∞", "No tour seen yet."], ["for every permutation p of cities 2..n", "There are (n−1)! orderings. In a symmetric TSP a tour and its reverse cost the same, so only half are distinct."], ["if cost(city1 + p) < best", "Cost = sum of the n edges, including the edge back to the start."], ["return best", "The cheapest tour is the optimum."]],
    formulas=[dict(f="number of tours = (n−1)! / 2  (symmetric)", read="fix one city, order the rest, halve for direction", why="Rotations of a cycle are the same tour, and so is the reversed cycle when C(i,j) = C(j,i)."),
              dict(f="cost(T) = Σ C(tᵢ, tᵢ₊₁) + C(tₙ, t₁)", read="add up every edge on the cycle", why="The closing edge back to the start is part of the tour; forgetting it is the most common arithmetic slip.")],
    why="It works because it leaves nothing out. It fails in practice because (n−1)!/2 explodes: 60 tours for 6 cities, 181,440 for 10, about 10^155 for 100.",
    traps=["Forgetting the closing edge.", "Counting (n−1)! instead of (n−1)!/2 for a symmetric instance.", "Using brute force on large n: the studio limits it to 9 cities."],
    props=dict(complete="yes", optimal="yes", time="O(n!)", space="O(n)"),
)

L["tsp-nearest-neighbour"] = dict(
    intro="Nearest Neighbour is what most people do by hand: from where you are, go to the closest place you have not visited yet. It builds a tour quickly but can paint itself into a corner and pay for a long trip home at the end.",
    definition="A constructive (synthesis) heuristic: start at a given city, repeatedly append the nearest unvisited city, and finally return to the start.",
    steps=[["tour ← [start]", "The path starts at the chosen city."], ["while unvisited cities remain", "n−1 choices are made in total."], ["c ← last city of tour", "Only the current end of the path matters: NN never looks back."], ["append the unvisited city nearest to c", "Ties go to the alphabetically first city (the course convention)."], ["return tour", "The edge from the last city back to the start is forced, whatever its length."]],
    formulas=[dict(f="next = argmin over unvisited j of C(c, j)", read="pick the cheapest edge out of the current city that leads somewhere new", why="Each choice is locally best; nothing guarantees the sum of choices is globally best."),
              dict(f="NN ≤ ½(⌈log₂ n⌉ + 1) · OPT  (metric TSP)", read="in the worst case NN can be about log n times worse than optimal", why="Bad cases exist where greedy local moves strand far-away cities.")],
    why="Cheap and intuitive. Its weakness is the end game: the last cities are whatever is left over, often far apart, and the forced return edge can be the longest edge in the tour.",
    traps=["The tour depends on the start city: run it from every city and keep the best.", "Do not forget the forced return edge in the cost.", "Write the answer in path representation starting from the asked city."],
    props=dict(complete="always returns a tour", optimal="no", time="O(n²)", space="O(n)"),
)

L["tsp-greedy"] = dict(
    intro="The Greedy heuristic builds the tour out of the shortest edges available anywhere on the map, like snapping together the closest pairs of cities first. Two rules keep the pieces from becoming something other than one big loop.",
    definition="Sort all edges by length. Accept an edge unless it would give a city a third edge (degree 3) or close a loop before all cities are included (premature cycle). Stop at n edges.",
    steps=[["sort all edges by length", "There are n(n−1)/2 edges; ties are broken alphabetically."], ["if degree(a) = 2 or degree(b) = 2: reject", "In a tour every city has exactly two neighbours."], ["if a and b are already connected: reject", "Adding the edge would close a cycle that misses some cities. Only the very last edge may close the cycle."], ["else accept", "The edge joins two fragments or extends one."], ["read the tour from a city", "The edge set does not depend on any city; the start only fixes how the path representation is written."]],
    formulas=[dict(f="accept (a,b) ⇔ deg(a) < 2 ∧ deg(b) < 2 ∧ (find(a) ≠ find(b) ∨ |E| = n−1)", read="both ends have a free slot, and they are in different fragments unless this is the closing edge", why="These are exactly the conditions for the chosen edges to still be part of some Hamiltonian cycle."),
              dict(f="cost = Σ of accepted edge lengths", read="the tour cost is just the accepted edges", why="Greedy accepts exactly n edges.")],
    why="Short edges are likely to belong to good tours, so Greedy usually beats Nearest Neighbour. But fragments are joined late, and the final edges are whatever remains legal, which can be very long.",
    traps=["Track degrees and fragments carefully; most exam errors are an illegal acceptance.", "The last accepted edge is forced and may be long.", "'Greedy from city X' only changes where you start writing the tour."],
    props=dict(complete="always returns a tour", optimal="no", time="O(n² log n)", space="O(n²)"),
)

L["tsp-savings"] = dict(
    intro="Imagine a delivery van that returns to the depot after every single delivery. The Savings heuristic starts there and asks: which two trips can I combine to save the most driving? It keeps combining trips until there is just one round trip.",
    definition="Choose a base (fulcrum) city b. For each pair of other cities compute the saving S(i,j) of visiting i and j on one trip instead of two. Process pairs from the largest saving down, linking i and j whenever both are still ends of different sub-tours.",
    steps=[["S(i,j) ← C(b,i) + C(b,j) − C(i,j)", "For n cities there are (n−1)(n−2)/2 pairs."], ["sort pairs, largest saving first", "Ties change the result; the course breaks them alphabetically."], ["start with b–x–b for every x", "Initial cost = 2 × Σ C(b,x)."], ["link i–j if both are ends of different sub-tours", "An end city is one still adjacent to the base. Linking removes edges b–i and b–j and adds i–j."], ["otherwise skip", "Same sub-tour: would close a cycle. Interior city: already has two non-base neighbours."], ["return the single tour", "Final cost = initial cost − Σ accepted savings."]],
    formulas=[dict(f="S(i,j) = C(b,i) + C(b,j) − C(i,j)", read="trip b→i→b plus b→j→b, minus going i→j directly", why="Merging two out-and-back trips replaces the two edges i–b and b–j with one edge i–j; the difference is the distance saved."),
              dict(f="cost = 2·Σₓ C(b,x) − Σ accepted S(i,j)", read="start with all out-and-back trips, subtract each saving you used", why="Every merge removes exactly its saving from the total, which is a quick way to check your final tour cost.")],
    why="Savings rewards pairs that are far from the base but close to each other, which avoids stranding remote cities. It is usually the best of the three constructive heuristics, but the result depends on the base city and on tie-breaking.",
    traps=["The savings formula has a minus on C(i,j), not on the base distances.", "A pair is refused if either city is interior, even if they are in different sub-tours.", "Know which pairs merged and which did not: exams ask for the first three of each."],
    props=dict(complete="always returns a tour", optimal="no", time="O(n² log n)", space="O(n²)"),
)

for k, mg, nb, ch in [("tsp-two-city-exchange", "2-city exchange", "n(n−1)/2", "swap the positions of two cities"),
                      ("tsp-two-edge-exchange", "2-edge exchange", "n(n−3)/2", "remove two non-adjacent edges and reconnect"),
                      ("tsp-or-opt", "Or-opt", "about n²", "move one city to another place in the tour"),
                      ("tsp-three-edge-exchange", "3-edge exchange", "O(n³)", "remove three edges and reconnect the segments")]:
    L[k] = dict(
        intro=f"Perturbative methods start from a complete tour and improve it by small changes. {mg} is one such change: {ch}. Repeating the best improving change until none helps is hill climbing, and where it stops is a local optimum.",
        definition=f"MoveGen({mg}) lists every tour reachable by one {mg} move ({nb} neighbours). Steepest-descent hill climbing moves to the best neighbour while it is strictly better than the current tour.",
        steps=[["node ← start tour", "Usually a constructive tour (Greedy, NN) or a random one."], ["neighbours ← MoveGen(node)", f"All tours one {mg} move away: {nb} of them."], ["best ← cheapest neighbour", "Ties: the alphabetically smaller tour."], ["if cost(best) ≥ cost(node): return node", "No neighbour is strictly better: a local optimum for this neighbourhood."], ["node ← best", "Move and repeat."]],
        formulas=([dict(f="|N₂c| = n(n−1)/2", read="choose any two positions to swap", why="Swapping cities i and j changes up to 4 edges; if they are adjacent only 2 change.")] if "city" in k else
                  [dict(f="|N₂e| = n(n−3)/2", read="pairs of edges that do not share a city", why="Each of n edges can pair with n−3 non-adjacent edges; each pair is counted twice."),
                   dict(f="Δ = C(a,c) + C(b,d) − C(a,b) − C(c,d)", read="new edges minus removed edges", why="Only four edges change, so a move is evaluated in O(1) without recomputing the whole tour.")] if "two-edge" in k else
                  [dict(f="Δ = C(p,q) − C(p,c) − C(c,q) + C(x,c) + C(c,y) − C(x,y)", read="take c out from between p and q, put it between x and y", why="Moving one city removes three edges and adds three, so Or-opt moves are a subset of 3-edge exchanges.")] if "or-opt" in k else
                  [dict(f="|N₃e| = O(n³)", read="choose three edges, then a reconnection", why="Denser than 2-edge exchange: fewer local optima, more work per step.")]),
        why="Hill climbing is fast and always improves until it stops, but it stops at the first tour with no better neighbour. A denser neighbourhood has fewer such traps but costs more per step.",
        traps=["Hill climbing stops when no neighbour is strictly better, even if equal-cost neighbours exist (a plateau).", "Count neighbours with the right formula for the operator.", "In an asymmetric TSP a 2-edge move reverses a block, so many edge costs change."],
        props=dict(complete="no", optimal="no (local optimum)", time=f"{nb} evaluations per step", space="O(n)"),
    )

L["tsp-vnd"] = dict(
    intro="If hill climbing gets stuck, one fix is to look further: use a bigger neighbourhood. Variable Neighbourhood Descent does this in order, from cheap and sparse to expensive and dense, so most of the improvement comes cheaply.",
    definition="Given MoveGen functions ordered by density, hill climb with MoveGen(1) to a local optimum, then continue from there with MoveGen(2), and so on.",
    steps=[["node ← start", ""], ["for i ← 1 to n", "MoveGens are sorted sparse → dense."], ["node ← HillClimbing(node, MoveGen(i))", "Each phase starts where the previous phase stopped."], ["return node", "A local optimum for the last (densest) neighbourhood."]],
    formulas=[dict(f="LocalOpt(N₁) ⊉ LocalOpt(N₂)", read="being stuck in one neighbourhood does not mean being stuck in another", why="Different moves reach different tours; a denser neighbourhood contains moves the sparse one lacks.")],
    why="Sparse neighbourhoods are cheap and do most of the work; dense ones are used only near the end, where they escape the sparse operator's traps.",
    traps=["The course version runs each MoveGen once, in order; some variants restart from MoveGen(1) after any improvement.", "A phase can make no progress at all: that is fine."],
    props=dict(complete="no", optimal="no", time="sum of the phases' hill climbs", space="O(n)"),
)

L["tsp-beam"] = dict(
    intro="Hill climbing follows one path. Beam search keeps a few of the best candidates at each level, a beam of width w, so a slightly worse option that leads somewhere better is not thrown away immediately.",
    definition="OPEN holds w tours. Each level, generate the neighbours of all tours in OPEN, keep the w best as the new OPEN, and stop when the best of the level is no better than the best seen before.",
    steps=[["OPEN ← [start]", ""], ["neighbours ← MoveGen(OPEN)", "Neighbours of every member, with duplicates merged."], ["OPEN ← the w best of neighbours", "This is the beam."], ["N ← head(OPEN)", "Best tour of the level."], ["while cost(N) < cost(bestEver)", "Stop when the level brings no improvement."]],
    formulas=[dict(f="memory = w, work per level ≈ w · |N|", read="width times neighbourhood size", why="Beam search trades memory for robustness; w = 1 is hill climbing, w = ∞ approaches breadth-first search.")],
    why="Keeping alternatives lets the search survive one bad step. A narrow beam can still miss the path to the optimum; a wide one costs more.",
    traps=["w = 1 behaves exactly like hill climbing.", "Merge duplicate tours when generating neighbours of several beam members.", "Stopping is on the level's best, not on any member improving."],
    props=dict(complete="no", optimal="no", time="w · |N| per level", space="O(w)"),
)

L["tsp-tabu"] = dict(
    intro="Tabu search always moves, even downhill, to escape local optima. To avoid simply stepping back to where it came from, it keeps a short-term memory of recent moves that are forbidden (tabu) for a few iterations.",
    definition="At each iteration, move to the best neighbour whose move is not tabu. Mark that move tabu for tt iterations (the tenure). A tabu move is allowed anyway if it gives a tour better than any seen (aspiration). Return the best tour seen.",
    steps=[["N ← start;  bestSeen ← N", ""], ["candidates ← MoveGen(N), best first", ""], ["first candidate that is not tabu (or beats bestSeen)", "This can be worse than N: that is how tabu escapes local optima."], ["make its key tabu for tt iterations", "Here the key is the swapped pair of cities."], ["N ← candidate; update bestSeen", "Return bestSeen at the end."]],
    formulas=[dict(f="tabu(m) ⇔ t < expiry(m),  expiry(m) = t(used) + tt", read="a move stays forbidden for tt iterations", why="Short tenure risks cycling; long tenure can block good moves."),
              dict(f="aspiration: allow m if cost(m(N)) < cost(bestSeen)", read="a forbidden move is fine if it finds a new best", why="Tabu exists to stop cycling, not to block real improvements.")],
    why="Memory turns a greedy walk into a systematic one. On small instances a short tenure leads to cycles; a frequency memory (prefer rarely-used moves) further diversifies the search.",
    traps=["Tabu takes the best non-tabu move even if it is worse than the current tour.", "Apply aspiration before rejecting a tabu move.", "Return bestSeen, not the final current tour."],
    props=dict(complete="no", optimal="no", time="iterations × |N|", space="O(tt)"),
)

L["tsp-ihc"] = dict(
    intro="If one hill climb gets stuck, start again from somewhere else. Iterated hill climbing repeats hill climbing from random starting tours and keeps the best local optimum found.",
    definition="Repeat r times: generate a random tour, hill climb to a local optimum, remember it if it is the best so far.",
    steps=[["repeat r times", ""], ["N ← random tour", "Exploration: a fresh starting point."], ["N ← HillClimbing(N)", "Exploitation: climb to the local optimum of that basin."], ["keep the best", ""]],
    formulas=[dict(f="P(success) ≈ 1 − (1 − p)^r", read="with r restarts, each landing in the optimum's basin with probability p", why="More restarts make it more likely that at least one starts in the right basin.")],
    why="Simple and effective when local optima are many but hill climbing is cheap. It wastes effort if most random starts lead to the same poor basin.",
    traps=["Each restart is independent: nothing is learned between restarts.", "Random starts are usually much worse than constructive tours."],
    props=dict(complete="no", optimal="no", time="r × hill climb", space="O(n)"),
)

L["tsp-random-walk"] = dict(
    intro="A random walk is the opposite extreme of hill climbing: it ignores costs entirely and steps to a random neighbour each time. It is a baseline that shows how much the evaluation function helps.",
    definition="From the current tour move to a uniformly random neighbour; record the best tour seen.",
    steps=[["N ← start", ""], ["N ← random neighbour of N", "No comparison with the current cost."], ["update bestSeen", "The only use of the cost function."]],
    formulas=[dict(f="P(next = X) = 1 / |N(current)|", read="every neighbour is equally likely", why="No bias toward better tours, so the walk drifts toward wherever most tours are: mostly bad ones.")],
    why="Pure exploration can in principle reach anything, but without guidance it rarely finds good tours in reasonable time.",
    traps=["Simulated annealing at very high temperature behaves almost like this (a coin flip per move)."],
    props=dict(complete="no", optimal="no", time="k samples", space="O(n)"),
)

L["tsp-sa"] = dict(
    intro="Simulated annealing borrows from metalworking: hot metal moves freely, then settles into a strong structure as it cools. The search accepts worse moves often while the 'temperature' is high, and becomes stricter as it cools.",
    definition="Pick a random neighbour X of the current tour N. Compute ΔE = cost(N) − cost(X) (positive means X is better) and move with probability P = 1/(1 + e^(−ΔE/T)). Lower T after each step.",
    steps=[["X ← random neighbour of N", "Random, not best: SA samples the neighbourhood."], ["ΔE ← cost(N) − cost(X)", "Positive ΔE = improvement (TSP minimises cost)."], ["P ← 1 / (1 + e^(−ΔE/T))", "The course's sigmoid acceptance rule."], ["if u < P: N ← X", "u is a uniform random number in [0,1)."], ["T ← α·T", "Geometric cooling, α slightly below 1."]],
    formulas=[dict(f="P = 1 / (1 + e^(−ΔE/T))", read="a sigmoid of ΔE scaled by temperature", why="ΔE > 0 gives P > ½, ΔE < 0 gives P < ½; larger |ΔE| pushes P toward 1 or 0."),
              dict(f="T → ∞: P → ½;   T → 0: P → 1 if ΔE > 0, 0 if ΔE < 0", read="hot = coin flip, cold = hill climbing", why="Temperature controls the balance between exploration and exploitation."),
              dict(f="Tₖ = T₀ · αᵏ", read="temperature after k steps", why="Slow cooling (α close to 1) gives more time to escape local optima.")],
    why="Accepting some worse moves lets SA leave local optima; cooling makes it settle. With this sigmoid rule even a better move can be rejected (P < 1), so always keep the best tour seen.",
    traps=["ΔE sign: define it so that positive means better for the problem at hand.", "With the sigmoid rule, P(better move) < 1 at finite T.", "Return bestSeen: the current tour can wander off the best one."],
    props=dict(complete="no", optimal="only with impractically slow cooling", time="k samples", space="O(n)"),
)

L["tsp-crossover-lab"] = dict(
    intro="Genetic algorithms combine two good tours into a child. For the TSP that is tricky: cutting two city lists and gluing the halves usually repeats some cities and loses others. TSP crossovers are designed to always produce valid tours.",
    definition="A crossover takes parent tours P1, P2 and builds a child that inherits structure from both: positions (cycle crossover), a segment plus positions (PMX), a segment plus relative order (order crossover), edges (alternating edges, heuristic crossover), or a prefix in ordinal code (ordinal crossover).",
    steps=[["CX: trace cycles", "From position i, look at P2[i], find that city's position in P1, repeat until back at i. Odd cycles from P1, even from P2."], ["PMX: copy a segment, then map", "Fill other positions from P2; if the city is already in the segment, follow the segment mapping until a free city appears."], ["OX: copy a segment, fill in P2's order", "The remaining cities appear in the order they have in P2."], ["AEX: alternate parents' edges", "Next city from P1, then P2, …; repair cycles."], ["HX: shorter parent edge", "From each city take whichever parent's next city is closer."], ["Ordinal: encode, cut, decode", "Index into the shrinking list of unvisited cities; any cut gives a valid child."]],
    formulas=[dict(f="ordinal gene i ∈ {1, …, n−i+1}", read="the i-th index points into the n−i+1 cities still unvisited", why="Any mix of two such sequences is still a legal sequence, so single-point crossover is always valid."),
              dict(f="adjacency: a[X] = city after X", read="store who comes next instead of the order", why="Tour cost depends on edges, so operators that pass on edges pass on the useful information.")],
    why="Each operator preserves a different property of the parents. Since cost depends on edges, edge- and order-preserving operators usually produce better children than position-preserving ones.",
    traps=["Know the exact fill convention for OX in your course (left to right here).", "PMX: keep following the mapping chain until the city is not already placed.", "Naive single-point crossover on paths is invalid in general."],
    props=dict(complete="n/a", optimal="n/a", time="O(n) to O(n²) per child", space="O(n)"),
)

L["tsp-ga"] = dict(
    intro="A genetic algorithm evolves a population of tours. Better tours are more likely to be chosen as parents, parents are combined by crossover, children are occasionally mutated, and the population slowly improves.",
    definition="Repeat for g generations: compute fitness, select N parents by roulette wheel (probability proportional to fitness), cross pairs, mutate with a small probability, and replace the weakest members with the strongest offspring.",
    steps=[["fitness(x) ← K / cost(x)", "TSP minimises cost, so fitness must grow as cost falls."], ["roulette wheel selection", "Spin N times: each spin picks member i with probability fᵢ / Σ f."], ["crossover pairs", "Use a TSP-safe crossover so children are valid tours."], ["mutation", "Swap two cities with a small probability to keep diversity."], ["replace the k weakest", "Keeps the good members (elitism-like)."]],
    formulas=[dict(f="pᵢ = fᵢ / Σⱼ fⱼ,   fᵢ = K / costᵢ", read="share of the wheel for member i", why="Fitter members get bigger slices, but every member keeps some chance."),
              dict(f="angleᵢ = 360° · pᵢ;   pick i if cumᵢ₋₁ < u ≤ cumᵢ", read="spin u in [0,1) and see which slice it lands in", why="This is how the course traces roulette selection by hand.")],
    why="Selection pushes toward good tours, crossover mixes their good parts, and mutation keeps exploring. Too much selection pressure makes the population identical too soon (premature convergence).",
    traps=["Fitness must be inverted for a minimisation problem.", "If the population converges early: raise mutation, lower selection pressure, enlarge the population.", "Cumulative probabilities decide roulette picks; recompute them carefully."],
    props=dict(complete="no", optimal="no", time="O(g · N · n)", space="O(N · n)"),
)

L["tsp-aco"] = dict(
    intro="Real ants find short paths by leaving pheromone: short routes are travelled more often, collect more pheromone, and attract more ants. Ant colony optimisation copies this with artificial ants building tours on a pheromone map.",
    definition="Each ant builds a tour, choosing the next city j from i with probability proportional to τᵢⱼ^α · (1/dᵢⱼ)^β. After all ants finish, pheromone evaporates by a factor (1−ρ) and each ant adds Q/L on the edges of its tour.",
    steps=[["τ ← τ₀ on every edge", "No preference at the start."], ["each ant builds a tour", "Probabilistic choice over unvisited cities only."], ["τ ← (1 − ρ) τ", "Evaporation forgets old information."], ["τᵢⱼ += Q / Lₖ for edges of ant k", "Shorter tours (small L) deposit more."], ["remember the best tour", ""]],
    formulas=[dict(f="P(i→j) = τᵢⱼ^α ηᵢⱼ^β / Σ over unvisited h of τᵢₕ^α ηᵢₕ^β,   η = 1/d", read="pheromone strength times visibility, normalised", why="α weighs learned experience, β weighs the greedy distance heuristic."),
              dict(f="τᵢⱼ ← (1 − ρ) τᵢⱼ + Σₖ Q / Lₖ", read="evaporate, then deposit in proportion to tour quality", why="Edges shared by many short tours grow; unused edges fade.")],
    why="Combines a greedy heuristic with experience shared through the environment. Large α can lock in early choices; large ρ forgets quickly and keeps exploring.",
    traps=["Normalise only over unvisited cities.", "Evaporate before depositing (course order).", "β = 0 ignores distance; α = 0 ignores pheromone and gives a randomised nearest neighbour."],
    props=dict(complete="no", optimal="no", time="O(m · n²) per iteration", space="O(n²)"),
)

# ---------------- graph search
common_graph = "A state-space search problem has a start node S, a goal test, and a MoveGen function that lists the neighbours of a node. The search keeps two lists: OPEN (nodes generated but not yet expanded) and CLOSED (nodes already expanded). Each entry is a node pair (node, parent, value) so the path can be read back through parents."
L["search-bfs"] = dict(
    intro="Breadth First Search explores in rings: first everything one step from the start, then two steps, and so on. It finds the path with the fewest edges.",
    definition=common_graph + " BFS treats OPEN as a queue: new children go to the back.",
    steps=[["OPEN ← [(S, nil, 0)]", ""], ["(N, parent, d) ← head(OPEN)", "Oldest entry first (queue)."], ["if GoalTest(N): return path", "The goal test is applied when a node is picked from OPEN, as in the course."], ["CLOSED ← (N, parent, d) : CLOSED", ""], ["children not on OPEN or CLOSED", "Graph search: seen nodes are not added again."], ["OPEN ← OPEN ++ children", "Append = queue = breadth first."]],
    formulas=[dict(f="nodes ≈ b^d", read="branching factor to the power of the goal depth", why="BFS must hold an entire level of the tree in OPEN: memory, not time, is its bottleneck.")],
    why="Complete on finite graphs and optimal when every edge costs the same. Uses a lot of memory.",
    traps=["Optimal in number of edges, not in total cost when edge costs differ.", "Children are added in MoveGen order (alphabetical here)."],
    props=dict(complete="yes", optimal="yes for unit costs", time="O(b^d)", space="O(b^d)"),
)
L["search-dfs"] = dict(
    intro="Depth First Search goes as deep as possible along one path before backing up. It needs little memory but can wander far from a nearby goal.",
    definition=common_graph + " DFS treats OPEN as a stack: new children go to the front.",
    steps=[["OPEN ← [(S, nil, 0)]", ""], ["(N, parent, d) ← head(OPEN)", "Newest entry first (stack)."], ["if GoalTest(N): return path", ""], ["CLOSED ← (N, parent, d) : CLOSED", ""], ["OPEN ← children ++ OPEN", "Prepend = stack = depth first."]],
    formulas=[dict(f="space ≈ b · m", read="branching factor times maximum depth", why="Only the current path and the siblings along it are stored.")],
    why="Memory-light, but neither optimal nor guaranteed to finish on infinite or very deep spaces.",
    traps=["The path found depends heavily on MoveGen order.", "Do not confuse the order children are pushed with the order they are expanded."],
    props=dict(complete="finite graphs only", optimal="no", time="O(b^m)", space="O(b·m)"),
)
L["search-dfid"] = dict(
    intro="Depth First Iterative Deepening runs DFS with a depth limit of 0, then 1, then 2, … It finds the same shallow path as BFS while using only DFS's memory.",
    definition="Repeat depth-bounded DFS (DB-DFS) with an increasing bound until the goal is found. DB-DFS does not expand nodes at depth equal to the bound.",
    steps=[["for bound ← 0, 1, 2, …", ""], ["DB-DFS(S, bound)", "A full DFS that stops descending at the bound."], ["if found: return", "The first bound that works is the shallowest goal depth."]],
    formulas=[dict(f="N(DFID) ≈ N(BFS) · b/(b−1)", read="extra work is a small factor of BFS", why="Most nodes of a tree are on the last level, so repeating the upper levels is cheap.")],
    why="Combines BFS's optimal depth with DFS's small memory; the repeated work is small for branching factors above 2.",
    traps=["Count expansions over all rounds, not just the last.", "With CLOSED checking, DB-DFS can miss a shallower route to a node seen earlier via a deeper path."],
    props=dict(complete="yes", optimal="yes for unit costs", time="O(b^d)", space="O(b·d)"),
)
L["search-ucs"] = dict(
    intro="Uniform Cost Search always expands the cheapest path found so far. With different edge costs it finds the cheapest route, not just the one with the fewest steps.",
    definition=common_graph + " OPEN is ordered by g(N), the cost from S to N. If a cheaper path to a node already seen is found, its parent and g are updated.",
    steps=[["OPEN ordered by g", "g(N) = cost of the best known path from S to N."], ["N ← least-g node", ""], ["if GoalTest(N): return", "When the goal is picked, no cheaper path to it can exist."], ["g' = g(N) + k(N, C)", "k is the edge cost."], ["update a node if g' is smaller", "Reopen it if it was on CLOSED."]],
    formulas=[dict(f="g(C) = g(N) + k(N, C)", read="cost so far plus the edge", why="Paths are extended one edge at a time."), dict(f="pick argmin g on OPEN", read="cheapest frontier node first", why="With non-negative costs this expands nodes in order of their true distance from S.")],
    why="Optimal for non-negative edge costs; it is Dijkstra's algorithm stopped at the goal. It explores in all directions because it has no idea where the goal is.",
    traps=["Apply the goal test when the goal is removed from OPEN, not when it is generated.", "Remember to update g and the parent on cheaper paths."],
    props=dict(complete="yes", optimal="yes", time="O(b^(1+C*/ε))", space="same"),
)
L["search-best-first"] = dict(
    intro="Best First Search uses a heuristic h(N), a guess of the distance from N to the goal, and always expands the node that looks closest to the goal.",
    definition=common_graph + " OPEN is ordered by h(N).",
    steps=[["OPEN ordered by h", "h is domain knowledge, e.g. straight-line distance."], ["N ← least-h node", "Ignores the cost already paid."], ["add unseen children", ""]],
    formulas=[dict(f="pick argmin h on OPEN", read="most promising-looking node first", why="Fast when h is accurate, but it ignores g, so the path found can be expensive.")],
    why="Often reaches the goal quickly, but is not optimal and can be misled by a poor heuristic.",
    traps=["Best First ignores g; A* adds it.", "Ties in h decide the path: state your tie-breaking."],
    props=dict(complete="finite graphs", optimal="no", time="O(b^m) worst case", space="O(b^m)"),
)
L["search-astar"] = dict(
    intro="A* combines the cost already paid with an estimate of the cost remaining. With an estimate that never overestimates, it finds the cheapest path and usually expands far fewer nodes than Uniform Cost Search.",
    definition=common_graph + " OPEN is ordered by f(N) = g(N) + w·h(N). With w = 1 and an admissible h this is A*; with w > 1 it is weighted A*.",
    steps=[["f(N) = g(N) + h(N)", "Estimated cost of the cheapest solution through N."], ["N ← least-f node", ""], ["if GoalTest(N): return", "With admissible h the first goal picked is optimal."], ["update cheaper paths", "Change parent and g; reopen CLOSED nodes if needed."]],
    formulas=[dict(f="f(N) = g(N) + h(N)", read="paid so far plus estimated remainder", why="Balances progress (g) against promise (h)."),
              dict(f="admissible: h(N) ≤ h*(N) for all N", read="never overestimate the true remaining cost", why="Then f never overestimates the true cost of a path through N, so the optimal path is never skipped."),
              dict(f="consistent: h(N) ≤ k(N,M) + h(M)", read="the triangle inequality for h", why="Then f never decreases along a path and closed nodes never need reopening."),
              dict(f="weighted A*: f = g + w·h, w > 1", read="trust the heuristic more", why="Faster, but the path can be up to w times the optimum.")],
    why="A* is optimal with an admissible h and is as efficient as any algorithm using the same h. Overestimating h (inadmissible) can make it return a worse path: try the 'inadmissible' example.",
    traps=["Admissible ≠ consistent: consistency implies admissibility, not the reverse.", "h = 0 makes A* behave like UCS.", "With an inadmissible h the first goal found may not be optimal."],
    props=dict(complete="yes", optimal="yes with admissible h", time="exponential in general", space="same"),
)

# ---------------- Week 3 / 6 graph search additions
L["search-hill-climbing"] = dict(
    intro="Hill climbing is the simplest way to use a heuristic: always step to the neighbour that looks closest to the goal, and stop when no neighbour looks better than where you are. It needs almost no memory, but it can stop on a hilltop that is not the summit.",
    definition="From the current node move to the child with the smallest h, provided it is strictly smaller than h(current). Otherwise stop and return the current node.",
    steps=[["node ← start", ""], ["newNode ← best child by h", "Only the children of the current node are compared."], ["while h(newNode) < h(node)", "Strict improvement is required; equal h means a plateau and the search stops."], ["return node", "This is a local optimum of h; it is the goal only if h(goal) is the only minimum reached."]],
    formulas=[dict(f="next = argmin over children C of h(C), accepted only if h(next) < h(current)", read="go to the best-looking child only if it is better than here", why="Greedy local improvement; there is no memory to back up from a dead end.")],
    why="Constant memory and very fast, but incomplete: local optima, plateaus and ridges stop it. The fixes are exactly the Week 3 ideas: beam search, random restarts, tabu memory, simulated annealing.",
    traps=["Hill climbing never backtracks.", "A plateau (equal h) stops the course version.", "Reaching a node with h = 0 that is not the goal means h is misleading there."],
    props=dict(complete="no", optimal="no", time="O(b) per step", space="O(1)"),
)
L["search-beam"] = dict(
    intro="Beam search is breadth-first search on a diet: at every level it keeps only the w most promising nodes by h and forgets the rest. A wider beam is safer, a narrower one is cheaper.",
    definition="Level by level, generate the children of every node in the beam, discard those seen before, and keep the w with the smallest h. Succeed when the goal enters the beam; fail when no new children remain.",
    steps=[["OPEN ← [start]", ""], ["children ← MoveGen of every node in the beam", "Nodes seen earlier are dropped (graph search)."], ["OPEN ← w best children by h", "Everything else is discarded for good: beam search cannot backtrack to it."], ["goal in OPEN → done", ""]],
    formulas=[dict(f="memory ≤ w per level", read="the beam width bounds the frontier", why="That is the whole point: predictable memory. w = 1 is hill climbing that may move uphill; w = ∞ is breadth-first search.")],
    why="Keeps several alternatives alive, so one bad estimate does not end the search, but anything outside the beam is lost forever.",
    traps=["Beam search is incomplete: the only path to the goal can fall outside the beam.", "Ties in h decide which nodes survive."],
    props=dict(complete="no", optimal="no", time="O(w · b · d)", space="O(w · d)"),
)
L["search-ida-star"] = dict(
    intro="A* is optimal but can run out of memory because OPEN grows exponentially. IDA* gets the same answer using memory proportional to the path length, by running depth-first searches with a growing cost limit.",
    definition="Repeat depth-first search from the start, refusing to go past any node whose f = g + h exceeds the current bound. The first bound is h(start); each next bound is the smallest f that was cut off in the previous pass.",
    steps=[["bound ← h(start)", "With admissible h this cannot exceed the optimal cost."], ["DFS with f ≤ bound", "Only the current path is stored; nodes already on the path are skipped to avoid cycles."], ["record the smallest f above the bound", "That is the next bound: no solution can be cheaper than it."], ["repeat until the goal is reached", "The first goal found is optimal."]],
    formulas=[dict(f="bound₀ = h(S),  boundₖ₊₁ = min { f(N) : f(N) > boundₖ }", read="raise the limit just enough to let in the next cheapest nodes", why="Never skipping a cost level means the first solution found is the cheapest."),
              dict(f="f(N) = g(N) + h(N)", read="cost so far plus estimated remainder", why="Same evaluation as A*.")],
    why="Optimal with admissible h and linear memory. It repeats work in every pass, which is cheap when f takes few distinct values and expensive when many nodes have different f.",
    traps=["Count expansions across all passes.", "IDA* has no CLOSED list, so on graphs it may revisit nodes by different paths."],
    props=dict(complete="yes", optimal="yes with admissible h", time="A* × number of bounds (worst case)", space="O(b·d)"),
)
L["search-rbfs"] = dict(
    intro="Recursive Best-First Search behaves like A* but stores only the current path. When the path it is exploring becomes worse than the best alternative elsewhere, it remembers how good that path turned out to be and switches.",
    definition="At each node, expand the child with the lowest backed-up value F while it stays below a limit (the best alternative higher up). When it exceeds the limit, return and replace the child's F by the best value found below it.",
    steps=[["F(child) ← max(g + h, F(parent))", "A child inherits its parent's backed-up value if that is larger."], ["best ← child with least F", ""], ["if F(best) > limit: return F(best)", "Report how good this subtree really is, so the parent can compare it with alternatives."], ["recurse with limit = min(limit, second-best F)", "Explore best until it looks worse than the runner-up."]],
    formulas=[dict(f="F(N) = backed-up minimum of f over N's explored subtree", read="the best f value seen below N", why="Lets RBFS return to a forgotten subtree knowing exactly how promising it was.")],
    why="Linear space and optimal with admissible h. It may re-expand the same nodes many times when the best path keeps switching.",
    traps=["The limit passed down is the second-best F, not the parent's f.", "Keep backed-up values; recomputing g + h throws the information away."],
    props=dict(complete="yes", optimal="yes with admissible h", time="can exceed A*", space="O(b·d)"),
)
L["search-dcfs"] = dict(
    intro="Most of A*'s memory is the CLOSED list, kept only to avoid regenerating expanded nodes and to rebuild the path. Frontier search drops CLOSED altogether; Divide and Conquer Frontier Search then rebuilds the path from a node remembered halfway along it.",
    definition="Run best-first search keeping only OPEN. Each OPEN node records which neighbours already used an edge into it, so expanded nodes are never regenerated. Each node also carries a relay node from the middle of its path. Once the goal is reached, solve start→relay and relay→goal the same way, recursively.",
    steps=[["OPEN only, with 'used' edge sets", "Instead of CLOSED, the frontier node remembers the edges already used."], ["relay ← first node with g ≥ C/2", "C is estimated as f(start)."], ["solve start→relay and relay→goal", "Each half is a smaller problem; the recursion rebuilds the full path."]],
    formulas=[dict(f="memory ≈ |frontier|, not |frontier| + |expanded|", read="only the boundary of the search is stored", why="For grid-like spaces (such as sequence alignment) the frontier is much smaller than the expanded region.")],
    why="Trades extra time (the recursive searches) for a large memory saving. It is the basis of memory-efficient sequence alignment.",
    traps=["Frontier search alone gives the cost, not the path: the relay recursion recovers it.", "The 'used' bookkeeping is what replaces the CLOSED check."],
    props=dict(complete="yes", optimal="yes with admissible h", time="a small multiple of one search", space="frontier only"),
)
L["search-monotone-check"] = dict(
    intro="A* is only as good as its heuristic. Two properties matter: admissibility (never overestimate the remaining cost) and the monotone or consistency condition (the estimate never drops by more than the cost of an edge). This tool checks both on any graph.",
    definition="Compute the true remaining cost h*(n) to the goal by Dijkstra's algorithm from the goal. h is admissible if h(n) ≤ h*(n) everywhere. h is monotone if h(m) ≤ k(m,n) + h(n) for every edge (m,n).",
    steps=[["h* by Dijkstra from the goal", "Exact distances, so the check is exact."], ["check h(n) ≤ h*(n) for each node", "Admissibility makes A* optimal."], ["check h(m) ≤ k(m,n) + h(n) for each edge", "Monotonicity makes f non-decreasing along every path."]],
    formulas=[dict(f="admissible: h(n) ≤ h*(n)", read="never overestimate", why="A* then never discards the optimal path."),
              dict(f="monotone: h(m) − h(n) ≤ k(m,n)", read="the estimate drops by at most the edge cost", why="Then f(n) = g(n) + h(n) ≥ g(m) + h(m) = f(m): f never decreases, so a node is closed with its optimal g and never reopened."),
              dict(f="monotone ∧ h(goal) = 0 ⇒ admissible", read="consistency is the stronger property", why="Summing the edge inequalities along the optimal path gives h(n) ≤ h*(n).")],
    why="Knowing which property holds tells you whether A* is optimal (admissible) and whether it may need to reopen closed nodes (not monotone).",
    traps=["Admissible does not imply monotone.", "Check both directions of an undirected edge."],
    props=dict(complete="n/a", optimal="n/a", time="O(E log V)", space="O(V)"),
)
L["align-dp"] = dict(
    intro="Comparing two DNA strings means lining them up with as few mismatches and gaps as possible. Every alignment is a path through a grid, so the best alignment is a shortest path, and dynamic programming finds it by filling a table.",
    definition="D(i,j) is the cheapest alignment of the first i letters of a with the first j letters of b. Fill the table from D(0,0) = 0 using three moves: diagonal (pair two letters), down (a letter of a against a gap), right (a letter of b against a gap). Trace back from D(m,n).",
    steps=[["D(i,0) = i·gap, D(0,j) = j·gap", "Aligning a prefix against nothing costs only gaps."], ["D(i,j) = min of three moves", "Diagonal, down or right, each adding its cost."], ["trace back from (m,n)", "Follow the move that produced each value to read the alignment."]],
    formulas=[dict(f="D(i,j) = min{ D(i−1,j−1) + c(aᵢ,bⱼ), D(i−1,j) + gap, D(i,j−1) + gap }", read="best of: pair the letters, gap in b, gap in a", why="Every alignment of the prefixes ends in exactly one of these three ways, so the minimum over them is optimal (optimal substructure).")],
    why="Exact and O(m·n). The same lattice can be searched by A* with an admissible heuristic, or with frontier ideas to cut memory, which is how the course connects alignment to search.",
    traps=["Costs are minimised here; scoring versions maximise similarity instead.", "Off-by-one: row i refers to letter aᵢ, i.e. a[i−1] in code."],
    props=dict(complete="yes", optimal="yes", time="O(m·n)", space="O(m·n)"),
)
L["align-astar"] = dict(
    intro="Dynamic programming fills the whole table. A* treats alignment as a shortest-path search on the same lattice and, with a good heuristic, explores only the part of the table near the best alignment.",
    definition="States are lattice points (i,j); moves are diagonal, down and right with their costs. h(i,j) = gap × |(m−i) − (n−j)| because the remaining length difference must be covered by gaps.",
    steps=[["start (0,0), goal (m,n)", ""], ["h = gap · |remaining length difference|", "Admissible and consistent."], ["A* with OPEN and CLOSED", "Stop when (m,n) is picked from OPEN."]],
    formulas=[dict(f="h(i,j) = gap · |(m − i) − (n − j)|", read="at least this many gaps are unavoidable", why="Each gap shortens the length difference by one, so this many gap moves remain in any completion: h never overestimates.")],
    why="Optimal like dynamic programming, usually with fewer states. With large sequences, frontier search and DCFS keep its memory small.",
    traps=["A weak h (such as 0) makes A* behave like Dijkstra and expand most of the table."],
    props=dict(complete="yes", optimal="yes", time="≤ O(m·n log)", space="≤ O(m·n)"),
)

# ---------------- Week 7 games
L["game-minimax"] = dict(
    intro="In a two-player game one player (MAX) wants a high score and the other (MIN) a low one. Minimax looks ahead to the end of the tree and assumes both play perfectly: MAX picks the child with the largest value, MIN the smallest.",
    definition="Evaluate leaves with the evaluation function e. Back values up the tree: a MAX node's value is the maximum of its children, a MIN node's value is the minimum. The root's value is the guaranteed outcome.",
    steps=[["leaf: return e(N)", "The static evaluation from MAX's point of view."], ["MAX node: max of children", "MAX chooses the move that is best for MAX."], ["MIN node: min of children", "MIN chooses the move that is worst for MAX."]],
    formulas=[dict(f="v(N) = max over C of v(C) at MAX,  min over C of v(C) at MIN", read="back up the best reply at every level", why="Assuming the opponent replies optimally, this is the best value MAX can guarantee.")],
    why="Correct but exhaustive: it evaluates every leaf, b^d of them.",
    traps=["Values are always from MAX's point of view.", "Evaluate left to right; the order matters for alpha-beta, not for minimax."],
    props=dict(complete="yes (finite tree)", optimal="yes against an optimal opponent", time="O(b^d)", space="O(b·d)"),
)
L["game-alpha-beta"] = dict(
    intro="Alpha-beta gives the same answer as minimax while skipping parts of the tree that cannot change the decision. If you already know a move gives you 3, you can stop examining another move as soon as you see the opponent can hold you to 2 there.",
    definition="Pass a window (α, β) down the tree. α is the best value MAX is already guaranteed, β the best value MIN is guaranteed. At a MAX node raise α; at a MIN node lower β; as soon as α ≥ β, prune the remaining children.",
    steps=[["call AlphaBeta(root, −∞, +∞)", ""], ["MAX: α ← max(α, child value)", "MAX's guarantee can only rise."], ["MIN: β ← min(β, child value)", "MIN's guarantee can only fall."], ["α ≥ β: prune", "β cut-off at a MAX node, α cut-off at a MIN node."]],
    formulas=[dict(f="prune when α ≥ β", read="the window is empty", why="MIN above will never allow a value ≥ β, and MAX above already has α: nothing in this subtree can affect the root."),
              dict(f="best case ≈ b^(d/2) leaves", read="with perfect move ordering", why="Good ordering lets each MIN node be refuted by its first child, effectively doubling the search depth for the same work.")],
    why="Always returns the minimax value. How much it prunes depends on move ordering: try the 'best first' and 'worst first' settings.",
    traps=["Pruned subtrees are never evaluated: count leaves carefully.", "The value returned at a pruned node is a bound, not an exact value; only the root's value is exact."],
    props=dict(complete="yes", optimal="same value as minimax", time="O(b^(d/2)) best, O(b^d) worst", space="O(b·d)"),
)
L["game-sss-star"] = dict(
    intro="SSS* treats game-tree search as best-first search over strategies. It keeps an OPEN list of node triples and always refines the most promising one, so it never looks at a leaf that alpha-beta would skip, and sometimes skips leaves alpha-beta looks at.",
    definition="OPEN holds triples (node, status, merit) where status is LIVE (not yet examined) or SOLVED. Starting from (root, LIVE, +∞), repeatedly take the triple with the highest merit and apply one of the six cases until the root is SOLVED; its merit is the minimax value.",
    steps=[["LIVE leaf", "Solve it with merit min(h, e(leaf))."], ["LIVE MAX node", "Add all children as LIVE with the same merit."], ["LIVE MIN node", "Add only the first child: a MIN node is refined one child at a time."], ["SOLVED node with MAX parent", "It is the MAX parent's best alternative (highest merit first), so the parent is solved; purge the parent's other descendants."], ["SOLVED node with MIN parent", "MIN's replies must all be examined: add the next sibling as LIVE, or solve the parent if this was the last child."]],
    formulas=[dict(f="merit h = upper bound on the value of the best strategy through the node", read="how good this line could still be for MAX", why="Taking the highest merit first is best-first search; the first solved root has the true value.")],
    why="Dominates alpha-beta in leaves evaluated, at the cost of an OPEN list that can grow large.",
    traps=["Ties in merit are broken by leftmost position.", "When a MAX parent is solved, remove all its other descendants from OPEN."],
    props=dict(complete="yes", optimal="minimax value", time="≤ alpha-beta leaves", space="O(b^(d/2))"),
)

# ---------------- Week 8 planning
plan_intro = "A planning problem gives an initial state, a goal and operators described in STRIPS form: each operator has preconditions, an add list and a delete list. In the blocks world the operators are pickup, putdown, stack and unstack, and AE means the arm is empty."
L["plan-forward"] = dict(
    intro=plan_intro + " Forward planning simply searches the state space from the initial state.",
    definition="Breadth-first search where a node is a state (a set of facts) and an edge applies an operator whose preconditions hold: S' = (S − delete) ∪ add.",
    steps=[["start from the initial state", ""], ["apply every applicable operator", "Preconditions must all be true in the state."], ["S' = (S − del) ∪ add", "STRIPS semantics: everything not deleted stays true."], ["stop when the goal facts all hold", "BFS gives a shortest plan."]],
    formulas=[dict(f="S' = (S − del(O)) ∪ add(O)", read="remove the delete list, add the add list", why="The STRIPS assumption: an action changes only what it explicitly says.")],
    why="Simple and complete, but the branching factor is every applicable action, most of them irrelevant to the goal.",
    traps=["Applicable is not the same as relevant: forward search wastes effort on irrelevant actions."],
    props=dict(complete="yes", optimal="shortest plan (BFS)", time="O(b^d)", space="O(b^d)"),
)
L["plan-backward"] = dict(
    intro=plan_intro + " Backward planning starts from the goal and asks which action could have achieved it last.",
    definition="Search over goal sets. An operator is relevant if it adds at least one goal and deletes none. Regressing goal set G through it gives (G − add) ∪ pre. Stop when the initial state satisfies the goal set.",
    steps=[["G ← goal", ""], ["relevant operators only", "Must add something in G and delete nothing in G."], ["G' = (G − add) ∪ pre", "What must be true before the action so that G holds after it."], ["stop when G ⊆ initial state", "The plan is the sequence of operators, read forwards."]],
    formulas=[dict(f="regress(G, O) = (G − add(O)) ∪ pre(O)", read="goals the action achieves are dropped, its preconditions are added", why="These are exactly the facts needed before O so that G holds after O.")],
    why="Focused on the goal, so the branching factor is small, but goal sets can be impossible (like holding a block with the arm empty) and must be pruned.",
    traps=["Discard inconsistent goal sets.", "An operator that deletes a goal cannot be the last step."],
    props=dict(complete="yes", optimal="shortest plan (BFS)", time="O(b^d) with smaller b", space="O(b^d)"),
)
L["plan-gsp"] = dict(
    intro=plan_intro + " Goal Stack Planning, the strategy of STRIPS, works through the goals one at a time using a stack.",
    definition="Push the conjunctive goal and its parts. Pop goals that hold. Replace an unsatisfied goal with an operator that achieves it and that operator's preconditions. When an operator reaches the top, apply it and add it to the plan. Re-check conjunctions, because later actions can undo earlier goals.",
    steps=[["push conjunct and each goal", "The order of the goals matters."], ["goal holds → pop", ""], ["goal fails → push operator + preconditions", "Heuristic choice: stack for on, unstack the block on top for clear, and so on."], ["operator on top → apply, record", "Its preconditions were just achieved."], ["conjunct broken → push its goals again", "This is where the Sussman anomaly costs extra steps."]],
    formulas=[dict(f="linear planning: solve g₁, then g₂, … in order", read="one goal at a time", why="Fine for independent goals; interacting goals (Sussman anomaly) make it undo its own work.")],
    why="Fast and easy to trace, but not optimal and sensitive to goal order: on the Sussman anomaly it needs 10 steps where 6 suffice.",
    traps=["Push preconditions so that the one to achieve first is on top.", "Always re-check the conjunct goal after its parts are popped."],
    props=dict(complete="no", optimal="no", time="linear in plan length (when it works)", space="O(plan length)"),
)
L["plan-pop"] = dict(
    intro=plan_intro + " Partial Order Planning searches the space of plans instead of states, adding steps and orderings only when it must.",
    definition="A partial plan has steps, ordering constraints, causal links (A achieves p for B) and open preconditions. Repeatedly support an open precondition with an existing or new step, then resolve threats (a step that deletes p and could fall between A and B) by ordering it before A (demotion) or after B (promotion). Backtrack on failure.",
    steps=[["Start < Finish", "Start's effects are the initial state; Finish's preconditions are the goal."], ["pick an open precondition", "Here: the most constrained one first."], ["add a causal link from an achiever", "Existing steps first, then new steps."], ["resolve threats", "Demotion or promotion, keeping the order acyclic."], ["no open preconditions → done", "Any linearisation of the steps is a valid plan."]],
    formulas=[dict(f="threat: K deletes p and possibly A < K < B for link A →p→ B", read="a step that could undo a protected condition", why="Ordering K outside the interval keeps every causal link safe, which guarantees the plan works."),
              dict(f="least commitment", read="order steps only when forced", why="Avoids the interaction problems that make linear planners fail on the Sussman anomaly.")],
    why="Finds the optimal 6-step plan for the Sussman anomaly by interleaving subgoals; the search can be expensive.",
    traps=["Check threats for new links and for new steps.", "Never order a step before Start or after Finish."],
    props=dict(complete="yes (with systematic search)", optimal="shortest plan with iterative deepening", time="exponential in the worst case", space="O(plan size) per partial plan"),
)

# ---------------- Week 9
L["andor-ao-star"] = dict(
    intro="Some problems split into subproblems that must all be solved (AND), while others offer alternative ways to proceed (OR). AO* searches such AND–OR graphs for the cheapest solution graph, revising its choices as costs become known.",
    definition="Each node has connectors: a single-child connector is an OR option, a multi-child connector is an AND arc. Cost of a connector = its arc costs + sum of its children's costs. A node's cost is its cheapest connector, which is marked. AO* expands an unexpanded node on the marked partial solution, then revises costs and markings upwards.",
    steps=[["trace marked connectors from the start", "This is the current best partial solution."], ["expand one unexpanded node on it", ""], ["revise costs bottom-up", "Recompute connector costs, mark the best, propagate to parents."], ["solved when the marked connector's children are all solved", "Repeat until the start is solved."]],
    formulas=[dict(f="cost(c) = Σ over children t of (k + cost(t))", read="every arc of a connector costs k, plus its children", why="An AND arc needs all its children, so their costs add."),
              dict(f="cost(n) = min over connectors c of n of cost(c)", read="choose the cheapest way to solve n", why="OR alternatives: only the best one is needed.")],
    why="With admissible estimates AO* finds an optimal solution graph. The marked solution can change as estimates are corrected, which is visible in the trace.",
    traps=["An AND connector costs the sum, not the minimum, of its children.", "Propagate revisions to all ancestors whose marked connector uses the node."],
    props=dict(complete="yes", optimal="yes with admissible h", time="exponential in general", space="the explicit graph"),
)

# ---------------- Week 10
L["rules-forward-chaining"] = dict(
    intro="A rule-based system holds facts in working memory and knowledge as if–then rules. Forward chaining starts from the facts and keeps firing rules whose conditions match until nothing new can be derived.",
    definition="The recognise–act cycle: match all rules against working memory to form the conflict set of rule instantiations; resolve the conflict by choosing one (rule order, recency, specificity); execute its actions; repeat. A fired instantiation is not fired again (refractoriness).",
    steps=[["MATCH", "Find every way to bind each rule's variables to facts."], ["RESOLVE", "Choose one instantiation by the strategy."], ["EXECUTE", "Add or remove facts."], ["stop when the conflict set is empty", ""]],
    formulas=[dict(f="instantiation = (rule, variable bindings)", read="a rule with its ?variables filled in consistently", why="The same rule can fire several times with different bindings.")],
    why="Data-driven reasoning, natural for monitoring and configuration. Naive matching repeats work each cycle; Rete removes that cost.",
    traps=["A variable must bind to the same value in every condition of a rule.", "Conflict resolution changes the order, not the final set of derived facts (for rules that only add)."],
    props=dict(complete="derives every consequence (add-only rules)", optimal="n/a", time="match cost per cycle", space="WM + conflict set"),
)
L["rules-rete"] = dict(
    intro="Most cycles of a rule system change only a few facts, yet naive matching re-checks every rule against everything. The Rete algorithm compiles the rules into a network that remembers partial matches, so each new fact is matched only where it matters.",
    definition="Alpha nodes test single patterns and store matching facts. Beta (join) nodes combine a stored partial match (token) from the left with a fact from the right when their variable bindings agree, and pass the result on. Terminal nodes add complete matches to the conflict set. Rules that share leading patterns share nodes.",
    steps=[["compile the rules", "One alpha memory per distinct pattern; a chain of joins per rule, shared where prefixes coincide."], ["add a fact", "It enters the alpha memories it matches."], ["join", "Combine with stored tokens that agree on shared variables."], ["terminal", "A complete token is a rule instantiation."]],
    formulas=[dict(f="work per new fact ∝ affected tokens, not |rules| × |WM|", read="incremental matching", why="Stored partial matches mean old facts are never matched again.")],
    why="Trades memory (all partial matches) for speed, which made large production systems practical.",
    traps=["Joins compare bindings of shared variables only.", "Node sharing comes from identical condition prefixes."],
    props=dict(complete="same matches as naive matching", optimal="n/a", time="proportional to change", space="all partial matches"),
)

# ---------------- Week 11
csp_intro = "A constraint satisfaction problem has variables, each with a domain of values, and constraints saying which combinations are allowed. A solution assigns every variable a value from its domain so that every constraint holds."
L["csp-backtracking"] = dict(
    intro=csp_intro + " Backtracking is depth-first search over partial assignments.",
    definition="Assign variables in a fixed order. Try each value; keep it if it is consistent with the earlier assignments and continue; if no value works, return to the previous variable and try its next value.",
    steps=[["pick the next variable", "Static order here, or most-constrained first."], ["try values in order", ""], ["consistent with earlier assignments?", "Only constraints with already assigned variables can be checked."], ["no value left → backtrack", "Undo the last assignment."]],
    formulas=[dict(f="search tree size ≤ d + d² + … + dⁿ", read="up to dⁿ complete assignments", why="Each level multiplies the branches by the domain size.")],
    why="Complete and simple, but it discovers failures late. Look-ahead (forward checking) and consistency (arc consistency) detect them earlier.",
    traps=["Count every value tried as a node.", "Backtracking returns to the most recent variable, even if it is not the cause of the failure."],
    props=dict(complete="yes", optimal="n/a (any solution)", time="O(dⁿ)", space="O(n)"),
)
L["csp-forward-checking"] = dict(
    intro=csp_intro + " Forward checking combines search with a little reasoning: it looks ahead after each assignment.",
    definition="After assigning X = a, remove from the domains of X's unassigned neighbours every value that conflicts with a. If a domain becomes empty, reject a immediately.",
    steps=[["assign X = a", ""], ["prune neighbours' domains", "Only constraints between X and future variables are used."], ["empty domain → try the next value", "The dead end is found before descending."]],
    formulas=[dict(f="D(Y) ← { b ∈ D(Y) : (a, b) allowed by C(X,Y) }", read="keep only values compatible with the new assignment", why="Any value removed could never be part of a solution extending X = a.")],
    why="Usually far fewer nodes than plain backtracking; pairs well with choosing the variable with the smallest remaining domain (MRV).",
    traps=["Forward checking does not check two future variables against each other; arc consistency does."],
    props=dict(complete="yes", optimal="n/a", time="O(dⁿ) worst case", space="O(n·d) for domain copies"),
)
L["csp-ac3"] = dict(
    intro=csp_intro + " Arc consistency removes values that cannot possibly be part of any solution, before or during search.",
    definition="An arc (X, Y) is consistent if every value of X has some supporting value in Y. Revise(X, Y) deletes unsupported values. AC-1 revises every arc until a whole pass changes nothing; AC-3 keeps a queue and re-examines only arcs pointing into a variable whose domain just shrank.",
    steps=[["queue all arcs", "Both directions of every constraint."], ["Revise(X, Y)", "Delete values of X with no support in Y."], ["if D(X) shrank: queue (Z, X)", "Neighbours of X may have lost their support."], ["queue empty → arc consistent", "Empty domain: no solution. All singletons: solved."]],
    formulas=[dict(f="a ∈ D(X) survives ⇔ ∃ b ∈ D(Y): (a, b) ∈ C(X, Y)", read="a value needs a partner on every arc", why="A value with no partner can never satisfy that constraint, so it can be deleted safely."),
              dict(f="AC-3: O(e · d³)", read="each arc is re-queued at most d times, each revision costs d²", why="Domains only shrink, so the work is bounded.")],
    why="Cheap reasoning that shrinks domains; sometimes it solves the problem outright (the chain example), sometimes it only prunes (map colouring).",
    traps=["Arcs are directed: (X, Y) and (Y, X) are different.", "Arc consistency does not guarantee a solution exists."],
    props=dict(complete="no (filtering only)", optimal="n/a", time="O(e·d³)", space="O(e)"),
)
L["csp-waltz"] = dict(
    intro="How do we see 3D shapes in a line drawing? Waltz showed that each junction of lines allows only a few physical interpretations, and that neighbouring junctions must agree. Propagating that agreement usually leaves a single interpretation.",
    definition="Lines get labels: + (convex edge), − (concave edge) or an arrow (occluding boundary, object on the right). Each junction type (L, fork, arrow, T) has a catalogue of allowed labellings (6, 5, 3, 4: the Huffman–Clowes catalogue). Waltz filtering is arc consistency between junctions that share a line.",
    steps=[["classify junctions by geometry", "Two lines: L. Three: fork (all angles < 180°), arrow (one angle > 180°), T (two lines collinear)."], ["start with full catalogues", ""], ["background constraint", "Outer boundary lines are arrows going clockwise around the object."], ["propagate", "Delete labellings that no labelling at the other end of a line agrees with."]],
    formulas=[dict(f="18 junction labellings: L 6, fork 5, arrow 3, T 4", read="the Huffman–Clowes catalogue for trihedral scenes", why="Only these arise from corners where three planes meet, viewed generically."),
              dict(f="agree(+,+), agree(−,−), agree(→ leaving J, → entering K)", read="a line has one label seen from both ends", why="This is the binary constraint propagated between junctions.")],
    why="Constraint propagation instead of search: the cube drawing becomes unambiguous once the background is fixed. Without that, several interpretations survive.",
    traps=["Arrow labels are relative to direction: 'out' at one end is 'in' at the other.", "Arc consistency can leave several labellings; a search step picks among them."],
    props=dict(complete="filtering only", optimal="n/a", time="linear for planar drawings", space="O(junctions)"),
)
L["csp-diagnosis"] = dict(
    intro="When a device misbehaves, model-based diagnosis asks: which components, if broken, would explain what we observe? It uses models of how each component should behave and looks for contradictions.",
    definition="Assume a set of components works and propagate values through their models. A contradiction with an observation means that set cannot all be working: it is a conflict set. A diagnosis is a minimal set of components that intersects every minimal conflict.",
    steps=[["propagate with every component assumed OK", "Find the first contradiction."], ["find minimal conflicts", "Smallest sets of components whose joint correctness contradicts the observations."], ["minimal hitting sets", "Each must contain at least one component from every conflict."]],
    formulas=[dict(f="diagnosis D: D ∩ C ≠ ∅ for every conflict C, D minimal", read="blame at least one component in every conflict", why="If any conflict had no faulty member, the contradiction would remain.")],
    why="The polybox has conflicts {M1, M2, A1} and {M1, M3, A1, A2}, giving the diagnoses {M1}, {A1}, {M2, M3}, {M2, A2}.",
    traps=["A conflict lists the components used to derive the contradiction, not just the one producing the wrong output.", "Diagnoses are minimal: supersets also explain the symptoms but are less likely."],
    props=dict(complete="yes (all minimal diagnoses)", optimal="n/a", time="exponential in components (direct form)", space="O(conflicts)"),
)
