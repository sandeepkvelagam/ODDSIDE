"""
Agent Registry - Central registry for all available agents
"""

from typing import Dict, List, Optional
from .base import BaseAgent


class AgentRegistry:
    """
    Central registry for all AI agents.

    Usage:
        registry = AgentRegistry()
        registry.register(GameSetupAgent())

        agent = registry.get("game_setup")
        result = await agent.execute("Create a game for Friday night")
    """

    _instance = None
    _agents: Dict[str, BaseAgent] = {}

    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._agents = {}
        return cls._instance

    def register(self, agent: BaseAgent) -> None:
        """Register an agent"""
        self._agents[agent.name] = agent

    def get(self, name: str) -> Optional[BaseAgent]:
        """Get an agent by name"""
        return self._agents.get(name)

    def list_agents(self) -> List[str]:
        """List all registered agent names"""
        return list(self._agents.keys())

    def get_all_agents(self) -> List[BaseAgent]:
        """Get all registered agents"""
        return list(self._agents.values())

    def get_agent_for_task(self, task_description: str) -> Optional[BaseAgent]:
        """
        Get the best agent for a given task.
        Simple keyword matching for now; could use LLM for better selection.
        """
        task_lower = task_description.lower()

        # Simple keyword matching
        if any(kw in task_lower for kw in ["create game", "setup", "schedule", "invite"]):
            return self.get("game_setup")
        elif any(kw in task_lower for kw in ["notify", "alert", "remind", "message"]):
            return self.get("notification")
        elif any(kw in task_lower for kw in ["report", "stats", "analytics", "summary", "leaderboard"]):
            return self.get("analytics")

        # Default to None, let orchestrator handle
        return None


# Global registry instance
agent_registry = AgentRegistry()
