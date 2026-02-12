"""
AI Orchestrator

The central coordinator for all AI operations in Kvitt.

The orchestrator:
1. Receives user requests
2. Determines intent and selects appropriate agent/tool
3. Executes the request
4. Handles errors and fallbacks
5. Logs all operations for analytics
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
import logging

from .tools.registry import ToolRegistry
from .agents.registry import AgentRegistry

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    Central orchestrator for all AI operations.

    Usage:
        orchestrator = AIOrchestrator(db=db)
        result = await orchestrator.process("Create a game for Friday night", context={...})
    """

    def __init__(self, db=None, llm_client=None):
        self.db = db
        self.llm_client = llm_client
        self.tool_registry = ToolRegistry()
        self.agent_registry = AgentRegistry()

        # Initialize tools and agents
        self._setup_tools()
        self._setup_agents()

    def _setup_tools(self):
        """Register all available tools"""
        from .tools.poker_evaluator import PokerEvaluatorTool
        from .tools.notification_sender import NotificationSenderTool
        from .tools.game_manager import GameManagerTool
        from .tools.scheduler import SchedulerTool
        from .tools.report_generator import ReportGeneratorTool
        from .tools.email_sender import EmailSenderTool
        from .tools.host_decision import HostDecisionTool
        from .tools.smart_config import SmartConfigTool
        from .tools.payment_tracker import PaymentTrackerTool

        self.tool_registry.register(PokerEvaluatorTool())
        self.tool_registry.register(NotificationSenderTool(db=self.db))
        self.tool_registry.register(GameManagerTool(db=self.db))
        self.tool_registry.register(SchedulerTool(db=self.db))
        self.tool_registry.register(ReportGeneratorTool(db=self.db))
        self.tool_registry.register(EmailSenderTool(db=self.db))
        self.tool_registry.register(HostDecisionTool(db=self.db))
        self.tool_registry.register(SmartConfigTool(db=self.db))
        self.tool_registry.register(PaymentTrackerTool(db=self.db))

    def _setup_agents(self):
        """Register all available agents"""
        from .agents.game_setup_agent import GameSetupAgent
        from .agents.notification_agent import NotificationAgent
        from .agents.analytics_agent import AnalyticsAgent
        from .agents.host_persona_agent import HostPersonaAgent

        self.agent_registry.register(
            GameSetupAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )
        self.agent_registry.register(
            NotificationAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )
        self.agent_registry.register(
            AnalyticsAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )
        self.agent_registry.register(
            HostPersonaAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )

    async def process(
        self,
        user_input: str,
        context: Dict = None,
        user_id: str = None
    ) -> Dict:
        """
        Process a user request.

        Args:
            user_input: The user's natural language request
            context: Additional context (game_id, group_id, etc.)
            user_id: The requesting user's ID

        Returns:
            Dict with success status, data, message, etc.
        """
        context = context or {}
        request_id = str(uuid.uuid4())

        # Log the request
        log_entry = {
            "request_id": request_id,
            "user_id": user_id,
            "user_input": user_input,
            "context": context,
            "timestamp": datetime.utcnow()
        }

        try:
            # Step 1: Classify the request type
            request_type = self._classify_request(user_input, context)

            # Step 2: Route to appropriate handler
            if request_type["type"] == "tool":
                result = await self._handle_tool_request(
                    request_type["tool"],
                    context
                )
            elif request_type["type"] == "agent":
                result = await self._handle_agent_request(
                    request_type["agent"],
                    user_input,
                    context
                )
            else:
                # Fallback to general AI response
                result = await self._handle_general_request(user_input, context)

            # Log success
            log_entry["result"] = {
                "success": result.get("success", False),
                "type": request_type["type"],
                "handler": request_type.get("tool") or request_type.get("agent")
            }

        except Exception as e:
            logger.error(f"Orchestrator error: {e}")
            result = {
                "success": False,
                "error": str(e),
                "message": "An error occurred processing your request"
            }
            log_entry["error"] = str(e)

        # Store log
        if self.db:
            await self.db.ai_orchestrator_logs.insert_one(log_entry)

        return result

    def _classify_request(self, user_input: str, context: Dict) -> Dict:
        """
        Classify the request to determine which handler to use.

        Returns:
            Dict with type ("tool", "agent", "general") and handler name
        """
        input_lower = user_input.lower()

        # Direct tool requests
        if any(kw in input_lower for kw in ["analyze hand", "evaluate hand", "what's my hand"]):
            return {"type": "tool", "tool": "poker_evaluator"}

        if context.get("hole_cards") and context.get("community_cards"):
            return {"type": "tool", "tool": "poker_evaluator"}

        # Agent requests
        if any(kw in input_lower for kw in ["create game", "setup game", "new game", "schedule", "invite"]):
            return {"type": "agent", "agent": "game_setup"}

        if any(kw in input_lower for kw in ["notify", "send message", "remind", "alert"]):
            return {"type": "agent", "agent": "notification"}

        if any(kw in input_lower for kw in ["report", "stats", "leaderboard", "summary", "analytics"]):
            return {"type": "agent", "agent": "analytics"}

        # Host persona requests
        if any(kw in input_lower for kw in ["approve", "reject", "decision", "pending", "queue"]):
            return {"type": "agent", "agent": "host_persona"}

        if any(kw in input_lower for kw in ["monitor", "health", "check game"]):
            return {"type": "agent", "agent": "host_persona"}

        if any(kw in input_lower for kw in ["settle", "settlement", "end game"]):
            return {"type": "agent", "agent": "host_persona"}

        if any(kw in input_lower for kw in ["payment", "remind", "owed"]):
            return {"type": "agent", "agent": "host_persona"}

        # Default to general
        return {"type": "general"}

    async def _handle_tool_request(self, tool_name: str, context: Dict) -> Dict:
        """Handle a direct tool request"""
        tool = self.tool_registry.get(tool_name)
        if not tool:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' not found"
            }

        # Execute the tool
        result = await tool.execute(**context)
        return result.model_dump()

    async def _handle_agent_request(
        self,
        agent_name: str,
        user_input: str,
        context: Dict
    ) -> Dict:
        """Handle an agent request"""
        agent = self.agent_registry.get(agent_name)
        if not agent:
            return {
                "success": False,
                "error": f"Agent '{agent_name}' not found"
            }

        # Execute the agent
        result = await agent.execute(user_input, context)
        return result.model_dump()

    async def _handle_general_request(self, user_input: str, context: Dict) -> Dict:
        """Handle a general request that doesn't fit specific tools/agents"""
        # This could use an LLM for general conversation
        return {
            "success": True,
            "message": "I understand you want help, but I'm not sure what specific action to take. "
                      "Try asking me to:\n"
                      "- Create or setup a game\n"
                      "- Analyze your poker hand\n"
                      "- Generate a report or stats\n"
                      "- Send notifications",
            "type": "help"
        }

    # Convenience methods for common operations

    async def analyze_poker_hand(
        self,
        hole_cards: List[str],
        community_cards: List[str],
        user_id: str = None
    ) -> Dict:
        """Analyze a poker hand"""
        return await self.process(
            "Analyze my poker hand",
            context={
                "hole_cards": hole_cards,
                "community_cards": community_cards
            },
            user_id=user_id
        )

    async def create_game(
        self,
        group_id: str,
        host_id: str,
        title: str = "Poker Night",
        buy_in_amount: float = 20,
        player_ids: List[str] = None,
        scheduled_time: str = None
    ) -> Dict:
        """Create a new game"""
        return await self.process(
            "Create a new game",
            context={
                "group_id": group_id,
                "host_id": host_id,
                "title": title,
                "buy_in_amount": buy_in_amount,
                "player_ids": player_ids or [],
                "scheduled_time": scheduled_time
            },
            user_id=host_id
        )

    async def generate_report(
        self,
        report_type: str,
        game_id: str = None,
        group_id: str = None,
        user_id: str = None,
        time_period: str = "month"
    ) -> Dict:
        """Generate a report"""
        return await self.process(
            f"Generate {report_type}",
            context={
                "game_id": game_id,
                "group_id": group_id,
                "user_id": user_id,
                "time_period": time_period
            },
            user_id=user_id
        )

    async def send_notification(
        self,
        user_ids: List[str],
        title: str,
        message: str,
        notification_type: str = "general",
        data: Dict = None
    ) -> Dict:
        """Send notifications"""
        return await self.process(
            "Send notification",
            context={
                "user_ids": user_ids,
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "data": data
            }
        )
