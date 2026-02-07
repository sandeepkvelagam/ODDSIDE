import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, isSupabaseConfigured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Authentication is not configured. Please add Supabase credentials.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name);
      toast.success("Account created! Please check your email to verify.");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

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
            <Label className="text-gray-400 text-xs uppercase tracking-wider">Name</Label>
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                placeholder="Min. 6 characters"
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
