# Nonogram solver

Uses repeated applications of a 1D solver to solve nonograms (also known as picross).
Falls-back to guessing and checking for contradictions if the 1D solver is unable to
make progress on its own.

## Running

```bash
./src/index.js games/football.json
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
> Short image: 5uYAOAAHwAB0AAZAA7vAzH8_RAeMwACIAByAAfgGP4D86As0gB5TgA9sAOdAHDgDgAA0AA
> Short rules: 5uaSyUhJmiIxMFKiBSUwIxMJRiFKWSogmUmSSEgYIkiSVIUViBZZIwomc25gliCHEmYIohgiEiBE
> Solving time: 76.4ms
> ```

## Method

The 1D solver will resolve all possible cells based soely on one rule at a time.

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

This method is unable to use information from more than one rule at a time; for that the
solver falls back to splitting into 2 games; one with a cell on and one with it off. Both
games are advanced and if either results in a contradiction, the other must be correct.
If both games result in a successful output, the game is ambiguous and both states are
printed.
