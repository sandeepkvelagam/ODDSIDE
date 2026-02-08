import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Crown, Check, Sparkles, Zap, BarChart3, Download, 
  Shield, Star, ArrowLeft, Loader2
} from "lucide-react";
import Navbar from "@/components/Navbar";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const PLAN_ICONS = {
  monthly: Zap,
  yearly: Star,
  lifetime: Crown
};

export default function Premium() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchPremiumStatus();
    
    // Check if returning from Stripe checkout
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/premium/plans`);
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPremiumStatus = async () => {
    try {
      const response = await axios.get(`${API}/premium/me`);
      setPremiumStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch premium status:", error);
    }
  };

  const checkPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    
    if (attempts >= maxAttempts) {
      toast.error("Payment verification timed out. Please check your email for confirmation.");
      navigate('/premium', { replace: true });
      return;
    }

    setCheckingPayment(true);
    
    try {
      const response = await axios.get(`${API}/premium/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        toast.success("Welcome to Kvitt Pro! 🎉");
        fetchPremiumStatus();
        navigate('/premium', { replace: true });
      } else if (response.data.status === 'expired') {
        toast.error("Payment session expired. Please try again.");
        navigate('/premium', { replace: true });
      } else {
        // Still pending, poll again
        setTimeout(() => checkPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      console.error("Failed to check payment:", error);
      toast.error("Error checking payment status");
    } finally {
      if (attempts >= maxAttempts - 1) {
        setCheckingPayment(false);
      }
    }
  };

  const handleUpgrade = async (planId) => {
    setProcessing(planId);
    
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(`${API}/premium/checkout`, {
        plan_id: planId,
        origin_url: originUrl
      });
      
      // Redirect to Stripe checkout
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start checkout");
      setProcessing(null);
    }
  };

  if (loading || checkingPayment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            {checkingPayment ? "Verifying payment..." : "Loading plans..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Kvitt Pro</h1>
          </div>
          
          <p className="text-muted-foreground max-w-md mx-auto">
            Unlock powerful features to take your poker nights to the next level
          </p>
          
          {premiumStatus?.is_premium && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500 font-medium">
                You're on {premiumStatus.plan} plan
                {premiumStatus.until !== 'lifetime' && ` until ${new Date(premiumStatus.until).toLocaleDateString()}`}
              </span>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || Star;
            const isCurrentPlan = premiumStatus?.plan === plan.id;
            const isPopular = plan.id === 'yearly';
            
            return (
              <Card 
                key={plan.id}
                className={`relative bg-card border-border/50 ${isPopular ? 'border-primary ring-2 ring-primary/20' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-black text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.interval === 'once' ? 'One-time payment' : `Billed ${plan.interval}ly`}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    {plan.interval !== 'once' && (
                      <span className="text-muted-foreground">/{plan.interval}</span>
                    )}
                  </div>
                  
                  <ul className="space-y-2 mb-6 text-left">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className={`w-full ${isPopular ? 'bg-primary text-black hover:bg-primary/90' : ''}`}
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || processing === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {processing === plan.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      'Upgrade Now'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features List */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              What's included in Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: BarChart3, title: "Group Analytics", desc: "See trends and insights for your poker group" },
                { icon: Download, title: "Export Data", desc: "Download game history as CSV or PDF" },
                { icon: Shield, title: "Priority Support", desc: "Get help faster with dedicated support" },
                { icon: Star, title: "Monthly Summaries", desc: "Automated reports sent to your email" },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
