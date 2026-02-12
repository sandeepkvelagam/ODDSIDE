import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Play, DollarSign, ArrowRight, CheckCircle, 
  UserPlus, Coins, Trophy, X, ChevronLeft, ChevronRight 
} from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Kvitt!',
    description: 'Your side, settled. Track poker games, manage buy-ins, and settle up with friends.',
    icon: Trophy,
    tip: 'Let\'s walk you through how it works in just a few steps.',
  },
  {
    id: 'create_group',
    title: 'Create Your Group',
    description: 'Start by creating a poker group. This is where you\'ll organize games with your friends.',
    icon: Users,
    tip: 'Groups help you organize regular games with the same crew.',
  },
  {
    id: 'invite_friends',
    title: 'Invite Friends',
    description: 'Add your poker buddies to the group. They\'ll be able to join your games.',
    icon: UserPlus,
    tip: 'You can invite by email. They\'ll get a notification to join.',
  },
  {
    id: 'start_game',
    title: 'Start a Game',
    description: 'Set your buy-in amount and chips. When you start, everyone gets their chips automatically!',
    icon: Play,
    tip: 'Default buy-in is $20 for 20 chips ($1/chip). You can customize this.',
  },
  {
    id: 'during_game',
    title: 'During the Game',
    description: 'Players can request rebuys. As host, you approve buy-ins and track everyone\'s chips.',
    icon: Coins,
    tip: 'The game thread shows all activity. Everyone sees updates in real-time.',
  },
  {
    id: 'cash_out',
    title: 'Cash Out & Settle',
    description: 'When players cash out, enter their chip count. Kvitt calculates who owes who.',
    icon: DollarSign,
    tip: 'Settlement is calculated automatically. Mark payments as done when complete.',
  },
  {
    id: 'done',
    title: 'You\'re Ready!',
    description: 'Start your first game and enjoy hassle-free poker nights!',
    icon: CheckCircle,
    tip: 'Head to Groups to create your first poker group.',
  },
];

export default function OnboardingGuide({ onComplete, isModal = false }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
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

  return (
    <div className={`${isModal ? '' : 'min-h-screen bg-background flex items-center justify-center p-4'}`}>
      <Card className="w-full max-w-md bg-card border-border/50 shadow-xl">
        <CardContent className="p-6">
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

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
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
