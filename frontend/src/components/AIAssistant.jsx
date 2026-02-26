import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  X, Send, User, Loader2, ArrowRight, ExternalLink
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Quick suggestion buttons
const SUGGESTIONS = [
  "How do I create a group?",
  "How does buy-in work?",
  "How do I cash out?",
  "What is settlement?",
  "Poker hand rankings",
];

// Gradient orb character component
function GradientOrb({ size = "md", animate = false, showEyes = true, className }) {
  const dims = useMemo(() => {
    if (size === "lg") return { orb: "h-[140px] w-[140px]", eye: true, shadow: true };
    if (size === "sm") return { orb: "h-[44px] w-[44px]", eye: true, shadow: false };
    return { orb: "h-[28px] w-[28px]", eye: false, shadow: false };
  }, [size]);

  const eyes = showEyes && dims.eye;

  return (
    <div className={cn("relative grid place-items-center", className)}>
      {dims.shadow && (
        <div className={cn("ai-orb-shadow -z-10", animate ? "animate-orb-glow" : "")} />
      )}
      <div className={cn("ai-orb", dims.orb, animate ? "animate-orb-breathe" : "")}>
        {eyes && (
          <>
            <div className={cn("ai-orb-eye ai-orb-eye-left", "animate-blink-eyes")} />
            <div className={cn("ai-orb-eye ai-orb-eye-right", "animate-blink-eyes")} />
          </>
        )}
      </div>
    </div>
  );
}

// Route map for web navigation from AI responses
const WEB_NAV_MAP = {
  Dashboard: '/',
  Groups: '/groups',
  GroupHub: '/groups',
  GameNight: '/games',
  Wallet: '/wallet',
  Settings: '/settings',
  Chats: '/chats',
  Notifications: '/notifications',
  Automations: '/automations',
  SettlementHistory: '/settlements',
  RequestAndPay: '/request-pay',
  PendingRequests: '/pending-requests',
  AIAssistant: null, // already here
};

export default function AIAssistant({ currentPage }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Kvitt assistant. Ask me anything about the app - creating groups, games, buy-ins, settlements, or poker rules!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestsRemaining, setRequestsRemaining] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch usage on open
  useEffect(() => {
    if (isOpen) {
      axios.get(`${API}/assistant/usage`).then((res) => {
        setRequestsRemaining(res.data.requests_remaining);
      }).catch(() => {});
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/assistant/ask`, {
        message: text,
        context: { current_page: currentPage }
      });

      const data = response.data;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        source: data.source,
        navigation: data.navigation || null
      }]);
      if (data.requests_remaining !== undefined) {
        setRequestsRemaining(data.requests_remaining);
      }
    } catch (error) {
      if (error?.response?.status === 429) {
        const upgradeMsg = error.response.data?.upgrade_message || "Daily limit reached. Upgrade to Premium for more.";
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: upgradeMsg,
          error: true
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I couldn't process that. Please try again or check the help guide.",
          error: true
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasStarted) setHasStarted(true);
    sendMessage(input);
  };

  const handleSuggestion = (suggestion) => {
    if (!hasStarted) setHasStarted(true);
    sendMessage(suggestion);
  };

  const startNow = () => {
    setHasStarted(true);
  };

  const handleNavigation = (nav) => {
    const route = WEB_NAV_MAP[nav.screen];
    if (route) {
      navigate(route);
      setIsOpen(false);
    }
  };

  // Floating orb button (closed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
        data-testid="ai-assistant-button"
        aria-label="Open AI Assistant"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-mini-orb-pulse" />
          <GradientOrb size="sm" animate={true} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
        </div>
      </button>
    );
  }

  return (
    <Card className="fixed bottom-5 right-5 w-80 sm:w-96 h-[520px] flex flex-col bg-card border-border shadow-2xl z-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <GradientOrb size="md" className="animate-float" />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">Kvitt Assistant</span>
              <span className="text-[9px] font-bold tracking-wide bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded">BETA</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {requestsRemaining !== null ? `${requestsRemaining} requests left` : 'Online · Ready to help'}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0 hover:bg-secondary" aria-label="Close assistant">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {!hasStarted ? (
        /* Welcome Screen */
        <div className="flex-1 bg-gradient-to-b from-slate-50 to-violet-50/30 dark:from-slate-950 dark:to-violet-950/30">
          <div className="flex h-full flex-col items-center justify-between px-5 py-6">
            {/* Speech bubble */}
            <div className="w-full">
              <div className="inline-block animate-welcome-fade-in" style={{ animationDelay: '120ms' }}>
                <div className="ai-speech-bubble animate-speech-bounce">Hello!</div>
              </div>
            </div>

            {/* Orb + text */}
            <div className="flex flex-col items-center gap-5">
              <div className="animate-welcome-fade-in" style={{ animationDelay: '220ms' }}>
                <GradientOrb size="lg" animate={true} />
              </div>

              <div className="text-center">
                <h2
                  className="text-2xl font-semibold tracking-tight animate-welcome-fade-in"
                  style={{ animationDelay: '320ms' }}
                >
                  Your{' '}
                  <span className="text-violet-600 dark:text-violet-400">Smart</span>{' '}
                  Assistant
                  <br />
                  for Any Task
                </h2>

                <p
                  className="mt-2 text-sm text-muted-foreground animate-welcome-fade-in"
                  style={{ animationDelay: '420ms' }}
                >
                  Instant help for planning, questions, and quick decisions.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="w-full">
              <button
                onClick={startNow}
                className="w-full rounded-full px-4 py-3 bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95 active:opacity-90 animate-welcome-fade-in transition-opacity"
                style={{ animationDelay: '520ms' }}
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Chat Screen */
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <React.Fragment key={i}>
                <div
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1 animate-float" style={{ animationDuration: '5s' }}>
                      <GradientOrb size="md" animate={false} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] px-3 py-2 rounded-2xl text-sm",
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-none'
                        : msg.error
                          ? 'bg-destructive/10 text-destructive rounded-bl-none'
                          : 'bg-muted text-foreground rounded-bl-none'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.source === 'quick_answer' && (
                      <p className="text-[10px] opacity-60 mt-1">⚡ Quick answer</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                {msg.navigation && WEB_NAV_MAP[msg.navigation.screen] && (
                  <button
                    onClick={() => handleNavigation(msg.navigation)}
                    className="ml-9 mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Go to {msg.navigation.screen} →
                  </button>
                )}
              </React.Fragment>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 mt-1 animate-float" style={{ animationDuration: '5s' }}>
                  <GradientOrb size="md" animate={false} />
                </div>
                <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-none">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2">
              <p className="text-[10px] text-muted-foreground mb-1.5">Quick questions:</p>
              <div className="flex flex-wrap gap-1">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s)}
                    className="text-[10px] px-2 py-1 bg-secondary/50 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                className="flex-1 h-9 text-sm rounded-full"
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || loading}
                className="h-9 w-9 p-0 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
}
