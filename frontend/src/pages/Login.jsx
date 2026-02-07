import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { Eye, EyeOff, Mail, Lock, ChevronLeft } from "lucide-react";

// Auth method selection screen
function AuthMethodSelection({ onSelectEmail }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='8' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle' opacity='0.3'%3E%E2%99%A0 %E2%99%A5 %E2%99%A6 %E2%99%A3%3C/text%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="large" showText={false} />
        </div>

        {/* Title */}
        <h1 className="text-white text-3xl font-bold mb-2">Start playing</h1>
        <p className="text-gray-400 mb-10">Sign in to continue with Kvitt</p>

        {/* Auth buttons */}
        <div className="w-full space-y-3">
          {/* Apple */}
          <button className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continue with Apple
          </button>

          {/* Google */}
          <button className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-white font-semibold py-4 px-6 rounded-xl border border-gray-700 hover:bg-[#252525] transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Email */}
          <button 
            onClick={onSelectEmail}
            className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-white font-semibold py-4 px-6 rounded-xl border border-gray-700 hover:bg-[#252525] transition-colors"
          >
            <Mail className="w-5 h-5" />
            Continue with Email
          </button>
        </div>

        {/* Terms */}
        <p className="text-gray-500 text-sm text-center mt-auto pt-16">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="underline text-gray-400">Terms of Service</Link> and{" "}
          <Link to="/privacy" className="underline text-gray-400">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

// Email login form
function EmailLoginForm({ onBack, onSwitchToSignup, onForgotPassword }) {
  const navigate = useNavigate();
  const { signIn, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Authentication is not configured. Please add Supabase credentials.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col p-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='8' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle' opacity='0.3'%3E%E2%99%A0 %E2%99%A5 %E2%99%A6 %E2%99%A3%3C/text%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col flex-1">
        {/* Back button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-white bg-[#1a1a1a] rounded-full px-4 py-2 w-fit mb-8 hover:bg-[#252525] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="text-5xl">⚡</div>
        </div>

        {/* Title */}
        <h1 className="text-white text-3xl font-bold text-center mb-8">Ready to resume?</h1>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-900">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {!isSupabaseConfigured && (
          <Alert className="mb-4 border-yellow-600/50 bg-yellow-900/20">
            <AlertDescription className="text-sm text-yellow-200">
              <strong>Setup Required:</strong> Add Supabase credentials to .env
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider">Email</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl mt-2"
              data-testid="email-input"
              disabled={loading}
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider">Password</Label>
            <div className="relative mt-2">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl pr-10"
                data-testid="password-input"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-gray-400 text-sm uppercase tracking-wider underline hover:text-white block mx-auto"
          >
            Forgot Password?
          </button>
        </form>

        {/* Bottom section */}
        <div className="mt-auto pt-8">
          <p className="text-gray-400 text-center mb-4">
            New to Kvitt?{" "}
            <button onClick={onSwitchToSignup} className="text-primary underline font-medium uppercase">
              Create an Account
            </button>
          </p>

          <Button
            onClick={handleSubmit}
            className="w-full bg-white text-black font-semibold h-14 rounded-xl hover:bg-gray-100"
            disabled={loading || !isSupabaseConfigured}
            data-testid="login-submit-btn"
          >
            {loading ? "Signing in..." : "Log in"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Forgot password form
function ForgotPasswordForm({ onBack }) {
  const { resetPassword, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success("Reset link sent to your email");
    } catch (err) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col p-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='8' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle' opacity='0.3'%3E%E2%99%A0 %E2%99%A5 %E2%99%A6 %E2%99%A3%3C/text%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col flex-1">
        {/* Back button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-white bg-[#1a1a1a] rounded-full px-4 py-2 w-fit mb-8 hover:bg-[#252525] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6 mt-16">
          <div className="text-5xl">✉️</div>
        </div>

        {/* Title */}
        <h1 className="text-white text-3xl font-bold text-center mb-3">Reset Your Password</h1>
        <p className="text-gray-400 text-center mb-8">
          Enter the email address associated with your account, and we'll send you a link to reset your password.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider">Email</Label>
            <Input
              type="email"
              placeholder="ex: john.doe00@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl mt-2"
              disabled={loading || sent}
            />
          </div>
        </form>

        {/* Bottom section */}
        <div className="mt-auto pt-8">
          <Button
            onClick={handleSubmit}
            className="w-full bg-white text-black font-semibold h-14 rounded-xl hover:bg-gray-100"
            disabled={loading || sent || !isSupabaseConfigured}
          >
            {sent ? "Link Sent!" : loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState("methods"); // methods, email, forgot

  if (view === "forgot") {
    return <ForgotPasswordForm onBack={() => setView("email")} />;
  }

  if (view === "email") {
    return (
      <EmailLoginForm 
        onBack={() => setView("methods")} 
        onSwitchToSignup={() => navigate("/signup")}
        onForgotPassword={() => setView("forgot")}
      />
    );
  }

  return <AuthMethodSelection onSelectEmail={() => setView("email")} />;
}
