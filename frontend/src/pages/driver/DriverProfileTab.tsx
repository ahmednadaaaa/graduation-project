import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { DriverProfile } from "@/utils/data";
import { uploadProfilePicture, updateUserProfile } from "@/lib/apiClient";

const DriverProfileTab = ({ profile }: { profile: DriverProfile }) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...profile, password: "", confirmPassword: "" });
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    if (strength <= 1) return { label: "Weak", color: "bg-destructive", width: "33%" };
    if (strength === 2) return { label: "Medium", color: "bg-warning", width: "66%" };
    return { label: "Strong", color: "bg-success", width: "100%" };
  };

  const handleSave = async () => {
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (avatarFile) {
        await uploadProfilePicture(avatarFile);
      }
      await updateUserProfile({
        full_name: formData.name,
        phone: formData.phone
      });
      toast({ title: "Profile Updated", description: "Changes saved successfully" });
      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      toast({ title: "Update Failed", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass-card rounded-2xl p-6 text-center space-y-4">
        <div className="relative inline-block">
          <img src={avatarPreview} alt={profile.name} className="h-20 w-20 rounded-full mx-auto object-cover border-2 border-primary/20" />
          {isEditing && (
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 h-7 w-7 rounded-full gradient-primary flex items-center justify-center shadow-lg">
              <Camera className="h-3.5 w-3.5 text-primary-foreground" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
        <div>
          <h2 className="font-bold text-xl">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">Driver • {profile.busNumber}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input disabled={!isEditing} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input disabled={!isEditing} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input disabled={!isEditing} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>License Number</Label>
          <Input disabled={!isEditing} value={formData.license} onChange={(e) => setFormData({ ...formData, license: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Bus Number</Label>
          <Input disabled value={formData.busNumber} />
        </div>
        {isEditing && (
          <>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter new password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-border rounded">
                    <div className={`h-1.5 rounded transition-all ${getPasswordStrength(formData.password).color}`} style={{ width: getPasswordStrength(formData.password).width }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength: <span className="font-medium">{getPasswordStrength(formData.password).label}</span>
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Confirm password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
            </div>
            <Button
              className="w-full"
              disabled={loading}
              onClick={handleSave}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default DriverProfileTab;
