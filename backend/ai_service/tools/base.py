"""
Base Tool class for all AI tools
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel


class ToolResult(BaseModel):
    """Standard result format for all tools"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None


class BaseTool(ABC):
    """
    Base class for all AI tools.

    Tools are deterministic functions that perform specific tasks.
    They should be:
    - Stateless (no side effects between calls)
    - Idempotent when possible
    - Well-documented for LLM tool selection
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for the tool"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description for LLM tool selection"""
        pass

    @property
    @abstractmethod
    def parameters(self) -> Dict:
        """JSON schema of input parameters"""
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with given parameters"""
        pass

    def to_openai_function(self) -> Dict:
        """Convert tool to OpenAI function calling format"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }

    def to_anthropic_tool(self) -> Dict:
        """Convert tool to Anthropic tool use format"""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters
        }
