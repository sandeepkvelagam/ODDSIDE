import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ChevronRight, Users, Play, DollarSign, CheckCircle } from "lucide-react";

const TUTORIAL_STEPS = [
  {
    icon: Users,
    title: "Create a Group",
    description: "Invite your poker buddies to join your group"
  },
  {
    icon: Play,
    title: "Start a Game",
    description: "Set buy-in amount and chips, then start playing"
  },
  {
    icon: DollarSign,
    title: "Track & Settle",
    description: "Log buy-ins, cash-outs, and auto-settle at the end"
  }
];

export default function WelcomeScreen({ onComplete, userName }) {
  const [phase, setPhase] = useState("loading"); // loading, welcome, tutorial
  const [logoScale, setLogoScale] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen tutorial
    const hasSeenTutorial = localStorage.getItem("kvitt-seen-tutorial");
    
    // Logo animation: zoom in then out
    const animationSequence = async () => {
      // Start small
      setLogoScale(0.5);
      
      // Zoom in
      await new Promise(r => setTimeout(r, 100));
      setLogoScale(1.2);
      
      // Zoom out to normal
      await new Promise(r => setTimeout(r, 1000));
      setLogoScale(1);
      
      // Wait a bit more
      await new Promise(r => setTimeout(r, 1500));
      
      // If first time, show welcome/tutorial
      if (!hasSeenTutorial) {
        setPhase("welcome");
      } else {
        onComplete();
      }
    };
    
    animationSequence();
  }, [onComplete]);

  const handleSkip = () => {
    localStorage.setItem("kvitt-seen-tutorial", "true");
    onComplete();
  };

  const handleContinue = () => {
    if (phase === "welcome") {
      setPhase("tutorial");
    } else if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem("kvitt-seen-tutorial", "true");
      onComplete();
    }
  };

  // Loading phase with animated logo
  if (phase === "loading") {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-50">
        <div 
          className="transition-transform duration-700 ease-out"
          style={{ transform: `scale(${logoScale})` }}
        >
          <Logo size="large" showTagline={false} />
        </div>
      </div>
    );
  }

  // Welcome message for first-timers
  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 p-6">
        <div className="max-w-md text-center">
          <Logo size="large" showTagline={true} className="justify-center mb-8" />
          
          <h1 className="text-white text-2xl sm:text-3xl font-bold mb-4">
            Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
          </h1>
          
          <p className="text-gray-400 mb-8">
            Ready to track your poker nights like a pro? Let us show you around.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleContinue}
              className="w-full bg-white text-black font-semibold h-12 rounded-xl hover:bg-gray-100"
            >
              Show me how
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <button 
              onClick={handleSkip}
              className="text-gray-500 text-sm hover:text-white transition-colors"
            >
              Skip, I know what I'm doing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tutorial steps
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 p-6">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep ? 'bg-primary' : 
                idx < currentStep ? 'bg-primary/50' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        
        {/* Current step */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            {(() => {
              const Icon = TUTORIAL_STEPS[currentStep].icon;
              return <Icon className="w-8 h-8 text-primary" />;
            })()}
          </div>
          
          <h2 className="text-white text-xl sm:text-2xl font-bold mb-3">
            {TUTORIAL_STEPS[currentStep].title}
          </h2>
          
          <p className="text-gray-400 mb-8">
            {TUTORIAL_STEPS[currentStep].description}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleContinue}
            className="w-full bg-white text-black font-semibold h-12 rounded-xl hover:bg-gray-100"
          >
            {currentStep < TUTORIAL_STEPS.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Get Started
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          <button 
            onClick={handleSkip}
            className="text-gray-500 text-sm hover:text-white transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}
