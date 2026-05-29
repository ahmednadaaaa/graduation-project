import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock, Search, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";
import { fetchPendingUsers, approveUser, rejectUser, type ApiPendingUser } from "@/lib/apiClient";
import { toast } from "sonner";

interface Props {
  asTab?: boolean;
}

const ApprovalsContent = () => {
  const [users, setUsers] = useState<ApiPendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingUsers();
      setUsers(data);
    } catch (err) {
      toast.error("Failed to load pending users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await approveUser(id);
      toast.success("User approved successfully");
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      toast.error("Failed to approve user");
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Enter reason for rejection (optional):");
    if (reason === null) return; // cancelled
    try {
      await rejectUser(id, reason);
      toast.success("User rejected");
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      toast.error("Failed to reject user");
    }
  };

  const filtered = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Pending Approvals
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve new student and driver registrations.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search pending users..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-12 glass-card rounded-2xl border-dashed">
          <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-bold">No Pending Approvals</h3>
          <p className="text-muted-foreground text-sm">All caught up! There are no users waiting for approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((user) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={user.id}
              className="glass-card rounded-2xl p-5 border border-border/50 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <AlertTriangle className="h-20 w-20" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{user.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.role === "driver" ? "secondary" : "default"}>
                    {user.role}
                  </Badge>
                </div>
                
                <div className="text-sm space-y-1 text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50">
                  <p><span className="font-medium text-foreground">Joined:</span> {new Date(user.date_joined).toLocaleDateString()}</p>
                  {user.phone && <p><span className="font-medium text-foreground">Phone:</span> {user.phone}</p>}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleApprove(user.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2">
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button onClick={() => handleReject(user.id)} variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2">
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const ApprovalsPage = ({ asTab }: Props) => {
  if (asTab) return <ApprovalsContent />;
  return (
    <AppLayout title="Account Approvals">
      <div className="p-6">
        <ApprovalsContent />
      </div>
    </AppLayout>
  );
};

export default ApprovalsPage;
