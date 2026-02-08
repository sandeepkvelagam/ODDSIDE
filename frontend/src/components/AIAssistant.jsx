import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  MessageCircle, X, Send, Bot, User, Loader2, HelpCircle,
  Sparkles, ChevronDown
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

export default function AIAssistant({ currentPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hi! I'm your Kvitt assistant. Ask me anything about the app - creating groups, games, buy-ins, settlements, or poker rules!" 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        source: response.data.source
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again or check the help guide.",
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-primary text-black shadow-lg hover:bg-primary/90 z-50"
        data-testid="ai-assistant-button"
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] flex flex-col bg-card border-border shadow-2xl z-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-primary text-black border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Kvitt Assistant</h3>
            <p className="text-[10px] opacity-80">Ask me anything</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 p-0 hover:bg-black/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 text-primary" />
              </div>
            )}
            <div 
              className={`max-w-[85%] p-2.5 rounded-lg text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-black rounded-br-none' 
                  : msg.error 
                    ? 'bg-destructive/10 text-destructive rounded-bl-none'
                    : 'bg-secondary/50 text-foreground rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.source === 'quick_answer' && (
                <p className="text-[10px] opacity-60 mt-1">⚡ Quick answer</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-secondary/50 p-2.5 rounded-lg rounded-bl-none">
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
      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 h-9 text-sm"
            disabled={loading}
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!input.trim() || loading}
            className="h-9 w-9 p-0 bg-primary text-black hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
