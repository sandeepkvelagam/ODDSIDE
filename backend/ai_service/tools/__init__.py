"""
AI Service Tools

Tools are deterministic, single-purpose functions that perform specific tasks.
They can be called by agents or directly by the orchestrator.

Each tool has:
- name: Unique identifier
- description: What the tool does (used by LLM for tool selection)
- parameters: JSON schema of input parameters
- execute(): The actual implementation
"""

from .registry import ToolRegistry
from .base import BaseTool

# Import all tools
from .poker_evaluator import PokerEvaluatorTool
from .notification_sender import NotificationSenderTool
from .game_manager import GameManagerTool
from .scheduler import SchedulerTool
from .report_generator import ReportGeneratorTool
from .email_sender import EmailSenderTool
from .engagement_scorer import EngagementScorerTool

__all__ = [
    'ToolRegistry',
    'BaseTool',
    'PokerEvaluatorTool',
    'NotificationSenderTool',
    'GameManagerTool',
    'SchedulerTool',
    'ReportGeneratorTool',
    'EmailSenderTool',
    'EngagementScorerTool',
]
