import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import WelcomeScreen from "@/components/WelcomeScreen";
import { Eye, EyeOff, ChevronLeft, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { parseSupabaseError, ErrorCode, logError } from "@/lib/errorHandler";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, resetPassword, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null); // { code, message }
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError({ code: ErrorCode.USER_INVALID_EMAIL, message: "Please enter your email address." });
      return;
    }
    if (!emailRegex.test(email)) {
      setError({ code: ErrorCode.USER_INVALID_EMAIL, message: "Please enter a valid email address." });
      return;
    }
    if (!password) {
      setError({ code: ErrorCode.AUTH_WRONG_PASSWORD, message: "Please enter your password." });
      return;
    }
    if (password.length < 6) {
      setError({ code: ErrorCode.AUTH_WRONG_PASSWORD, message: "Password must be at least 6 characters." });
      return;
    }

    if (!isSupabaseConfigured) {
      setError({ code: ErrorCode.SERVER_ERROR, message: "Authentication service is not configured. Please contact support." });
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(email, password);
      setLoggedInUser(user);
      // Show welcome screen after successful login
      setShowWelcome(true);
    } catch (err) {
      logError('Login', err);
      const parsedError = parseSupabaseError(err);
      setError(parsedError);
      setLoading(false);
    }
  };

  // Show welcome screen after login
  if (showWelcome) {
    return (
      <WelcomeScreen 
        onComplete={() => {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }} 
        userName={loggedInUser?.name || email.split('@')[0]} 
      />
    );
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError({ code: ErrorCode.USER_INVALID_EMAIL, message: "Please enter your email address." });
      return;
    }
    
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      toast.success("Reset link sent to your email");
    } catch (err) {
      logError('ForgotPassword', err);
      const parsedError = parseSupabaseError(err);
      setError(parsedError);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password View
  if (showForgot) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col p-6 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle'%3E%E2%99%A0%3C/text%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col flex-1">
          {/* Back button */}
          <button 
            onClick={() => { setShowForgot(false); setError(""); setResetSent(false); }}
            className="flex items-center gap-1 text-white bg-[#1a1a1a] rounded-full px-4 py-2 w-fit mb-8 hover:bg-[#252525] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6 mt-8">
            <div className="text-5xl">✉️</div>
          </div>

          {/* Title */}
          <h1 className="text-white text-2xl sm:text-3xl font-bold text-center mb-3">Reset Your Password</h1>
          <p className="text-gray-400 text-center mb-8 text-sm sm:text-base">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-900">
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {resetSent ? (
            <div className="text-center py-8">
              <p className="text-green-400 mb-4">✓ Reset link sent!</p>
              <p className="text-gray-400 text-sm">Check your email for the password reset link.</p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl mt-2"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-black font-semibold h-12 rounded-xl hover:bg-gray-100"
                disabled={loading || !isSupabaseConfigured}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Main Login View
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col p-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle'%3E%E2%99%A0%3C/text%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col flex-1">
        {/* Back to home */}
        <Link 
          to="/"
          className="flex items-center gap-1 text-white bg-[#1a1a1a] rounded-full px-4 py-2 w-fit mb-8 hover:bg-[#252525] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Home
        </Link>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="large" showTagline={false} className="justify-center" />
        </div>

        {/* Title */}
        <h1 className="text-white text-2xl sm:text-3xl font-bold text-center mb-2">Welcome back</h1>
        <p className="text-gray-400 text-center mb-8">Sign in to your Kvitt account</p>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-900">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error.message}
              {error.code === ErrorCode.AUTH_EMAIL_NOT_FOUND && (
                <Link to="/signup" className="block mt-2 text-orange-400 hover:underline text-sm">
                  → Create an account
                </Link>
              )}
              {error.code === ErrorCode.AUTH_WRONG_PASSWORD && (
                <button 
                  onClick={() => setShowForgot(true)} 
                  className="block mt-2 text-orange-400 hover:underline text-sm"
                >
                  → Reset password
                </button>
              )}
              {error.code === ErrorCode.NETWORK_ERROR && (
                <span className="flex items-center gap-1 mt-2 text-yellow-400 text-sm">
                  <WifiOff className="w-3 h-3" /> Check your connection
                </span>
              )}
            </AlertDescription>
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
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className={`bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl mt-2 ${error?.code === ErrorCode.USER_INVALID_EMAIL || error?.code === ErrorCode.AUTH_EMAIL_NOT_FOUND ? 'border-red-500' : ''}`}
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
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className={`bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl pr-10 ${error?.code === ErrorCode.AUTH_WRONG_PASSWORD || error?.code === ErrorCode.AUTH_INVALID_CREDENTIALS ? 'border-red-500' : ''}`}
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
            onClick={() => setShowForgot(true)}
            className="text-gray-400 text-sm hover:text-white block mx-auto"
          >
            Forgot password?
          </button>

          <Button
            type="submit"
            className="w-full bg-white text-black font-semibold h-12 rounded-xl hover:bg-gray-100"
            disabled={loading || !isSupabaseConfigured}
            data-testid="login-submit-btn"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Sign up link */}
        <p className="text-gray-400 text-center mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>

        {/* Terms */}
        <p className="text-gray-500 text-xs text-center mt-auto pt-8">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="underline">Terms</Link> and{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
