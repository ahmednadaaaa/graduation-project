import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, User, X, ChevronRight, ArrowLeft, Eye, EyeOff, ScanFace } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import {
  createStudentProfile,
  dataUrlToBlob,
  fetchProfile,
  loginWithPassword,
  registerUser,
  uploadFaceImage,
} from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FaceCapture from "@/components/FaceCapture";

const GRADES = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const TOTAL_STEPS = 3;

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [avatarPreview, setAvatar] = useState<string | null>(null);
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", parentPhone: "",
    grade: "", password: "", confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);  // guard against duplicate submissions
  const { login } = useAppStore();
  const navigate = useNavigate();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validateStep1 = (): string | null => {
    if (!form.name.trim()) return "Full name is required.";
    if (!form.email.includes("@")) return "Enter a valid email address.";
    if (!form.phone.match(/^01[0-9]{9}$/)) return "Enter a valid Egyptian phone number (01xxxxxxxxx).";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (!form.grade) return "Please select your grade.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm) return "Passwords don't match.";
    return null;
  };

  const handleNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setError("");
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setError("");
      setStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleFaceComplete = async (images: string[]) => {
    if (submitting.current) return;
    submitting.current = true;
    setFaceImages(images);
    setError("");
    setLoading(true);
    const GRADE_YEAR: Record<string, number> = {
      "Grade 7": 1,
      "Grade 8": 2,
      "Grade 9": 3,
      "Grade 10": 4,
      "Grade 11": 5,
      "Grade 12": 6,
    };
    try {
      const email = form.email.trim().toLowerCase();
      const academic_year = GRADE_YEAR[form.grade] ?? 1;
      
      // We pass academic_year to registerUser via an extra field, we need to update registerUser in apiClient
      await registerUser({
        email,
        password: form.password,
        full_name: form.name.trim(),
        role: "student",
        phone: form.phone,
        academic_year,
      });
      
      // Because we can't login without admin approval, we cannot upload face images right now.
      // We will skip face image upload here and let the student do it after approval.
      setSuccess(true);
      setTimeout(() => onSwitchToLogin(), 3000);
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: unknown } }).response?.data
          : e;
      if (typeof detail === "string") {
        setError(detail);
      } else if (detail && typeof detail === "object") {
        const d = detail as Record<string, unknown>;
        const rawEmail = Array.isArray(d.email) ? String(d.email[0]) : null;
        const phoneErr = Array.isArray(d.phone) ? String(d.phone[0]) : null;
        const fullNameErr = Array.isArray(d.full_name) ? String(d.full_name[0]) : null;
        const emailErr = rawEmail?.includes("already exists")
          ? "This email is already registered — please sign in instead."
          : rawEmail;
        setError(
          emailErr ||
            phoneErr ||
            fullNameErr ||
            "Registration failed. Please check your data and try again.",
        );
      } else {
        setError("Registration failed. Please check your data and try again.");
      }
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-10 gap-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <span className="text-4xl">✓</span>
        </motion.div>
        <p className="text-lg font-semibold">Account Created!</p>
        <p className="text-muted-foreground text-sm">Redirecting to your dashboard…</p>
      </motion.div>
    );
  }

  const stepLabel =
    step === 1 ? "Personal info" :
    step === 2 ? "Academic & security" :
    "Face enrollment";

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-bold text-foreground">Create account</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Step {step} of {TOTAL_STEPS} — {stepLabel}
          </p>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i + 1 <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); handleNext(); }}
        className="space-y-4"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-2 ring-border">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      : <User className="h-7 w-7 text-primary-foreground" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="h-3 w-3 text-primary-foreground" />
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => setAvatar(null)}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-destructive-foreground" />
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Profile photo</p>
                  <p className="text-xs text-muted-foreground">Optional · JPG or PNG</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-name">Full name</Label>
                <Input id="reg-name" placeholder="Maya Johnson" value={form.name} onChange={set("name")} required className="bg-background/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email address</Label>
                <Input id="reg-email" type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} required className="bg-background/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Your phone</Label>
                  <Input id="reg-phone" placeholder="01xxxxxxxxx" value={form.phone} onChange={set("phone")} required className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-parent">Parent's phone</Label>
                  <Input id="reg-parent" placeholder="01xxxxxxxxx (optional)" value={form.parentPhone} onChange={set("parentPhone")} className="bg-background/50" />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Grade / Year</Label>
                <Select value={form.grade} onValueChange={(v) => setForm((f) => ({ ...f, grade: v }))}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-pw">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-pw"
                    type={showPw ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={set("password")}
                    required
                    className="bg-background/50 pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        form.password.length >= i * 3
                          ? i <= 2 ? "bg-yellow-500" : i === 3 ? "bg-blue-500" : "bg-green-500"
                          : "bg-border"
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-cf">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="reg-cf"
                    type={showCf ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={form.confirm}
                    onChange={set("confirm")}
                    required
                    className={`bg-background/50 pr-10 ${
                      form.confirm && form.confirm !== form.password ? "border-destructive" : ""
                    }`}
                  />
                  <button type="button" onClick={() => setShowCf(!showCf)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.confirm && form.confirm !== form.password && (
                  <p className="text-xs text-destructive">Passwords don't match</p>
                )}
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <ScanFace className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Next step: we'll capture 3 photos of your face for secure attendance check-in.</span>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <FaceCapture onComplete={handleFaceComplete} onBack={handleBack} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {step < 3 && (
          <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Checking…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {step === 2 ? "Continue to face scan" : "Next"} <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        )}

        {step === 3 && loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Creating your account…
          </div>
        )}
      </form>

      {step === 1 && (
        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{" "}
          <button onClick={onSwitchToLogin} className="text-primary font-medium hover:underline">
            Sign in
          </button>
        </p>
      )}
    </>
  );
};

export default RegisterForm;
