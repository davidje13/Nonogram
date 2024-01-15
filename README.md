# Nonogram

A nonogram (also known as picross) solver and web player.

Includes an editor with automatic detection of ambiguous games, and a player with
the ability to show hints.

Solving uses various techniques: the simplest applies a 1D solver to each rule in
turn (described below). If this cannot make progress, a map of direct implications
is created and traversed to find obvious contradictions and tautologies. If this
also fails to resolve any squares, the solver falls back to forking the game state
by setting a cell to both ON and OFF, and continuing each branch until a
contradiction is found on one of them (or, if no contradictions are found on either
branch, it marks the game as ambiguous).

When offering hints, several 'simpler' methods are also used, with their results
being preferred as easier for players to understand.

## Running

```bash
./bin/solve.mjs games/football.json
```

> ```
> Solving games/football.json
>                                1  1
>                                1  1     3     3
>                          3  2  1  3  2  3  5  1  2  3     2  2
>                 1  2  2  1  1  2  1  6  9  3  2  1  3  2  1  2  2
>              2  2  3  3  1  1  2  3  4  1  2  2  7  2  4  2  1  2  1  1
>           3                               ## ## ##
>           5                            ## ## ## ## ##
>         3 1                            ## ## ##    ##
>         2 1                            ## ##       ##
>       3 3 4                   ## ## ##    ## ## ##    ## ## ## ##
>       2 2 7             ## ##       ## ##          ## ## ## ## ## ## ##
>       6 1 1       ## ## ## ## ## ##    ##          ##
>       4 2 2    ## ## ## ##          ## ##       ## ##
>         1 1                         ##          ##
>         3 1                      ## ## ##       ##
>           6                      ## ## ## ## ## ##
>         2 7    ## ##          ## ## ## ## ## ## ##
>       6 3 1 ## ## ## ## ## ##       ## ## ##    ##
>   1 2 2 1 1 ##    ## ##       ## ##    ##       ##
>     4 1 1 3          ## ## ## ##       ##    ##       ## ## ##
>       4 2 2                         ## ## ## ##    ## ##    ## ##
>       3 3 1                         ## ## ##       ## ## ##    ##
>         3 3                      ## ## ##             ## ## ##
>           3                   ## ## ##
>         2 1                   ## ##    ##
>
> Short image: LSJGLQRYQShD41JJX_QjekiFT8-SPTj3J0IIfSiK_ri16tDFuy00opFQpBLos
> Short rules: RSJH58Z7Dnyl9tWtZGp7r8XqjLwdrazUm-812Xl5kSoFuEelf7b7FW0LhH2lo-VloqQ
> Solving time: 140.1ms
> ```

## Methods

### Isolated Rules

The `isolated-rules` solver will resolve all possible cells based soely on one rule at
a time. The `perl-regexp` sub-solver will resolve all possible state from an individual
rule.

The method is similar to a regular expression. At a high-level, each rule compiles to a
regular expression which is applied to the current state of the row or column using a
perl-like state machine. Then each cell is checked in reverse; if all state machine states
for the current cell which result in a successful match are of the same type, the cell's
type can be asserted. This method runs in `O(n^2)` time at worst (for `n` cells) and
for typical rules runs in closer to `O(n)` time.

For example:

1. The rule is `[4, 2]` and the game state is `iyiiiiii`
   (`y` is ON, `n` is OFF, `i` is indeterminate)
2. The rule is compiled to (roughly):
   ```
   ^[ni]*[yi][yi][yi][yi][ni]+[yi][yi][ni]*$    <-- regex interpretation
   0 1    2   3   4   5   6    7   8   9   10   <-- state number
   ```
   Which can also be visualised as a graph:
   ```
   0---1---2-3-4-5--6--7-8---9---10
    \ (_) /        (_)    \ (_) /
     \___/                 \___/
   ```
3. The regular expression state machine advances along the input, recording possible
   states for each cell:
   ```
   ^  i  y  i  i  i  i  i  i  $  <-- input
   0--1--2--3--4--5--6--7--8     <-- possible states for current cell (left-to-right)
   |                / \     \
   |               /    6--7 \
   |              |      \    |
    \             |        6  |
     \            |           |
      2--3--4--5--6--7--8--9-[10]
   ```
4. All valid paths are traced backwards from the end state. In this example the valid
   paths are:
   ```
   ^  i  y  i  i  i  i  i  i  $  <-- input
   0--1--2--3--4--5--6--7--8     <-- valid state paths
    \               /       \
     \             /         \
      2--3--4--5--6--7--8--9-[10]

   0  1  2  3  4  5  6  7  8  10 <-- flattened states per cell
      2  3  4  5  6  7  8  9
   ```
5. Each state has an associated cell type. Identify cells where all possible states
   share the same cell type:
   ```
   ^  i  y  i  i  i  i  i  i  $  <-- input
   -  n  y  y  y  y  n  y  y  -  <-- state cell types
      y  y  y  y  n  y  y  n

      ?  y  y  y  ?  ?  y  ?     <-- resolved cell value
   ```
6. The output is `iyyyiiyi`.

As this solver only considers one rule at a time, it can get stuck in various
situations. When more than one rule is needed to make progress, another solver
is required;

### Implications

The `implications` solver will build a map of all the implications which can be
resolved from considering one rule at a time:

```
(2,3) = ON  => (8,3) = OFF
(2,3) = OFF => (2,2) = OFF
(5,6) = ON  => (5,7) = ON
etc.
```

This map is built using a 1D solver, as described above.

It will then traverse the resulting graph looking for contradictions. For example:

```
(1,1) = ON  => (1,2) = ON
(1,2) = ON  => (2,2) = ON
(1,1) = ON  => (2,1) = ON
(2,1) = ON  => (2,2) = OFF
```

If a graph contained these implications, cell (1,1) cannot be ON, as it would
cause a contradiction in cell (2,2). As a result, the rule marks cell (1,1) as
OFF.

In some cases, it may also find tautologies. For example:

```
(1,1) = ON  => (1,2) = OFF
(1,2) = OFF => (2,2) = OFF
(1,1) = OFF => (2,1) = ON
(2,1) = ON  => (2,2) = OFF
```

In this case, cell (2,2) must be OFF regardless of the value of cell (1,1).

The graph is searched to a configurable depth (infinite by default), but cannot
account for situations where two pieces of information in the same row or column
must be taken together to infer a third. For such situations, the final solver is
required;

### Fork

The `fork` solver is used as a last resort if no other solvers can make progress.
It picks an unknown cell which is likely to have a large impact on the game when
resolved as ON or OFF, and splits the game into 2: one with the cell marked ON,
and one with it marked OFF. Both branches then continue to be solved (and may
split again recursively) until one of them reaches a conflict. The game then
continues with the state from the other branch.

If both branches complete without a conflict, the game is ambiguous.
