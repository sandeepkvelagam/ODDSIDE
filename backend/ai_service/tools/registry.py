"""
Tool Registry - Central registry for all available tools
"""

from typing import Dict, List, Optional
from .base import BaseTool, ToolResult


class ToolRegistry:
    """
    Central registry for all AI tools.

    Usage:
        registry = ToolRegistry()
        registry.register(PokerEvaluatorTool())
        registry.register(NotificationSenderTool())

        # Get tool by name
        tool = registry.get("poker_evaluator")

        # Execute tool
        result = await tool.execute(hole_cards=[...], community_cards=[...])
    """

    _instance = None
    _tools: Dict[str, BaseTool] = {}

    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tools = {}
        return cls._instance

    def register(self, tool: BaseTool) -> None:
        """Register a tool"""
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        """List all registered tool names"""
        return list(self._tools.keys())

    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools"""
        return list(self._tools.values())

    def to_openai_functions(self) -> List[Dict]:
        """Get all tools in OpenAI function calling format"""
        return [tool.to_openai_function() for tool in self._tools.values()]

    def to_anthropic_tools(self) -> List[Dict]:
        """Get all tools in Anthropic tool use format"""
        return [tool.to_anthropic_tool() for tool in self._tools.values()]

    async def execute(self, tool_name: str, **kwargs) -> ToolResult:
        """Execute a tool by name"""
        tool = self.get(tool_name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool '{tool_name}' not found"
            )
        return await tool.execute(**kwargs)


# Global registry instance
tool_registry = ToolRegistry()
