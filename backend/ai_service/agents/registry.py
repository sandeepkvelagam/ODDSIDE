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

    def to_anthropic_tools(self) -> List[Dict]:
        """Get all agents in Anthropic tool use format"""
        return [agent.to_anthropic_tool() for agent in self._agents.values()]

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
        elif any(kw in task_lower for kw in ["chat", "group chat", "conversation", "respond"]):
            return self.get("group_chat")
        elif any(kw in task_lower for kw in ["plan game", "suggest game", "next game", "weekend", "holiday"]):
            return self.get("game_planner")
        elif any(kw in task_lower for kw in [
            "engagement", "inactive", "nudge", "milestone", "re-engage"
        ]):
            return self.get("engagement")
        elif any(kw in task_lower for kw in [
            "feedback", "bug", "survey", "complaint", "feature request",
            "report issue", "broken", "not working"
        ]):
            return self.get("feedback")
        elif any(kw in task_lower for kw in [
            "reconcil", "overdue", "unpaid", "outstanding payment",
            "consolidat", "non-payer", "nonpayer", "payment health",
            "payment report", "settle up", "who owes"
        ]):
            return self.get("payment_reconciliation")
        elif any(kw in task_lower for kw in [
            "automation", "automate", "ifttt", "auto-rsvp", "auto rsvp",
            "when game", "when payment", "when someone", "auto remind",
            "set up rule", "create rule", "my rules", "triggers",
        ]):
            return self.get("user_automation")

        # Default to None, let orchestrator handle
        return None


# Global registry instance
agent_registry = AgentRegistry()
