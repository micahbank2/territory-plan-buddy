import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import yextLogoBlack from "@/assets/yext-logo-black.jpg";

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (forgotMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for a password reset link!");
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! You're now signed in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <RetroGrid className="opacity-30" />
      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <img src={yextLogoBlack} alt="Yext" className="h-10 mx-auto dark:hidden" />
          <h1 className="text-3xl font-black gradient-text">Territory Planner</h1>
          <p className="text-sm text-muted-foreground">
            {forgotMode ? "Enter your email to reset your password" : isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {!forgotMode && (
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : forgotMode ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
          {!isSignUp && !forgotMode && (
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="text-xs text-muted-foreground hover:text-primary hover:underline w-full text-center"
            >
              Forgot password?
            </button>
          )}
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {forgotMode ? (
            <button onClick={() => setForgotMode(false)} className="text-primary hover:underline font-medium">
              Back to Sign In
            </button>
          ) : (
            <>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
