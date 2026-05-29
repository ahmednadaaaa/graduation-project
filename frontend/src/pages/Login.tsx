import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Eye, EyeOff, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { fetchProfile, loginWithPassword } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RegisterForm from "@/pages/Register";

// ─── Login form ────────────────────────────────────────────────────────────────
const LoginForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { login }               = useAppStore();
  const navigate                = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokens = await loginWithPassword(email, password);
      localStorage.setItem("token", tokens.access);
      if (tokens.refresh) localStorage.setItem("refresh", tokens.refresh);
      const profile = await fetchProfile();
      const role = profile.role as "admin" | "driver" | "student";
      login(
        {
          id: String(profile.id),
          name: profile.full_name,
          email: profile.email,
          role,
          avatar: profile.profile_picture || undefined,
          assignedBus: profile.assigned_bus,
        },
        tokens.access,
      );
      navigate(`/${role}`);
    } catch (err: unknown) {
      let msg = "Invalid email or password.";
      if (err && typeof err === "object" && "response" in err) {
        const d = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (typeof d === "string") msg = d;
        else if (d?.detail) msg = d.detail;
        else if (d && typeof d === "object") msg = JSON.stringify(d);
      }
      
      if (msg.toLowerCase().includes("pending admin approval") || msg.toLowerCase().includes("rejected")) {
        setIsPending(true);
        setError(msg);
      } else {
        setError(msg.length > 220 ? "Invalid email or password." : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <motion.div
        key="pending"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Account Pending</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {error}
        </p>
        <Button onClick={() => { setIsPending(false); setError(""); }} variant="outline" className="w-full">
          Back to Login
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.28 }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email address</Label>
          <Input id="login-email" type="email" placeholder="you@bustrack.io" value={email}
            onChange={(e) => setEmail(e.target.value)} required className="bg-background/50" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-pw">Password</Label>
          <div className="relative">
            <Input id="login-pw" type={showPw ? "text" : "password"} placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              className="bg-background/50 pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
          {loading
            ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />Signing in…</span>
            : <span className="flex items-center gap-2">Sign In <ChevronRight className="h-4 w-4" /></span>}
        </Button>
      </form>


      <p className="text-center text-sm text-muted-foreground mt-5">
        Don't have an account?{" "}
        <button onClick={onSwitch} className="text-primary font-medium hover:underline">Register</button>
      </p>
    </motion.div>
  );
};

// ─── Page shell ────────────────────────────────────────────────────────────────
const Login = () => {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-dark">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl gradient-primary items-center justify-center mb-4 glow-primary">
            <Bus className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BusTrack Pro</h1>
          <p className="text-muted-foreground text-sm mt-1">Smart School Bus Tracking System</p>
        </div>

        <div className="glass-card-strong rounded-2xl p-6 overflow-hidden">
          <AnimatePresence mode="wait">
            {mode === "login"
              ? <LoginForm key="login" onSwitch={() => setMode("register")} />
              : (
                <motion.div key="register" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.28 }}>
                  <RegisterForm onSwitchToLogin={() => setMode("login")} />
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
