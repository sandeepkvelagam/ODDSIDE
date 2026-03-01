"""
Flow Engine — Deterministic multi-step conversation flows.

Flows are stateless state machines driven by flow_event payloads from the frontend.
Each step returns a structured_content dict that the frontend renders as an
interactive card. flow_data carries accumulated state across steps.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class FlowResult:
    text: str
    structured_content: Optional[Dict] = None
    follow_ups: List[str] = field(default_factory=list)
    source: str = "flow"


class BaseFlow(ABC):

    @property
    @abstractmethod
    def flow_id(self) -> str:
        pass

    @abstractmethod
    async def start(self, user_id: str, db: Any) -> FlowResult:
        pass

    @abstractmethod
    async def advance(
        self,
        step: int,
        action: str,
        value: str,
        flow_data: Dict,
        user_id: str,
        interaction_id: str,
        db: Any,
    ) -> FlowResult:
        pass


# ─── Flow Registry ───────────────────────────────────────────

_FLOW_REGISTRY: Dict[str, BaseFlow] = {}


def register_flow(flow: BaseFlow):
    _FLOW_REGISTRY[flow.flow_id] = flow


def get_flow(flow_id: str) -> Optional[BaseFlow]:
    return _FLOW_REGISTRY.get(flow_id)
