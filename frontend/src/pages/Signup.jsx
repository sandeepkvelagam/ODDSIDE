import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { Eye, EyeOff, ChevronLeft, AlertCircle, WifiOff, Mail, RefreshCw } from "lucide-react";
import { parseSupabaseError, ErrorCode, logError } from "@/lib/errorHandler";

export default function Signup() {
  const location = useLocation();
  const { signUp, resendVerification, isSupabaseConfigured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null); // { code, message }
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name.trim()) {
      setError({ code: ErrorCode.AUTH_SIGNUP_FAILED, message: "Please enter your name." });
      return;
    }
    if (!email) {
      setError({ code: ErrorCode.USER_INVALID_EMAIL, message: "Please enter your email address." });
      return;
    }
    if (!emailRegex.test(email)) {
      setError({ code: ErrorCode.USER_INVALID_EMAIL, message: "Please enter a valid email address." });
      return;
    }
    if (!password) {
      setError({ code: ErrorCode.AUTH_SIGNUP_FAILED, message: "Please enter a password." });
      return;
    }
    if (password.length < 6) {
      setError({ code: ErrorCode.AUTH_SIGNUP_FAILED, message: "Password must be at least 6 characters." });
      return;
    }

    if (!isSupabaseConfigured) {
      setError({ code: ErrorCode.SERVER_ERROR, message: "Authentication service is not configured." });
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name);
      setSignupSuccess(true);
    } catch (err) {
      logError('Signup', err);
      const parsedError = parseSupabaseError(err);
      setError(parsedError);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await resendVerification(email);
      toast.success("Verification email sent! Check your inbox.");
    } catch (err) {
      logError('ResendVerification', err);
      const parsedError = parseSupabaseError(err);
      toast.error(parsedError.message);
    } finally {
      setResendLoading(false);
    }
  };

  // Show verification success screen
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col p-6 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle'%3E%E2%99%A0%3C/text%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col flex-1 items-center justify-center">
          {/* Email icon */}
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-white text-2xl sm:text-3xl font-bold text-center mb-3">Check your inbox!</h1>
          <p className="text-gray-400 text-center mb-2">
            We sent a verification email to
          </p>
          <p className="text-white font-medium text-center mb-6">{email}</p>

          <p className="text-gray-400 text-center text-sm mb-8">
            Click the link in the email to activate your account.
          </p>

          {/* Tips */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 w-full mb-6">
            <p className="text-gray-400 text-sm mb-2">Didn't receive it?</p>
            <ul className="text-gray-500 text-sm space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure {email} is correct</li>
            </ul>
          </div>

          {/* Resend button */}
          <Button
            onClick={handleResendVerification}
            variant="outline"
            className="w-full border-gray-700 text-white hover:bg-[#1a1a1a] h-12 rounded-xl mb-4"
            disabled={resendLoading}
          >
            {resendLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>

          {/* Go to login */}
          <Link to="/login" className="w-full">
            <Button className="w-full bg-white text-black font-semibold h-12 rounded-xl hover:bg-gray-100">
              Go to Login
            </Button>
          </Link>

          <p className="text-gray-500 text-xs text-center mt-6">
            Already verified? Just log in above.
          </p>
        </div>
      </div>
    );
  }

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
        <Link
          to="/login"
          className="flex items-center gap-1 text-white bg-[#1a1a1a] rounded-full px-4 py-2 w-fit mb-8 hover:bg-[#252525] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="large" showTagline={false} className="justify-center" />
        </div>

        {/* Title */}
        <h1 className="text-white text-2xl sm:text-3xl font-bold text-center mb-2">Create account</h1>
        <p className="text-gray-400 text-center mb-8">Join Kvitt and start tracking</p>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-900">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error.message}
              {error.code === ErrorCode.USER_ALREADY_EXISTS && (
                <Link to="/login" className="block mt-2 text-orange-400 hover:underline text-sm">
                  Go to Login
                </Link>
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
            <Label className="text-gray-400 text-xs uppercase tracking-wider">Name</Label>
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl mt-2"
              data-testid="name-input"
              disabled={loading}
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider">Email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className={`bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl mt-2 ${error?.code === ErrorCode.USER_INVALID_EMAIL || error?.code === ErrorCode.USER_ALREADY_EXISTS ? 'border-red-500' : ''}`}
              data-testid="email-input"
              disabled={loading}
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs uppercase tracking-wider">Password</Label>
            <div className="relative mt-2">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
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

          <Button
            type="submit"
            className="w-full bg-white text-black font-semibold h-12 rounded-xl hover:bg-gray-100"
            disabled={loading || !isSupabaseConfigured}
            data-testid="signup-submit-btn"
          >
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </form>

        {/* Sign in link */}
        <p className="text-gray-400 text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>

        {/* Terms */}
        <p className="text-gray-500 text-xs text-center mt-auto pt-8">
          By signing up, you agree to our{" "}
          <Link to="/terms" className="underline">Terms</Link> and{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
