// ─── StudentProfileSheet ──────────────────────────────────────────────────────
// Reusable student profile side-sheet.
// Accepts either a full `Student` (admin table) or a `MockStudent` (map/modal).
// Both shapes are unified via the `StudentSheetData` interface below.

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Phone, Mail, Bus, MapPin, GraduationCap, History } from "lucide-react";

export interface StudentSheetData {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  parentPhone?: string;
  grade?: string;
  bus?: string;
  stop?: string;
  status?: "active" | "inactive";
  attendance?: {
    id: string;
    date: string;
    busNumber: string;
    boardingTime: string;
    status: "present" | "absent" | "late";
  }[];
}

interface Props {
  student: StudentSheetData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (student: StudentSheetData) => void;
}

const StudentProfileSheet = ({ student, open, onClose, onEdit }: Props) => (
  <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
    <SheetContent className="sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Student Profile</SheetTitle>
        <SheetDescription>
          View student details, contact info, and attendance history.
        </SheetDescription>
      </SheetHeader>

      {student && (
        <div className="mt-8 space-y-6">
          {/* ── Avatar + name ── */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage src={student.avatar || `https://i.pravatar.cc/150?u=${student.id}`} />
              <AvatarFallback className="text-3xl gradient-primary text-primary-foreground font-bold">
                {student.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-bold">{student.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-xs">ID: {student.id}</Badge>
                {student.status && (
                  <Badge
                    variant={student.status === "active" ? "default" : "secondary"}
                    className="capitalize text-xs"
                  >
                    {student.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ── Info card ── */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3.5">
            {student.email && (
              <Row icon={<Mail className="h-4 w-4" />} label="Email">
                <span className="font-medium text-sm truncate max-w-[190px]">{student.email}</span>
              </Row>
            )}
            {student.phone && (
              <Row icon={<Phone className="h-4 w-4" />} label="Phone">
                <span className="font-medium">{student.phone}</span>
              </Row>
            )}
            {student.parentPhone && (
              <Row icon={<Phone className="h-4 w-4" />} label="Parent">
                <span className="font-medium">{student.parentPhone}</span>
              </Row>
            )}
            {student.grade && (
              <Row icon={<GraduationCap className="h-4 w-4" />} label="Grade">
                <span className="font-medium">{student.grade}</span>
              </Row>
            )}
            {student.bus && (
              <Row icon={<Bus className="h-4 w-4" />} label="Bus">
                <Badge variant="secondary" className="font-mono">{student.bus}</Badge>
              </Row>
            )}
            {student.stop && (
              <Row icon={<MapPin className="h-4 w-4" />} label="Stop">
                <span className="font-medium text-xs text-right max-w-[190px]">{student.stop}</span>
              </Row>
            )}
          </div>

          {/* ── Attendance ── */}
          {student.attendance && student.attendance.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Recent Attendance
              </h4>
              <div className="space-y-2">
                {student.attendance.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center text-xs bg-secondary/20 rounded-lg px-3 py-2"
                  >
                    <span className="text-muted-foreground">{r.date}</span>
                    <span className="text-muted-foreground">{r.busNumber}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        r.status === "present" ? "text-green-500 border-green-500/30 bg-green-500/10"  :
                        r.status === "late"    ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" :
                                                 "text-red-500 border-red-500/30 bg-red-500/10"
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Edit button ── */}
          {onEdit && (
            <Button className="w-full" onClick={() => onEdit(student)}>
              <Edit className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          )}
        </div>
      )}
    </SheetContent>
  </Sheet>
);

// ── tiny layout helper ────────────────────────────────────────────────────────
const Row = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground flex items-center gap-2">
      {icon} {label}
    </span>
    {children}
  </div>
);

export default StudentProfileSheet;
