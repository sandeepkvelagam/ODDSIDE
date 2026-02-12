import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Play, DollarSign, ArrowRight, CheckCircle, 
  UserPlus, Coins, Trophy, X, ChevronLeft, ChevronRight,
  Send, Check, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Typewriter effect hook
function useTypewriter(text, speed = 50, startDelay = 500) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    
    const startTimeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);
      
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, startDelay]);

  return { displayText, isComplete };
}

// Demo components for each step
function WelcomeDemo() {
  const { displayText } = useTypewriter('Your side, settled.', 80, 300);
  
  return (
    <div className="bg-zinc-900 rounded-xl p-4 min-h-[100px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
          <span className="text-primary text-xs font-bold">K</span>
        </div>
        <span className="text-white text-sm font-medium">Kvitt</span>
      </div>
      <p className="text-2xl font-bold text-white min-h-[36px]">
        {displayText}
        <span className="animate-pulse text-primary">|</span>
      </p>
    </div>
  );
}

function CreateGroupDemo() {
  const { displayText, isComplete } = useTypewriter('Friday Night Poker', 60, 500);
  const [showCreated, setShowCreated] = useState(false);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setShowCreated(true), 800);
      return () => clearTimeout(timer);
    }
    setShowCreated(false);
  }, [isComplete]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 min-h-[120px]">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Group Name</p>
      <div className="bg-zinc-800 rounded-lg px-3 py-2 mb-3">
        <span className="text-white text-sm">
          {displayText}
          {!isComplete && <span className="animate-pulse text-primary">|</span>}
        </span>
      </div>
      <div className="h-5">
        {showCreated && (
          <div className="flex items-center gap-2 text-green-500 text-xs animate-fade-in-up">
            <Check className="w-3 h-3" />
            Group created!
          </div>
        )}
      </div>
    </div>
  );
}

function InviteFriendsDemo() {
  const emails = ['mike@email.com', 'sarah@email.com', 'john@email.com'];
  const [currentEmail, setCurrentEmail] = useState(0);
  const [sentEmails, setSentEmails] = useState([]);
  const { displayText, isComplete } = useTypewriter(emails[currentEmail] || '', 40, 300);

  useEffect(() => {
    if (isComplete && currentEmail < emails.length) {
      const timer = setTimeout(() => {
        setSentEmails(prev => [...prev, emails[currentEmail]]);
        if (currentEmail < emails.length - 1) {
          setCurrentEmail(prev => prev + 1);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, currentEmail]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 min-h-[120px]">
      <div className="flex gap-2 mb-2 min-h-[28px] flex-wrap">
        {sentEmails.map((email, i) => (
          <div key={i} className="bg-primary/20 text-primary text-[10px] px-2 py-1 rounded-full flex items-center gap-1 animate-fade-in-up">
            {email.split('@')[0]}
            <Check className="w-2 h-2" />
          </div>
        ))}
      </div>
      <div className="min-h-[40px]">
        {currentEmail < emails.length && (
          <div className="bg-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-white text-sm flex-1">
              {displayText}
              {!isComplete && <span className="animate-pulse text-primary">|</span>}
            </span>
            <Send className="w-4 h-4 text-zinc-500" />
          </div>
        )}
      </div>
    </div>
  );
}

function StartGameDemo() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Buy-in', value: '$20' },
    { label: 'Chips', value: '20' },
    { label: 'Per chip', value: '$1.00' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % (steps.length + 2));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 min-h-[120px]">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {steps.map((s, i) => (
          <div key={i} className={cn(
            "bg-zinc-800 rounded-lg p-2 text-center transition-all duration-300",
            step > i && "ring-2 ring-primary/50"
          )}>
            <p className="text-[10px] text-zinc-500">{s.label}</p>
            <p className={cn(
              "text-white font-bold transition-all",
              step > i ? "text-primary" : ""
            )}>
              {step > i ? s.value : '—'}
            </p>
          </div>
        ))}
      </div>
      <div className="min-h-[36px]">
        {step >= steps.length && (
          <div className="flex items-center justify-center gap-2 bg-primary/20 rounded-lg py-2 animate-fade-in-up">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-medium">Starting game...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DuringGameDemo() {
  const [events, setEvents] = useState([]);
  const allEvents = [
    { user: 'Mike', action: 'bought in', amount: '$20', chips: '20 chips' },
    { user: 'Sarah', action: 'bought in', amount: '$20', chips: '20 chips' },
    { user: 'John', action: 'rebuy', amount: '$10', chips: '10 chips' },
    { user: 'Mike', action: 'rebuy', amount: '$20', chips: '20 chips' },
  ];

  useEffect(() => {
    setEvents([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < allEvents.length) {
        setEvents(prev => [...prev, allEvents[i]]);
        i++;
      }
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 min-h-[140px]">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Game Thread</p>
      <div className="space-y-2 h-[100px] overflow-hidden">
        {events.map((event, i) => (
          <div key={i} className="flex items-center gap-2 text-xs animate-fade-in-up">
            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-white text-[10px] font-bold">
              {event.user[0]}
            </div>
            <span className="text-white">{event.user}</span>
            <span className="text-zinc-500">{event.action}</span>
            <span className="text-primary font-medium">{event.amount}</span>
            <span className="text-zinc-600">→</span>
            <span className="text-green-500">{event.chips}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashOutDemo() {
  const [phase, setPhase] = useState(0);
  const settlements = [
    { from: 'John', to: 'Mike', amount: '$15' },
    { from: 'Sarah', to: 'Mike', amount: '$5' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(prev => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 min-h-[140px]">
      {phase < 2 ? (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Final Chips</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Mike', chips: 55, profit: '+$15' },
              { name: 'Sarah', chips: 15, profit: '-$5' },
              { name: 'John', chips: 10, profit: '-$10' },
            ].map((p, i) => (
              <div key={i} className={cn(
                "bg-zinc-800 rounded-lg p-2 text-center transition-all",
                phase >= 1 && "ring-1 ring-zinc-600"
              )}>
                <p className="text-white text-xs font-medium">{p.name}</p>
                <p className="text-zinc-400 text-[10px]">{p.chips} chips</p>
                <div className="h-4">
                  {phase >= 1 && (
                    <p className={cn(
                      "text-[10px] font-bold animate-fade-in-up",
                      p.profit.startsWith('+') ? "text-green-500" : "text-red-400"
                    )}>
                      {p.profit}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Settlement</p>
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <div key={i} className={cn(
                "flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2 transition-all",
                phase >= 3 && i === 0 && "opacity-50 line-through"
              )}>
                <span className="text-white text-xs">{s.from} → {s.to}</span>
                <span className="text-primary font-bold text-sm">{s.amount}</span>
                {phase >= 3 && i === 0 && (
                  <Check className="w-4 h-4 text-green-500 animate-fade-in-up" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadyDemo() {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 min-h-[120px] relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-primary animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${1 + Math.random()}s`,
                width: 12 + Math.random() * 8,
                height: 12 + Math.random() * 8,
              }}
            />
          ))}
        </div>
      )}
      <div className="text-center relative z-10">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-2 animate-bounce">
          <Trophy className="w-6 h-6 text-green-500" />
        </div>
        <p className="text-white font-bold">You're all set!</p>
        <p className="text-zinc-400 text-xs">Time to host your first game</p>
      </div>
    </div>
  );
}

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Kvitt!',
    description: 'The modern way to track poker nights. No spreadsheets. No arguments. Just play.',
    icon: Trophy,
    Demo: WelcomeDemo,
  },
  {
    id: 'create_group',
    title: 'Create Your Group',
    description: 'Start by creating a poker group. This is where you\'ll organize games with your friends.',
    icon: Users,
    Demo: CreateGroupDemo,
    tip: 'Groups help you organize regular games with the same crew.',
  },
  {
    id: 'invite_friends',
    title: 'Invite Friends',
    description: 'Add your poker buddies to the group. They\'ll be able to join your games.',
    icon: UserPlus,
    Demo: InviteFriendsDemo,
    tip: 'You can invite by email. They\'ll get a notification to join.',
  },
  {
    id: 'start_game',
    title: 'Start a Game',
    description: 'Set your buy-in amount and chips. When you start, everyone gets their chips automatically!',
    icon: Play,
    Demo: StartGameDemo,
    tip: 'Default buy-in is $20 for 20 chips ($1/chip). You can customize this.',
  },
  {
    id: 'during_game',
    title: 'During the Game',
    description: 'Players can request rebuys. As host, you approve buy-ins and track everyone\'s chips.',
    icon: Coins,
    Demo: DuringGameDemo,
    tip: 'The game thread shows all activity. Everyone sees updates in real-time.',
  },
  {
    id: 'cash_out',
    title: 'Cash Out & Settle',
    description: 'When players cash out, enter their chip count. Kvitt calculates who owes who.',
    icon: DollarSign,
    Demo: CashOutDemo,
    tip: 'Settlement is calculated automatically. Mark payments as done when complete.',
  },
  {
    id: 'done',
    title: 'You\'re Ready!',
    description: 'Start your first game and enjoy hassle-free poker nights!',
    icon: CheckCircle,
    Demo: ReadyDemo,
    tip: 'Head to Groups to create your first poker group.',
  },
];

export default function OnboardingGuide({ onComplete, isModal = false }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [key, setKey] = useState(0); // Force re-render demos

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setKey(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setKey(prev => prev + 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('kvitt_onboarding_done', 'true');
    if (onComplete) onComplete();
  };

  const handleGetStarted = () => {
    handleComplete();
    navigate('/groups');
  };

  const handleSkip = () => {
    handleComplete();
  };

  const Icon = step.icon;
  const Demo = step.Demo;

  return (
    <div className={`${isModal ? '' : 'min-h-screen bg-background flex items-center justify-center p-4'}`}>
      <Card className="w-full max-w-md bg-card border-border/50 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Demo Area - Fixed height to prevent expansion/contraction */}
          <div className="p-4 bg-zinc-950 min-h-[180px] flex flex-col justify-center">
            <Demo key={key} />
          </div>

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-muted-foreground"
                onClick={handleSkip}
              >
                Skip <X className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {/* Progress */}
            <Progress value={progress} className="h-1 mb-6" />

            {/* Content */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              
              {step.tip && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-primary">💡 {step.tip}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleGetStarted}
                  className="flex-1 bg-primary text-black hover:bg-primary/90"
                >
                  Get Started <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-primary text-black hover:bg-primary/90"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to check if user needs onboarding
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem('kvitt_onboarding_done');
    if (!done) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('kvitt_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('kvitt_onboarding_done');
    setShowOnboarding(true);
  };

  return { showOnboarding, completeOnboarding, resetOnboarding };
}

// Contextual help tooltips
export const CONTEXTUAL_HELP = {
  'groups.create': 'Create a group to organize regular games with your poker crew.',
  'groups.invite': 'Invite friends by email. They\'ll receive a notification to join.',
  'game.buy_in': 'Set how much cash equals how many chips. Example: $20 = 20 chips ($1/chip)',
  'game.start': 'When you start, everyone automatically gets their chips. No manual setup!',
  'game.rebuy': 'Players can request more chips during the game. You approve as host.',
  'game.cash_out': 'Enter the chip count when a player cashes out. We calculate the rest.',
  'settlement.payments': 'Shows who owes who. Mark payments as done when settled.',
};
