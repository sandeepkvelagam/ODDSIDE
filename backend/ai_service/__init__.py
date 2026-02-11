"""
Kvitt AI Service - Modular AI Architecture

This module provides a comprehensive AI system with:
- Tools: Deterministic functions for specific tasks
- Agents: Orchestrators that combine tools for complex workflows
- Orchestrator: Central router that handles all AI requests

Architecture:
┌─────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                             │
│  Routes requests to appropriate agents/tools based on intent     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ▼               ▼               ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  TOOLS   │   │  AGENTS  │   │ MODELS   │
│ (funcs)  │   │(workflows)│   │ (LLMs)   │
└──────────┘   └──────────┘   └──────────┘
      │               │               │
      ▼               ▼               ▼
- Poker Eval      - Game Setup    - Claude/GPT
- Notifications   - Analytics     - Embeddings
- Scheduling      - Reports
- Email/SMS       - Automation
"""

from .orchestrator import AIOrchestrator
from .tools import ToolRegistry
from .agents import AgentRegistry

__all__ = ['AIOrchestrator', 'ToolRegistry', 'AgentRegistry']
