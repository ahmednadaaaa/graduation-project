import { motion } from "framer-motion";
import { CheckCircle, Clock, Users, MapPin, Navigation, Wifi, ShieldCheck, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockRouteStops } from "@/utils/data";

interface Props {
  tripStatus: string;
  seconds: number;
  boarded: number;
  waiting: number;
  absent: number;
  startTrip: () => void;
  endTrip: () => void;
}

const DriverHomeTab = ({ tripStatus, seconds, boarded, waiting, absent, startTrip, endTrip }: Props) => {
  const currentStop = mockRouteStops.find((s) => s.status === "current");
  const nextStop = mockRouteStops.find((s, i) => i > mockRouteStops.findIndex((st) => st.status === "current"));

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const totalStops = mockRouteStops.length;
  const completedStops = mockRouteStops.filter((s) => s.status === "completed").length;
  const progressPercentage = (completedStops / totalStops) * 100;
  const totalStudents = mockRouteStops.reduce((sum, s) => sum + s.studentsCount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-8">
      {/* System Status Banner */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Live</span>
        </div>
        <div className="flex items-center gap-3">
          <Wifi className="h-3 w-3 text-success" />
          <ShieldCheck className="h-3 w-3 text-primary" />
        </div>
      </div>

      {/* Main Trip Card - Premium Design */}
      {/* Main Trip Card - Glass Style Same Height */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="
    relative overflow-hidden rounded-[2.5rem]
    bg-gradient-to-br from-primary/15 via-background to-background
    backdrop-blur-xl
    p-8 shadow-2xl border border-border/40
  "
      >
        {/* ✨ Inner Glass Glow */}
        <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-transparent" />

        {/* Background Icon */}
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity className="h-24 w-24 text-primary" />
        </div>

        {/* Top Section */}
        <div className="relative z-10 flex justify-between items-start mb-8">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-black opacity-50 tracking-[0.2em]">Active Session</p>
            <h2 className="text-3xl font-black tracking-tight">{formatTime(seconds)}</h2>
          </div>

          <Badge className="bg-primary/10 text-primary border border-primary/30 px-4 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider">On Route</Badge>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] opacity-50 font-bold flex items-center gap-1">
              <Users className="h-3 w-3" /> Boarded
            </p>
            <p className="text-xl font-black">{boarded}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] opacity-50 font-bold flex items-center gap-1">
              <Clock className="h-3 w-3" /> Waiting
            </p>
            <p className="text-xl font-black">{waiting}</p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-[10px] opacity-50 font-bold flex items-center gap-1 justify-end">
              <Activity className="h-3 w-3" /> Absent
            </p>
            <p className="text-xl font-black text-destructive/80">{absent}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="relative z-10 mt-8">
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.6 }} className="h-full bg-primary" />
          </div>

          <div className="flex justify-between mt-3">
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Trip Progress</p>
            <p className="text-[10px] font-black">{Math.round(progressPercentage)}%</p>
          </div>
        </div>

        {/* Trip Controls */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-4">
          {tripStatus !== "running" ? (
            <button 
              onClick={startTrip} 
              className="col-span-2 w-full py-4 rounded-xl bg-primary text-primary-foreground font-black tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              🚌 بدء الرحلة
            </button>
          ) : (
            <button 
              onClick={endTrip} 
              className="col-span-2 w-full py-4 rounded-xl bg-destructive text-destructive-foreground font-black tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              🛑 إنهاء الرحلة
            </button>
          )}
        </div>
      </motion.div>

      {/* Current & Next Stop Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-[2rem] p-6 border border-border/50 bg-primary/5">
          <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-2">Current Pickup</p>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm truncate">{currentStop?.name || "End of Route"}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">Arrived at {currentStop?.eta}</p>
        </div>
        <div className="glass-card rounded-[2rem] p-6 border border-border/50">
          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Next Pickup</p>
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-bold text-sm truncate">{nextStop?.name || "School"}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">Est. {nextStop?.eta || "--:--"}</p>
        </div>
      </div>

      {/* Pickup Timeline - Premium UI */}
      <div className="glass-card rounded-[2.5rem] p-8 space-y-6 border border-border/50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest">Pickup Timeline</h2>
          <Badge variant="secondary" className="rounded-full text-[9px] font-bold">
            {totalStops} Pickup Points
          </Badge>
        </div>

        <div className="space-y-0 relative">
          {/* Timeline Line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-secondary" />

          {mockRouteStops.map((stop, index) => (
            <div key={stop.id} className="flex gap-6 relative group pb-8 last:pb-0">
              <div className="flex flex-col items-center relative z-10">
                <div className={`h-[22px] w-[22px] rounded-full border-4 transition-all duration-500 flex items-center justify-center ${stop.status === "completed" ? "bg-success border-success/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : stop.status === "current" ? "bg-background border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-background border-secondary"}`}>
                  {stop.status === "completed" ? <CheckCircle className="h-3 w-3 text-white" /> : stop.status === "current" ? <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> : null}
                </div>
              </div>
              <div className="flex-1 -mt-0.5">
                <div className="flex justify-between items-center">
                  <span className={`text-sm transition-all ${stop.status === "current" ? "font-black text-foreground scale-105 origin-left" : stop.status === "completed" ? "font-bold text-muted-foreground line-through opacity-60" : "font-bold text-muted-foreground"}`}>{stop.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground/50">{stop.eta}</span>
                    {stop.status === "current" && <Badge className="bg-primary/10 text-primary border-none text-[8px] h-4 font-black">NOW</Badge>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Automation Notice */}
      <div className="px-6 py-4 bg-secondary/20 rounded-2xl border border-dashed border-border/50 flex gap-4 items-center">
        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shrink-0 border border-border/50">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black uppercase tracking-widest">Automation Active</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">Location and status are being synced automatically with the backend server.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default DriverHomeTab;
