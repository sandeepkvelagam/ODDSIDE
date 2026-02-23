"""
AI Orchestrator

The central coordinator for all AI operations in ODDSIDE.

The orchestrator:
1. Receives user requests
2. Uses Claude's tool-use API to intelligently route to the right agent/tool
3. Executes the request (with multi-step chaining support)
4. Falls back to keyword matching when Claude is unavailable
5. Logs all operations for analytics
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
import json
import logging

from .tools.registry import ToolRegistry
from .agents.registry import AgentRegistry

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    Central orchestrator for all AI operations.

    Uses Claude's tool-use API to let the LLM decide which tool/agent to call
    based on the user's natural language input. Falls back to keyword matching
    when Claude is unavailable.

    Usage:
        orchestrator = AIOrchestrator(db=db, llm_client=claude_client)
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
        from .tools.engagement_scorer import EngagementScorerTool
        from .tools.engagement_policy import EngagementPolicyTool
        from .tools.engagement_planner import EngagementPlannerTool
        from .tools.feedback_collector import FeedbackCollectorTool
        from .tools.feedback_classifier import FeedbackClassifierTool
        from .tools.feedback_policy import FeedbackPolicyTool
        from .tools.auto_fixer import AutoFixerTool
        from .tools.ledger_reconciler import LedgerReconcilerTool
        from .tools.payment_policy import PaymentPolicyTool

        self.tool_registry.register(PokerEvaluatorTool())
        self.tool_registry.register(NotificationSenderTool(db=self.db))
        self.tool_registry.register(GameManagerTool(db=self.db))
        self.tool_registry.register(SchedulerTool(db=self.db))
        self.tool_registry.register(ReportGeneratorTool(db=self.db))
        self.tool_registry.register(EmailSenderTool(db=self.db))
        self.tool_registry.register(HostDecisionTool(db=self.db))
        self.tool_registry.register(SmartConfigTool(db=self.db))
        self.tool_registry.register(PaymentTrackerTool(db=self.db))
        self.tool_registry.register(EngagementScorerTool(db=self.db))
        self.tool_registry.register(EngagementPolicyTool(db=self.db))
        self.tool_registry.register(EngagementPlannerTool(db=self.db))
        self.tool_registry.register(FeedbackCollectorTool(db=self.db))
        self.tool_registry.register(FeedbackClassifierTool(
            db=self.db, llm_client=self.llm_client
        ))
        self.tool_registry.register(FeedbackPolicyTool(db=self.db))
        self.tool_registry.register(AutoFixerTool(
            db=self.db, tool_registry=self.tool_registry
        ))
        self.tool_registry.register(LedgerReconcilerTool(db=self.db))
        self.tool_registry.register(PaymentPolicyTool(db=self.db))

    def _setup_agents(self):
        """Register all available agents"""
        from .agents.game_setup_agent import GameSetupAgent
        from .agents.notification_agent import NotificationAgent
        from .agents.analytics_agent import AnalyticsAgent
        from .agents.host_persona_agent import HostPersonaAgent
        from .agents.group_chat_agent import GroupChatAgent
        from .agents.game_planner_agent import GamePlannerAgent
        from .agents.engagement_agent import EngagementAgent
        from .agents.feedback_agent import FeedbackAgent
        from .agents.payment_reconciliation_agent import PaymentReconciliationAgent

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
        self.agent_registry.register(
            GroupChatAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )
        self.agent_registry.register(
            GamePlannerAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )
        self.agent_registry.register(
            EngagementAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )
        self.agent_registry.register(
            FeedbackAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )
        self.agent_registry.register(
            PaymentReconciliationAgent(
                tool_registry=self.tool_registry,
                db=self.db,
                llm_client=self.llm_client
            )
        )

    def _build_tool_schemas(self) -> List[Dict]:
        """
        Build combined tool schemas from both tools and agents.

        Tools are exposed directly. Agents are exposed as "agent_<name>" tools
        so Claude can pick the right one.
        """
        schemas = []

        # Add tool schemas (direct tools like poker_evaluator, payment_tracker)
        for tool in self.tool_registry.get_all_tools():
            schemas.append(tool.to_anthropic_tool())

        # Add agent schemas (agents exposed as meta-tools)
        for agent in self.agent_registry.get_all_agents():
            schemas.append(agent.to_anthropic_tool())

        return schemas

    async def process(
        self,
        user_input: str,
        context: Dict = None,
        user_id: str = None
    ) -> Dict:
        """
        Process a user request.

        Routes the request using Claude's tool-use API when available,
        falling back to keyword matching otherwise.

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
            # Try Claude tool-use routing first
            if self.llm_client and self.llm_client.is_available:
                result = await self._process_with_llm(user_input, context, user_id)
                # _process_with_llm may internally fall back to keywords
                routing_method = result.pop("_routing_method", "llm_tool_use")
            else:
                # Fallback to keyword matching
                result = await self._process_with_keywords(user_input, context, user_id)
                routing_method = "keyword_fallback"

            # Log success
            log_entry["result"] = {
                "success": result.get("success", False),
                "routing_method": routing_method,
                "handler": result.get("_handler"),
            }
            # Remove internal metadata before returning
            result.pop("_handler", None)

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

    # ==================== LLM Tool-Use Routing ====================

    async def _process_with_llm(
        self,
        user_input: str,
        context: Dict,
        user_id: str = None
    ) -> Dict:
        """
        Route the request using Claude's tool-use API.

        Claude sees all available tools and agents as tool schemas, then
        decides which one to call based on the user's input.
        """
        tools = self._build_tool_schemas()

        # Inject user_id into context for Claude
        enriched_context = {**context}
        if user_id:
            enriched_context["user_id"] = user_id

        routing_result = await self.llm_client.route_with_tools(
            user_input=user_input,
            context=enriched_context,
            tools=tools
        )

        # If Claude couldn't route (error/unavailable), fall back
        if routing_result.get("stop_reason") in ("error", "unavailable"):
            logger.warning("LLM routing failed, falling back to keywords")
            result = await self._process_with_keywords(user_input, context, user_id)
            result["_routing_method"] = "llm_fallback_to_keywords"
            return result

        # If Claude responded with text only (no tool call) — general response
        if not routing_result.get("tool_calls"):
            text = routing_result.get("text_response", "")
            if text:
                return {
                    "success": True,
                    "message": text,
                    "type": "general",
                    "_handler": "llm_general"
                }
            # No tool calls and no text — fall back
            result = await self._process_with_keywords(user_input, context, user_id)
            result["_routing_method"] = "llm_fallback_to_keywords"
            return result

        # Execute the first tool call Claude chose
        # (Multi-step chaining: if the tool returns a result that needs further
        #  processing, we could loop — but for now we execute the first call)
        tool_call = routing_result["tool_calls"][0]
        tool_name = tool_call["name"]
        tool_input = tool_call["input"]

        logger.info(f"LLM routed to: {tool_name} with input keys: {list(tool_input.keys())}")

        # Check if it's an agent call (prefixed with "agent_")
        if tool_name.startswith("agent_"):
            agent_name = tool_name[len("agent_"):]
            return await self._execute_agent(
                agent_name,
                tool_input.get("user_input", user_input),
                tool_input
            )
        else:
            # Direct tool call
            return await self._execute_tool(tool_name, tool_input)

    # ==================== Keyword Fallback Routing ====================

    async def _process_with_keywords(
        self,
        user_input: str,
        context: Dict,
        user_id: str = None
    ) -> Dict:
        """
        Route the request using keyword matching (fallback).

        This is the original routing logic, kept as a fallback when
        Claude is unavailable.
        """
        request_type = self._classify_request(user_input, context)

        if request_type["type"] == "tool":
            return await self._execute_tool(
                request_type["tool"],
                context
            )
        elif request_type["type"] == "agent":
            return await self._execute_agent(
                request_type["agent"],
                user_input,
                context
            )
        else:
            return await self._handle_general_request(user_input, context)

    def _classify_request(self, user_input: str, context: Dict) -> Dict:
        """
        Classify the request using keyword matching (fallback).

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

        if any(kw in input_lower for kw in [
            "engagement", "inactive", "nudge", "milestone", "big winner",
            "re-engage", "dormant", "engagement digest"
        ]):
            return {"type": "agent", "agent": "engagement"}

        if any(kw in input_lower for kw in [
            "feedback", "bug", "report issue", "survey", "complaint",
            "feature request", "broken", "not working", "rate game"
        ]):
            return {"type": "agent", "agent": "feedback"}

        if any(kw in input_lower for kw in [
            "reconcil", "overdue", "unpaid", "outstanding payment",
            "consolidat", "non-payer", "nonpayer", "payment health",
            "payment report", "settle up", "who owes"
        ]):
            return {"type": "agent", "agent": "payment_reconciliation"}

        # Default to general
        return {"type": "general"}

    # ==================== Execution Helpers ====================

    async def _execute_tool(self, tool_name: str, params: Dict) -> Dict:
        """Execute a tool by name with given parameters"""
        tool = self.tool_registry.get(tool_name)
        if not tool:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' not found",
                "_handler": tool_name
            }

        # Filter params to only those accepted by the tool's schema
        tool_params = tool.parameters
        allowed_keys = set(tool_params.get("properties", {}).keys()) if "properties" in tool_params else set(params.keys())
        filtered = {k: v for k, v in params.items() if k in allowed_keys}
        result = await tool.execute(**filtered)
        response = result.model_dump()
        response["_handler"] = tool_name
        return response

    async def _execute_agent(self, agent_name: str, user_input: str, context: Dict) -> Dict:
        """Execute an agent by name"""
        agent = self.agent_registry.get(agent_name)
        if not agent:
            return {
                "success": False,
                "error": f"Agent '{agent_name}' not found",
                "_handler": agent_name
            }

        # Remove user_input from context to avoid passing it twice
        agent_context = {k: v for k, v in context.items() if k != "user_input"}

        result = await agent.execute(user_input, agent_context)
        response = result.model_dump()
        response["_handler"] = f"agent_{agent_name}"
        return response

    async def _handle_general_request(self, user_input: str, context: Dict) -> Dict:
        """Handle a general request that doesn't fit specific tools/agents"""
        return {
            "success": True,
            "message": "I understand you want help, but I'm not sure what specific action to take. "
                      "Try asking me to:\n"
                      "- Create or setup a game\n"
                      "- Analyze your poker hand\n"
                      "- Generate a report or stats\n"
                      "- Send notifications\n"
                      "- Check pending decisions\n"
                      "- Send payment reminders\n"
                      "- Reconcile payments or check who owes what\n"
                      "- Submit feedback or report a bug\n"
                      "- Rate your game experience",
            "type": "help",
            "_handler": "general"
        }

    # ==================== Convenience Methods ====================

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
