"""The four search algorithms, all operating on the same SearchProblem."""

from __future__ import annotations

from typing import Callable

from ..problem import SearchProblem
from ..result import SearchResult
from .astar import astar
from .bfs import bfs
from .dfs import dfs
from .greedy import greedy

SearchFn = Callable[..., SearchResult]

#: Display name -> function, in presentation order.
ALGORITHMS: dict[str, SearchFn] = {"BFS": bfs, "DFS": dfs, "Greedy": greedy, "A*": astar}

_ALIASES = {"bfs": "BFS", "dfs": "DFS", "greedy": "Greedy", "gbfs": "Greedy", "astar": "A*", "a*": "A*"}


def get_algorithm(name: str) -> tuple[str, SearchFn]:
    key = _ALIASES.get(name.strip().lower())
    if key is None:
        raise ValueError(f"Unknown algorithm {name!r}. Choose from: bfs, dfs, greedy, astar.")
    return key, ALGORITHMS[key]


__all__ = ["ALGORITHMS", "SearchProblem", "SearchResult", "astar", "bfs", "dfs", "get_algorithm", "greedy"]
