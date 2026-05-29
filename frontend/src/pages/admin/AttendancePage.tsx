import AppLayout from "@/components/layout/AppLayout";
import AttendanceTable from "@/components/dashboard/AttendanceTable";
import { mockAttendance } from "@/utils/data";
import { motion } from "framer-motion";
import { Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props { asTab?: boolean }

const AttendanceContent = () => (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search students or bus numbers..." className="pl-10" />
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <Button variant="outline" size="sm" className="flex-1 md:flex-none"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
        <Button variant="outline" size="sm" className="flex-1 md:flex-none"><Download className="h-4 w-4 mr-2" /> Export</Button>
      </div>
    </div>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
      <AttendanceTable records={mockAttendance} />
    </motion.div>
  </div>
);

const AttendancePage = ({ asTab }: Props) => {
  if (asTab) return <AttendanceContent />;
  return (
    <AppLayout title="Attendance Records">
      <AttendanceContent />
    </AppLayout>
  );
};

export default AttendancePage;
