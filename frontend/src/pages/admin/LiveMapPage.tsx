import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Search, AlertCircle, ChevronRight, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_BUSES, MOCK_STUDENTS } from "@/utils/data";
import BusDetailsModal from "@/components/ui/BusDetailsModal";
import AdminMap from "@/components/map/AdminMap";
import AppLayout from "@/components/layout/AppLayout";

interface Props { asTab?: boolean }

const LiveMapContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedBus, setSelectedBus]     = useState<any>(null);

  const filteredBuses = MOCK_BUSES.filter(
    (bus) =>
      bus.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.driverName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-120px)] w-full rounded-xl overflow-hidden border border-border/50 bg-background relative">
      {/* Map */}
      <div className="flex-1 relative">
        <AdminMap fullScreen />
        {!isSidebarOpen && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 z-10 shadow-lg"
            onClick={() => setIsSidebarOpen(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 border-l border-border/50 bg-background flex flex-col"
          >
            <div className="p-4 border-b border-border/50 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Bus className="h-4 w-4 text-primary" /> Live Buses
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search buses or drivers..."
                  className="pl-7 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredBuses.length > 0 ? (
                filteredBuses.map((bus) => {
                  const assignedStudents = MOCK_STUDENTS.filter((s) => s.assignedBusId === bus.id);
                  return (
                    <div
                      key={bus.id}
                      className="p-3 rounded-xl border bg-secondary/10 hover:bg-secondary/20 transition cursor-pointer"
                      style={{ borderColor: bus.colorHex + "55", borderLeftWidth: 3, borderLeftColor: bus.colorHex }}
                      onClick={() => setSelectedBus(bus)}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: bus.colorHex }} />
                            <p className="text-sm font-bold">{bus.number}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{bus.driverName}</p>
                        </div>
                        <Badge className="text-xs text-white border-none" style={{ background: bus.colorHex }}>
                          Active
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{assignedStudents.length} students</span>
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{bus.speed} km/h</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-20" />
                  No buses found
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border/50 text-xs space-y-1">
              <div className="flex justify-between"><span>Total Buses</span><span className="font-bold">{MOCK_BUSES.length}</span></div>
              <div className="flex justify-between"><span>Total Students</span><span className="font-bold">{MOCK_STUDENTS.length}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedBus && <BusDetailsModal bus={selectedBus} onClose={() => setSelectedBus(null)} />}
    </div>
  );
};

const LiveMapPage = ({ asTab }: Props) => {
  if (asTab) return <LiveMapContent />;
  return (
    <AppLayout title="Live Tracking Map">
      <LiveMapContent />
    </AppLayout>
  );
};

export default LiveMapPage;
