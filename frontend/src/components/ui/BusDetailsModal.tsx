import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Users } from "lucide-react";
import { MOCK_STUDENTS, type MapStudent, mockStudents, mockAttendance, getStudentProfile } from "@/utils/data";
import StudentProfileSheet, { type StudentSheetData } from "@/pages/admin/StudentProfileSheet";

interface BusDetailsModalProps {
  bus: any;
  onClose: () => void;
}

// Merge map student with full admin data (matched by name) + attendance
const toSheetData = (mapStudent: MapStudent): StudentSheetData => {
  // Find matching full profile by name
  const full = mockStudents.find(
    (s) => s.name.toLowerCase() === mapStudent.name.toLowerCase()
  );

  // Attendance records for this student
  const attendance = mockAttendance
    .filter((a) => a.studentName === mapStudent.name)
    .map((a) => ({
      id:           a.id,
      date:         a.date,
      busNumber:    a.busNumber,
      boardingTime: a.boardingTime,
      status:       a.status,
    }));

  return {
    id:          mapStudent.id,
    name:        mapStudent.name,
    avatar:      mapStudent.avatar || `https://i.pravatar.cc/150?u=${mapStudent.id}`,
    email:       full?.email,
    phone:       full?.phone,
    grade:       full?.grade,
    stop:        mapStudent.locationName,
    status:      "active",
    attendance,
  };
};

const BusDetailsModal = ({ bus, onClose }: BusDetailsModalProps) => {
  const assignedStudents = MOCK_STUDENTS.filter((s) => s.assignedBusId === bus.id);
  const [selectedStudent, setSelectedStudent] = useState<StudentSheetData | null>(null);

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: bus.colorHex }} />
              {bus.number} — {bus.driverName}
            </DialogTitle>
            <DialogDescription>
              Bus details, assigned students, and live status.
            </DialogDescription>
          </DialogHeader>

          {/* Bus stats */}
          <div className="flex gap-6 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {assignedStudents.length} students
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-4 w-4" /> {bus.speed} km/h
            </span>
          </div>

          {/* Students grid — click to open full profile */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
            {assignedStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(toSheetData(student))}
                className="flex flex-col items-center text-xs bg-secondary/10 p-2 rounded-lg hover:bg-secondary/20 hover:ring-1 hover:ring-primary/30 transition w-full"
              >
                <img
                  src={student.avatar || `https://i.pravatar.cc/40?u=${student.id}`}
                  alt={student.name}
                  className="w-12 h-12 rounded-full mb-1 object-cover"
                />
                <span className="text-center leading-tight">{student.name}</span>
                {student.locationName && (
                  <span className="text-[9px] text-muted-foreground text-center mt-0.5 leading-tight">
                    {student.locationName}
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full student profile — same component as StudentsPage */}
      <StudentProfileSheet
        student={selectedStudent}
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </>
  );
};

export default BusDetailsModal;
