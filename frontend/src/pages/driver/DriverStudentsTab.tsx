import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { StudentPickup } from "@/utils/data";

interface Props {
  pickups: StudentPickup[];
  boarded: number;
  waiting: number;
  absent: number;
  confirmBoarding: (id: string) => void;
  markAbsent: (id: string) => void;
}

const DriverStudentsTab = ({ pickups, boarded, waiting, absent, confirmBoarding, markAbsent }: Props) => {
  const { toast } = useToast();
  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast({ description: "Phone number copied" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex justify-between text-xs">
        <span className="text-success">Boarded {boarded}</span>
        <span className="text-primary">Waiting {waiting}</span>
        <span className="text-destructive">Absent {absent}</span>
      </div>
      {pickups.map((student) => {
        const statusColor = student.status === "boarded" ? "text-success" : student.status === "waiting" ? "text-primary" : "text-destructive";
        return (
          <div key={student.id} className="glass-card rounded-lg p-3 border border-border/40">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                {student.avatar ? <img src={student.avatar} alt={student.name} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{student.name.charAt(0)}</div>}
                <div>
                  <p className="text-sm font-medium">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.stop} • <span className={statusColor}>{student.status}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {student.status === "waiting" && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => confirmBoarding(student.id)}>
                      Board
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => markAbsent(student.id)}>
                      Absent
                    </Button>
                  </>
                )}
                {student.phone && (
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => copyPhone(student.phone!)}>
                    📞
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

export default DriverStudentsTab;
