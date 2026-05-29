import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { mockAttendance } from "@/utils/data";
import { motion } from "framer-motion";
import {
  Users, Plus, MoreVertical, Edit, Trash2,
  History, Bus, MapPin, GraduationCap, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AdminStudent, mockAdminStudents } from "@/utils/data";
import {
  deleteDashboardStudent,
  fetchDashboardStudents,
  type ApiStudentRow,
} from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StudentForm } from "@/components/forms/StudentForm";
import { toast } from "sonner";
import StudentProfileSheet, { type StudentSheetData } from "@/pages/admin/StudentProfileSheet";


function mapApiStudent(s: ApiStudentRow): AdminStudent {
  return {
    id: String(s.id),
    name: s.full_name,
    grade: `Year ${s.academic_year} · ${s.faculty || ""}`.trim(),
    bus: s.assigned_bus || "—",
    stop: s.department || "—",
    status: s.is_active ? "active" : "inactive",
    email: s.email,
    phone: s.phone || "",
    avatar: s.profile_picture,
    parentPhone: undefined,
    route: undefined,
    pickupPoint: undefined,
  };
}

// Map AdminStudent → StudentSheetData (adds attendance)
const toSheetData = (s: AdminStudent): StudentSheetData => ({
  id:          s.id,
  name:        s.name,
  avatar:      s.avatar || undefined,
  email:       s.email,
  phone:       s.phone,
  parentPhone: s.parentPhone,
  grade:       s.grade,
  bus:         s.bus,
  stop:        s.stop,
  status:      s.status,
  attendance:  mockAttendance
    .filter((a) => a.studentName === s.name)
    .map((a) => ({ id: a.id, date: a.date, busNumber: a.busNumber, boardingTime: a.boardingTime, status: a.status })),
});

interface Props { asTab?: boolean }

const StudentsPage = ({ asTab }: Props) => {
  const [isAddOpen, setIsAddOpen]               = useState(false);
  const [editingStudent, setEditingStudent]     = useState<AdminStudent | null>(null);
  const [viewingStudent, setViewingStudent]     = useState<StudentSheetData | null>(null);
  const [attendanceStudent, setAttendanceStudent] = useState<AdminStudent | null>(null);

  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const reload = async () => {
    setListLoading(true);
    try {
      const rows = await fetchDashboardStudents();
      setStudents(rows.map(mapApiStudent));
    } catch {
      setStudents(mockAdminStudents);
      toast.message("Using demo students — log in as admin and ensure Django is on :8000.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDashboardStudent(Number(id));
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success("Student removed");
    } catch {
      toast.error("Could not delete (admin only / check API).");
    }
  };

  const columns: ColumnDef<AdminStudent>[] = [
    {
      accessorKey: "name",
      header: "Student",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {row.original.avatar && <AvatarImage src={row.original.avatar} />}
            <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-sm">
              {row.original.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{row.original.name}</span>
            <span className="text-[10px] text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original.grade}
        </div>
      ),
    },
    {
      accessorKey: "bus",
      header: "Bus & Stop",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Bus className="h-3 w-3 text-muted-foreground" /> {row.original.bus}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {row.original.stop}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "outline"} className="capitalize text-[10px] h-5">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewingStudent(toSheetData(row.original))}>
                <Eye className="h-4 w-4 mr-2" /> View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingStudent(row.original)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAttendanceStudent(row.original)}>
                <History className="h-4 w-4 mr-2" /> Attendance
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const inner = (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Students
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void reload()} disabled={listLoading}>
              Refresh
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add (local)
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          List loads from <span className="font-mono">GET /api/dashboard/students/</span>. Persist new students via Django admin or register API.
        </p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl border border-border/50 p-4">
          {listLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading students…</p>
          ) : (
            <DataTable columns={columns} data={students} searchKey="name" searchPlaceholder="Search students..." />
          )}
        </motion.div>
      </div>

      {/* ── Add Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
          <StudentForm
            onSubmit={(data) => {
              setStudents([{ ...data, id: `s${Date.now()}`, bus: data.route, stop: data.pickupPoint } as AdminStudent, ...students]);
              setIsAddOpen(false);
              toast.success("Student added locally (use API to persist).");
            }}
            onCancel={() => setIsAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingStudent} onOpenChange={(o) => !o && setEditingStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          {editingStudent && (
            <StudentForm
              initialData={editingStudent}
              onSubmit={(data) => {
                setStudents(students.map(s => s.id === editingStudent.id ? { ...s, ...data, bus: data.route, stop: data.pickupPoint } : s));
                setEditingStudent(null);
                toast.success("Updated");
              }}
              onCancel={() => setEditingStudent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Profile Sheet (reusable component) ── */}
      <StudentProfileSheet
        student={viewingStudent}
        open={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        onEdit={(s) => {
          const original = students.find(st => st.id === s.id);
          if (original) { setEditingStudent(original); setViewingStudent(null); }
        }}
      />

      {/* ── Attendance Sheet ── */}
      <Sheet open={!!attendanceStudent} onOpenChange={(o) => !o && setAttendanceStudent(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Attendance — {attendanceStudent?.name}</SheetTitle>
          </SheetHeader>
          {attendanceStudent && (() => {
            const records = mockAttendance.filter(a => a.studentName === attendanceStudent.name);
            return (
              <div className="mt-6 space-y-3">
                {records.length > 0 ? records.map((r) => (
                  <div key={r.id} className="flex justify-between items-center bg-secondary/20 rounded-xl px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{r.date}</p>
                      <p className="text-xs text-muted-foreground">{r.busNumber} · {r.boardingTime !== "-" ? r.boardingTime : "Not boarded"}</p>
                    </div>
                    <Badge variant="outline" className={`capitalize text-xs ${
                      r.status === "present" ? "text-green-500 border-green-500/30 bg-green-500/10"    :
                      r.status === "late"    ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" :
                                               "text-red-500 border-red-500/30 bg-red-500/10"
                    }`}>{r.status}</Badge>
                  </div>
                )) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No attendance records found
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );

  if (asTab) return inner;
  return <AppLayout title="Student Directory">{inner}</AppLayout>;
};

export default StudentsPage;
