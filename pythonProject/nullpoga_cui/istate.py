from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List


class IState(ABC):
    @abstractmethod
    def legal_actions(self) -> List[int]:
        pass

    @abstractmethod
    def random_action(self) -> int:
        pass

    @abstractmethod
    def next(self, action: int) -> IState:
        pass

    @abstractmethod
    def is_lose(self) -> bool:
        pass

    @abstractmethod
    def is_draw(self) -> bool:
        pass

    @abstractmethod
    def is_done(self) -> bool:
        pass

    @abstractmethod
    def is_first_player(self) -> bool:
        pass
