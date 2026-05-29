import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AttendanceRecord } from "@/utils/data";
import type { ApiAttendanceLog } from "@/lib/apiClient";

interface AttendanceTableProps {
  records: (AttendanceRecord | ApiAttendanceLog)[];
}

const statusVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  present: "default",
  absent: "destructive",
  late: "secondary",
  recognized: "default",
  unrecognized: "destructive",
};

const AttendanceTable = ({ records }: AttendanceTableProps) => {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold">Recent Attendance Logs</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Bus</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Action / Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
             <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
          ) : (
            records.map((record) => {
              const name = "studentName" in record ? record.studentName : record.student_name;
              const bus  = "busNumber" in record ? record.busNumber : record.bus_number;
              const time = "boardingTime" in record ? record.boardingTime : (record.boarding_time || new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
              const status = record.status;
              const action = "action" in record ? record.action : "";

              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {name}
                    {!("studentName" in record) && record.university_id && (
                      <span className="block text-[10px] text-muted-foreground">{record.university_id}</span>
                    )}
                  </TableCell>
                  <TableCell>{bus}</TableCell>
                  <TableCell>{time}</TableCell>
                  <TableCell className="space-x-2">
                    {action && (
                       <Badge variant="outline" className="capitalize text-[10px]">{action}</Badge>
                    )}
                    <Badge variant={statusVariant[status] || "outline"} className="capitalize">
                      {status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AttendanceTable;
