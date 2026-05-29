import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { StudentProfile } from "@/utils/data";
import { updateStudentProfile, uploadProfilePicture, updateUserProfile } from "@/lib/apiClient";

const StudentProfileTab = ({ profile }: { profile: StudentProfile }) => {
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    ...profile,
    password: "",
    confirmPassword: "",
  });

  /* ============================= */
  /* Handlers */
  /* ============================= */

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload a valid image file", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 2MB", variant: "destructive" });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    setFormData({ ...profile, password: "" });
    setAvatarPreview(profile.avatar);
    setAvatarFile(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (isFormInvalid) return;
    setLoading(true);
    try {
      // 1. Upload avatar if changed
      if (avatarFile) {
        await uploadProfilePicture(avatarFile);
      }

      // 2. Update other details
      await updateUserProfile({
        full_name: formData.name,
        phone: formData.phone
      });

      toast({ title: "Profile Updated ✅", description: "Your changes have been saved successfully" });
      setAvatarFile(null);
      setIsEditing(false);
      // Refreshing the whole page to update the header avatar
      window.location.reload();
    } catch (err) {
      toast({ title: "Update Failed", description: "Could not save profile changes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /* ============================= */
  /* Password Strength */
  /* ============================= */

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 1) return { label: "Weak", color: "bg-destructive", width: "33%" };
    if (strength === 2) return { label: "Medium", color: "bg-yellow-500", width: "66%" };
    return { label: "Strong", color: "bg-green-500", width: "100%" };
  };

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  /* ============================= */
  /* Validation */
  /* ============================= */

  const isPasswordMismatch = formData.password && formData.password !== formData.confirmPassword;

  const isNameEmpty = formData.name.trim().length === 0;

  const isFormInvalid = isPasswordMismatch || isNameEmpty;

  /* ============================= */
  /* UI */
  /* ============================= */

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-6 text-center space-y-4">
        <div className="relative inline-block">
          <img src={avatarPreview} alt={formData.name} className="h-24 w-24 rounded-full mx-auto object-cover border-2 border-primary/30" />

          {isEditing && (
            <button type="button" aria-label="Change avatar" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 h-8 w-8 rounded-full gradient-primary flex items-center justify-center shadow-lg hover:scale-105 transition">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>

        <div>
          <h2 className="font-bold text-xl">{formData.name}</h2>
          <p className="text-sm text-muted-foreground">Student • {formData.grade}</p>
        </div>

        {!isEditing ? (
          <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Form */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input disabled={!isEditing} value={formData.name} onChange={handleChange("name")} />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input disabled type="email" value={formData.email} />
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input disabled={!isEditing} value={formData.phone} onChange={handleChange("phone")} />
        </div>

        <div className="space-y-2">
          <Label>Grade</Label>
          <Input disabled value={formData.grade} />
        </div>

        {isEditing && (
          <>
            {/* Password */}
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter new password" value={formData.password} onChange={handleChange("password")} />
                <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {formData.password && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-border rounded">
                    <div className={`h-1.5 rounded transition-all ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength: <span className="font-medium">{passwordStrength.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange("confirmPassword")} />
              {isPasswordMismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
            </div>

            <Button className="w-full" disabled={isFormInvalid || loading} onClick={handleSave}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default StudentProfileTab;
