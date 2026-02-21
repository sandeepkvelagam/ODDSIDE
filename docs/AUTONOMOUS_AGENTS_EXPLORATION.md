# Autonomous Agents Exploration for ODDSIDE

## Executive Summary

ODDSIDE already has a solid agent foundation: `BaseAgent`, `AgentRegistry`, `AIOrchestrator`, `EventListenerService`, and four agents (`HostPersonaAgent`, `GameSetupAgent`, `NotificationAgent`, `AnalyticsAgent`) backed by 9 tools and a Claude client. **We do NOT need to build from scratch.** The recommended approach is to extend the existing architecture with new autonomous agents and upgrade the orchestration layer with the Claude Agent SDK for more sophisticated multi-step reasoning.

---

## 1. Current Architecture Assessment

### What Already Exists

```
AIOrchestrator (orchestrator.py)
├── Tools (9 registered)
│   ├── GameManagerTool        ├── EmailSenderTool
│   ├── NotificationSenderTool ├── HostDecisionTool
│   ├── PokerEvaluatorTool     ├── SmartConfigTool
│   ├── ReportGeneratorTool    ├── PaymentTrackerTool
│   └── SchedulerTool
│
├── Agents (4 registered)
│   ├── GameSetupAgent
│   ├── NotificationAgent
│   ├── AnalyticsAgent
│   └── HostPersonaAgent (most sophisticated)
│
├── ClaudeClient (claude_client.py)
│   ├── Intent classification
│   ├── Recommendation generation
│   ├── Game summary generation
│   └── Natural language command parsing
│
└── EventListenerService (event_listener.py)
    ├── 10 event handlers (join, buy-in, cash-out, game start/end, etc.)
    └── Routes events → HostPersonaAgent
```

### Strengths of Current Architecture
- Clean `BaseAgent` abstraction with tool registry pattern
- Singleton `AgentRegistry` with task-routing
- Event-driven architecture via `EventListenerService`
- Claude API integration with fallback logic
- All agents share DB and tool access

### Gaps to Address
- **No persistent job queue** - background tasks lost on restart
- **No feedback collection system** - can't auto-fix what you can't measure
- **Keyword-based routing** - `_classify_request()` uses simple string matching
- **No multi-step autonomous workflows** - agents execute single actions, don't chain
- **No scheduled/cron automation** - reminders need manual trigger
- **No user-facing automation builder** - users can't create their own automations

---

## 2. Build from Scratch vs. Use Claude Agent SDK?

### Recommendation: **Hybrid Approach**

| Layer | Approach | Why |
|-------|----------|-----|
| **Agent framework** | Keep existing `BaseAgent` + `AgentRegistry` | Already works well, domain-specific |
| **Orchestration intelligence** | Upgrade with Claude Agent SDK tool-use | Replace keyword matching with LLM-driven routing |
| **New autonomous agents** | Build on existing `BaseAgent` | Consistent architecture, reuse tools |
| **Background automation** | Add APScheduler + task queue | Need persistent job scheduling |
| **User-facing automations** | New: Automation builder | No existing equivalent |

### Why NOT full Claude Agent SDK replacement?
- Your agents are domain-specific (poker games) - the SDK's generic file/shell tools aren't relevant
- Your `BaseAgent` → `ToolRegistry` → DB pattern is cleaner for your use case
- The SDK adds value at the **orchestration layer** (smarter routing, multi-step reasoning)

### Where Claude Agent SDK adds value:
- **Tool-use API** for the orchestrator: Let Claude decide which tools/agents to call instead of keyword matching
- **Extended thinking** for complex decisions (settlement optimization, anomaly analysis)
- **Prompt caching** to reduce costs on repeated context (game state)

---

## 3. New Autonomous Agents to Build

### Agent 1: FeedbackAgent

**Purpose:** Collect, analyze, and auto-fix issues from user feedback.

**How it works:**
1. Collect feedback via in-app form, post-game survey, or crash reports
2. Classify feedback (bug, feature request, UX issue, complaint)
3. For known patterns, trigger automatic fixes or workarounds
4. For unknowns, create prioritized action items for the team
5. Close the loop: notify user when their feedback is addressed

```
FeedbackAgent
├── Tools needed:
│   ├── FeedbackCollectorTool (new) - In-app forms, post-game surveys
│   ├── FeedbackClassifierTool (new) - Uses Claude to categorize
│   ├── AutoFixTool (new) - Applies known fixes
│   ├── NotificationSenderTool (existing) - Notify users
│   └── EmailSenderTool (existing) - Email updates
│
├── Automations:
│   ├── Post-game: "How was your experience?" (1-5 stars + comment)
│   ├── On error: Capture context + user report
│   ├── Weekly: Aggregate feedback → trends report
│   └── On fix: Notify affected users
│
├── Auto-fixable patterns:
│   ├── "Settlement was wrong" → Re-run settlement calculation, notify
│   ├── "Didn't get notification" → Check notification delivery, resend
│   ├── "Payment not tracked" → Reconcile ledger with Stripe
│   └── "Can't join game" → Check membership, permissions, resend invite
```

### Agent 2: ProductImprovementAgent

**Purpose:** Analyze usage patterns and feedback to suggest and implement product improvements.

```
ProductImprovementAgent
├── Tools needed:
│   ├── AnalyticsQueryTool (new) - Query usage data
│   ├── ABTestTool (new) - Run feature experiments
│   ├── FeatureFlagTool (new) - Toggle features per group/user
│   └── ReportGeneratorTool (existing)
│
├── Automations:
│   ├── Detect drop-off: "80% of users abandon game creation at step 3"
│   │   → Auto-suggest: simplify step 3, pre-fill defaults
│   ├── Detect friction: "Average settlement takes 3 days to complete"
│   │   → Auto-enable: more aggressive payment reminders
│   ├── Detect delight: "Groups with AI summaries retain 2x better"
│   │   → Auto-promote: push AI summaries to free tier
│   └── Weekly: Product health report to team
```

### Agent 3: UserAutomationAgent

**Purpose:** Let users create their own "if-this-then-that" automations.

```
UserAutomationAgent
├── Tools needed:
│   ├── AutomationBuilderTool (new) - Create/edit user automations
│   ├── AutomationRunnerTool (new) - Execute user-defined workflows
│   ├── All existing tools (notification, email, game manager, etc.)
│
├── User-configurable triggers:
│   ├── "When a game ends" → auto-split via Venmo/Zelle links
│   ├── "When I owe someone" → auto-remind me in 24h
│   ├── "When someone owes me 3+ days" → auto-send reminder
│   ├── "When game is created in my group" → auto-RSVP yes
│   ├── "Every Friday at 5pm" → suggest creating a game
│   └── "When all players confirmed" → auto-start game
│
├── Actions available to users:
│   ├── Send notification to self/group
│   ├── Send email
│   ├── Create game with preset config
│   ├── Auto-RSVP
│   ├── Send payment reminder
│   └── Generate and share game summary
│
├── Database schema (new collection):
│   user_automations:
│     automation_id, user_id, name, enabled,
│     trigger: { type, conditions },
│     actions: [{ tool, params }],
│     last_run, run_count, created_at
```

### Agent 4: PaymentReconciliationAgent

**Purpose:** Autonomously track and resolve payment issues.

```
PaymentReconciliationAgent
├── Tools needed:
│   ├── PaymentTrackerTool (existing)
│   ├── LedgerReconcilerTool (new) - Cross-check ledger vs Stripe
│   ├── NotificationSenderTool (existing)
│   ├── EmailSenderTool (existing)
│
├── Automations:
│   ├── Daily: Scan for unpaid ledger entries > 3 days
│   │   → Escalate reminders: Day 1 (gentle), Day 3 (firm), Day 7 (final)
│   ├── On Stripe webhook: Match payment to ledger entry
│   │   → Auto-mark as paid, notify both parties
│   ├── Weekly: Payment health report per group
│   │   → Flag chronic non-payers to host
│   └── Monthly: Consolidate cross-game debts
│       → "You owe Player X $15 across 3 games" → single payment
```

### Agent 5: EngagementAgent

**Purpose:** Keep users and groups active with intelligent nudges.

```
EngagementAgent
├── Tools needed:
│   ├── SchedulerTool (existing)
│   ├── NotificationSenderTool (existing)
│   ├── SmartConfigTool (existing)
│   ├── EngagementScorerTool (new) - Score user/group activity
│
├── Automations:
│   ├── Group inactive 14+ days → "Time for another game night?"
│   ├── User hasn't played in 30 days → "Your group played without you!"
│   ├── After 5th game → "Unlock your stats with Premium"
│   ├── Big winner → "Share your victory!" (social sharing)
│   ├── New badge earned → Celebration notification
│   └── Group milestone → "100th game! Here's your all-time stats"
```

---

## 4. What Can Be Automated (Priority Matrix)

### P0: High Impact, Low Effort (extend existing agents)

| Automation | Agent | Effort | Impact |
|-----------|-------|--------|--------|
| Auto payment reminders (Day 1, 3, 7) | HostPersonaAgent | Low - code exists, needs scheduler | Reduces payment friction |
| Post-game feedback survey | FeedbackAgent (new) | Medium | Enables product improvement |
| Settlement error auto-recheck | FeedbackAgent | Low | Fixes most-reported issue |
| Notification delivery verification | NotificationAgent | Low | Ensures alerts arrive |

### P1: High Impact, Medium Effort (new agents)

| Automation | Agent | Effort | Impact |
|-----------|-------|--------|--------|
| User-defined automations (IFTTT) | UserAutomationAgent | High | Major differentiator |
| Cross-game debt consolidation | PaymentReconciliationAgent | Medium | Reduces payment count |
| Group re-engagement nudges | EngagementAgent | Medium | Improves retention |
| Auto game scheduling suggestions | HostPersonaAgent (extend) | Medium | Reduces host burden |

### P2: Medium Impact, Higher Effort (product intelligence)

| Automation | Agent | Effort | Impact |
|-----------|-------|--------|--------|
| Usage analytics dashboard | ProductImprovementAgent | High | Data-driven decisions |
| A/B testing framework | ProductImprovementAgent | High | Optimize conversion |
| Chronic non-payer flagging | PaymentReconciliationAgent | Medium | Improves trust |
| Smart game config per group | SmartConfigTool (extend) | Medium | Better defaults |

---

## 5. Implementation Architecture

### Phase 1: Background Job Infrastructure

Before building new agents, add persistent job scheduling:

```python
# New: backend/services/task_queue.py
# Using APScheduler for persistent scheduled tasks

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore

class TaskQueue:
    """Persistent task queue for autonomous agent actions"""

    def __init__(self, db_url: str):
        jobstores = {
            'default': MongoDBJobStore(database='oddside', client=motor_client)
        }
        self.scheduler = AsyncIOScheduler(jobstores=jobstores)

    def schedule_reminder(self, ledger_id, user_id, delay_days):
        """Schedule a payment reminder"""
        self.scheduler.add_job(
            send_payment_reminder,
            'date',
            run_date=datetime.now() + timedelta(days=delay_days),
            args=[ledger_id, user_id]
        )

    def schedule_recurring(self, func, cron_expression, **kwargs):
        """Schedule a recurring automation"""
        self.scheduler.add_job(func, CronTrigger.from_crontab(cron_expression), kwargs=kwargs)
```

### Phase 2: Feedback Collection System

```python
# New: backend/ai_service/agents/feedback_agent.py

class FeedbackAgent(BaseAgent):
    """Collects and acts on user feedback"""

    @property
    def name(self) -> str:
        return "feedback"

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        action = context.get("action")
        if action == "submit_feedback":
            return await self._handle_feedback_submission(context)
        elif action == "analyze_trends":
            return await self._analyze_feedback_trends(context)
        elif action == "auto_fix":
            return await self._attempt_auto_fix(context)

    async def _handle_feedback_submission(self, context):
        # 1. Store feedback
        # 2. Classify with Claude (bug/feature/ux/complaint)
        # 3. Check if auto-fixable
        # 4. If yes, attempt fix and notify user
        # 5. If no, add to backlog with priority score
        pass

    async def _attempt_auto_fix(self, context):
        # Known patterns:
        # - "settlement wrong" → recalculate_settlement(game_id)
        # - "missing notification" → resend_notification(user_id, event)
        # - "payment not showing" → reconcile_ledger(ledger_id)
        pass
```

### Phase 3: User Automation Builder

```python
# New: backend/ai_service/agents/user_automation_agent.py

class UserAutomationAgent(BaseAgent):
    """Manages user-created automations"""

    @property
    def name(self) -> str:
        return "user_automation"

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        action = context.get("action")
        if action == "create_automation":
            return await self._create_automation(context)
        elif action == "trigger":
            return await self._run_automation(context)
        elif action == "list":
            return await self._list_automations(context)

    async def _create_automation(self, context):
        # Validate trigger + actions
        # Store in user_automations collection
        # Register with EventListenerService
        pass

    async def _run_automation(self, context):
        # Load automation config
        # Execute each action in sequence
        # Log results
        # Handle failures gracefully
        pass

# New collection schema:
# user_automations = {
#   "automation_id": str,
#   "user_id": str,
#   "name": str,
#   "enabled": bool,
#   "trigger": {
#       "type": "event|schedule|condition",
#       "event_type": "game_ended|payment_due|...",
#       "schedule": "0 17 * * 5",  # cron for Fridays 5pm
#       "conditions": {"field": "amount", "op": "gt", "value": 50}
#   },
#   "actions": [
#       {"tool": "notification_sender", "params": {"title": "...", "message": "..."}},
#       {"tool": "email_sender", "params": {"template": "reminder"}}
#   ],
#   "last_run": datetime,
#   "run_count": int,
#   "created_at": datetime
# }
```

### Phase 4: Upgrade Orchestrator with Claude Tool-Use

```python
# Upgrade: backend/ai_service/orchestrator.py

class AIOrchestrator:
    async def process(self, user_input, context, user_id):
        # BEFORE (keyword matching):
        # request_type = self._classify_request(user_input, context)

        # AFTER (Claude tool-use):
        # Define tools as Claude tool schemas
        tools = self._get_tool_schemas()

        response = await self.llm_client.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system="You are the ODDSIDE game assistant orchestrator...",
            tools=tools,
            messages=[{"role": "user", "content": user_input}]
        )

        # Claude decides which tool/agent to call
        for block in response.content:
            if block.type == "tool_use":
                result = await self._execute_tool_call(block.name, block.input)
                # Can chain multiple tool calls for multi-step workflows
```

---

## 6. Upgrading the Orchestrator: Keyword Matching → Claude Tool-Use

The biggest single improvement is replacing the `_classify_request()` keyword matcher in `orchestrator.py` with Claude's native tool-use API. This enables:

1. **Natural language understanding** - "Hey, can you check if everyone paid up from last week?" → routes to `PaymentReconciliationAgent`
2. **Multi-step workflows** - Claude can chain: check payments → send reminders → schedule follow-up
3. **Context-aware routing** - same phrase routes differently based on game state

### Tool Schema Example

```python
tools = [
    {
        "name": "check_payments",
        "description": "Check payment status for a game or group",
        "input_schema": {
            "type": "object",
            "properties": {
                "game_id": {"type": "string"},
                "group_id": {"type": "string"}
            }
        }
    },
    {
        "name": "send_reminders",
        "description": "Send payment reminders to users who owe money",
        "input_schema": {
            "type": "object",
            "properties": {
                "game_id": {"type": "string"},
                "urgency": {"type": "string", "enum": ["gentle", "firm", "final"]}
            }
        }
    },
    # ... all tools exposed as Claude tool schemas
]
```

---

## 7. Cost Estimates

### Per-Agent API Costs (estimated monthly)

| Agent | Calls/day | Tokens/call | Model | Monthly Cost |
|-------|-----------|-------------|-------|-------------|
| FeedbackAgent | 20-50 | ~500 | Haiku | ~$2-5 |
| Orchestrator (tool-use) | 100-500 | ~1000 | Sonnet | ~$15-75 |
| HostPersona (summaries) | 10-30 | ~800 | Sonnet | ~$5-15 |
| EngagementAgent | 50-200 | ~300 | Haiku | ~$3-8 |
| UserAutomation (NL parse) | 10-50 | ~500 | Haiku | ~$1-3 |
| **Total** | | | | **~$26-106/mo** |

### Cost Optimization
- Use **Haiku** for classification/simple tasks ($1/M input)
- Use **Sonnet** for complex reasoning ($3/M input)
- Use **prompt caching** for repeated game state context (90% savings)
- Batch non-urgent operations via **Batch API** (50% savings)

---

## 8. Recommended Implementation Order

```
Phase 1 (Foundation):
├── Add APScheduler for persistent background jobs
├── Add feedback collection endpoints + DB schema
└── Wire scheduler into EventListenerService

Phase 2 (Core Agents):
├── Build FeedbackAgent with auto-fix patterns
├── Build PaymentReconciliationAgent
├── Add scheduled payment reminders (Day 1, 3, 7)
└── Add post-game feedback survey trigger

Phase 3 (Smart Orchestration):
├── Upgrade Orchestrator with Claude tool-use API
├── Replace keyword matching with LLM-driven routing
└── Enable multi-step autonomous workflows

Phase 4 (User Empowerment):
├── Build UserAutomationAgent
├── Build automation builder UI (mobile + web)
├── Add user_automations DB collection
└── Wire automations into EventListenerService

Phase 5 (Intelligence):
├── Build EngagementAgent
├── Build ProductImprovementAgent
├── Add usage analytics tracking
└── Add A/B testing infrastructure
```

---

## 9. Key Files to Modify/Create

### Modify (existing)
- `backend/ai_service/orchestrator.py` - Upgrade to Claude tool-use
- `backend/ai_service/event_listener.py` - Add automation triggers
- `backend/ai_service/agents/registry.py` - Register new agents
- `backend/ai_service/agents/host_persona_agent.py` - Add scheduler integration

### Create (new)
- `backend/services/task_queue.py` - APScheduler-based persistent job queue
- `backend/ai_service/agents/feedback_agent.py` - Feedback collection + auto-fix
- `backend/ai_service/agents/payment_reconciliation_agent.py` - Payment automation
- `backend/ai_service/agents/user_automation_agent.py` - User-defined automations
- `backend/ai_service/agents/engagement_agent.py` - Re-engagement nudges
- `backend/ai_service/agents/product_improvement_agent.py` - Usage analytics
- `backend/ai_service/tools/feedback_collector.py` - Feedback tool
- `backend/ai_service/tools/automation_runner.py` - Automation execution tool
- `backend/ai_service/tools/ledger_reconciler.py` - Payment reconciliation tool
- `backend/routes/feedback.py` - Feedback API endpoints
- `backend/routes/automations.py` - User automation API endpoints

---

## 10. Summary

| Question | Answer |
|----------|--------|
| **Build from scratch?** | No. Extend the existing agent architecture. |
| **Use Claude Agent SDK?** | Partially. Use Claude's tool-use API for smarter orchestration, but keep your custom `BaseAgent` framework. |
| **What to automate first?** | Payment reminders, feedback collection, settlement error fixes. |
| **Biggest single upgrade?** | Replace keyword matching in `orchestrator.py` with Claude tool-use for intelligent routing. |
| **Biggest user-facing feature?** | User-defined automations (IFTTT-style). |
| **Estimated API cost?** | $26-106/month depending on scale. |
