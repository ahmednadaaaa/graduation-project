import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { MapPin, Plus, MoreVertical, Bus, Edit, Trash2, Map as MapIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AdminRoute, mockAdminRoutes } from "@/utils/data";
import {
  fetchBusRoutes,
  createBusRoute,
  updateBusRoute,
  deleteBusRoute,
  type ApiRouteRow,
} from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RouteForm } from "@/components/forms/RouteForm";
import { toast } from "sonner";


interface Props { asTab?: boolean }

function mapApiRoute(r: ApiRouteRow): AdminRoute {
  return {
    id: String(r.id),
    name: r.name,
    assignedBus: r.buses_count ? `${r.buses_count} bus(es)` : "—",
    stops: (r.stops ?? []).map((s) => s.name),
    status: r.is_active ? "active" : "inactive",
  };
}

const RoutesPage = ({ asTab }: Props) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<AdminRoute | null>(null);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const rows = await fetchBusRoutes();
      setRoutes(rows.map(mapApiRoute));
    } catch {
      setRoutes(mockAdminRoutes);
      toast.message("Using demo routes — log in and ensure Django is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteBusRoute(Number(id));
      setRoutes(routes.filter((r) => r.id !== id));
      toast.success("Route deleted");
    } catch {
      toast.error("Could not delete route");
    }
  };

  const handleCreate = async (data: any) => {
    try {
      const stopsWithOrder = (data.stops || []).map((s: any, idx: number) => ({
        ...s,
        order: idx + 1
      }));
      const newRoute = await createBusRoute({ ...data, stops: stopsWithOrder });
      setRoutes([mapApiRoute(newRoute), ...routes]);
      setIsAddOpen(false);
      toast.success("Route created successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create route");
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingRoute) return;
    try {
      const stopsWithOrder = (data.stops || []).map((s: any, idx: number) => ({
        ...s,
        order: idx + 1
      }));
      const updated = await updateBusRoute(Number(editingRoute.id), { ...data, stops: stopsWithOrder });
      setRoutes(routes.map(r => r.id === editingRoute.id ? mapApiRoute(updated) : r));
      setEditingRoute(null);
      toast.success("Route updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update route");
    }
  };

  const columns: ColumnDef<AdminRoute>[] = [
    { accessorKey: "name", header: "Route Name", cell: ({ row }) => <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><MapIcon className="h-5 w-5" /></div><span className="font-bold">{row.original.name}</span></div> },
    { accessorKey: "assignedBus", header: "Bus", cell: ({ row }) => <div className="flex items-center gap-1.5 text-sm"><Bus className="h-3.5 w-3.5 text-muted-foreground" /><Badge variant="secondary">{row.original.assignedBus}</Badge></div> },
    { accessorKey: "stops", header: "Stops", cell: ({ row }) => <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-hidden max-w-[300px]">{row.original.stops.map((stop, i) => <React.Fragment key={i}><span className="whitespace-nowrap">{stop}</span>{i < row.original.stops.length - 1 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}</React.Fragment>)}</div> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "active" ? "default" : "outline"} className="capitalize text-[10px]">{row.original.status}</Badge> },
    { id: "actions", header: () => <div className="text-right">Actions</div>, cell: ({ row }) => (
      <div className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setEditingRoute(row.original)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem><DropdownMenuItem><MapPin className="h-4 w-4 mr-2" /> View on Map</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    )},
  ];

  const inner = (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-2xl font-bold flex items-center gap-2"><MapIcon className="h-6 w-6 text-primary" />Routes</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => void reload()} disabled={loading}>Refresh</Button>
            <Button onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Route</Button>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl border border-border/50 p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading routes…</p>
          ) : (
            <DataTable columns={columns} data={routes} searchKey="name" searchPlaceholder="Search routes..." />
          )}
        </motion.div>
      </div>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Route</DialogTitle></DialogHeader>
          <RouteForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingRoute} onOpenChange={(o) => !o && setEditingRoute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Route</DialogTitle></DialogHeader>
          {editingRoute && (
            <RouteForm
              initialData={editingRoute}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRoute(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
  if (asTab) return inner;
  return <AppLayout title="Route Management">{inner}</AppLayout>;
};

export default RoutesPage;
