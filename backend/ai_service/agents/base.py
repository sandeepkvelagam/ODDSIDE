"""
Base Agent class for all AI agents
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AgentResult(BaseModel):
    """Standard result format for agent executions"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    steps_taken: List[Dict] = []
    next_actions: List[str] = []


class BaseAgent(ABC):
    """
    Base class for all AI agents.

    Agents are orchestrators that:
    - Understand user intent
    - Select appropriate tools
    - Execute multi-step workflows
    - Handle errors and edge cases
    - Maintain conversation context
    """

    def __init__(self, tool_registry=None, db=None, llm_client=None):
        self.tool_registry = tool_registry
        self.db = db
        self.llm_client = llm_client
        self.conversation_history = []

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for the agent"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what this agent does"""
        pass

    @property
    @abstractmethod
    def capabilities(self) -> List[str]:
        """List of capabilities this agent has"""
        pass

    @property
    def available_tools(self) -> List[str]:
        """List of tool names this agent can use"""
        return []

    @abstractmethod
    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute the agent's task based on user input"""
        pass

    async def call_tool(self, tool_name: str, **kwargs) -> Dict:
        """Call a tool from the registry"""
        if not self.tool_registry:
            return {"error": "Tool registry not available"}

        result = await self.tool_registry.execute(tool_name, **kwargs)
        return result.model_dump()

    def add_to_history(self, role: str, content: str):
        """Add a message to conversation history"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []

    def get_system_prompt(self) -> str:
        """Get the system prompt for this agent"""
        return f"""You are {self.name}, an AI agent specialized in {self.description}.

Your capabilities:
{chr(10).join(f'- {cap}' for cap in self.capabilities)}

Available tools:
{chr(10).join(f'- {tool}' for tool in self.available_tools)}

Always be helpful, accurate, and concise."""
