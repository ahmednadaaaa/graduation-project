import AppLayout from "@/components/layout/AppLayout";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import { motion } from "framer-motion";
import { Calendar, Download, Filter, Bus, Users, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import KPICard from "@/components/dashboard/KPICard";

interface Props { asTab?: boolean }

const AnalyticsContent = () => (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Feb 1, 2026 - Feb 22, 2026</span>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <Button variant="outline" size="sm" className="flex-1 md:flex-none"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
        <Button variant="outline" size="sm" className="flex-1 md:flex-none"><Download className="h-4 w-4 mr-2" /> Export PDF</Button>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard title="Avg. Occupancy"   value="82%"      icon={Users}         variant="primary"     trend="+5% from last month" />
      <KPICard title="On-Time Rate"     value="94.2%"    icon={Clock}         variant="success"     trend="+1.2% improvement" />
      <KPICard title="Fuel Efficiency"  value="12.5 km/L" icon={Bus}          variant="warning"     trend="Stable" />
      <KPICard title="Safety Incidents" value="0"        icon={AlertTriangle} variant="destructive" trend="No incidents" />
    </div>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-6">Performance Trends</h2>
      <AnalyticsCharts />
    </motion.div>
  </div>
);

const AnalyticsPage = ({ asTab }: Props) => {
  if (asTab) return <AnalyticsContent />;
  return (
    <AppLayout title="Analytics & Reports">
      <AnalyticsContent />
    </AppLayout>
  );
};

export default AnalyticsPage;
