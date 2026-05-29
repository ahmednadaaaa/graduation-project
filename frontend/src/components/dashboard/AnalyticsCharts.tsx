import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const weeklyData = [
  { day: "Mon", onTime: 42, late: 3, absent: 2 },
  { day: "Tue", onTime: 45, late: 1, absent: 1 },
  { day: "Wed", onTime: 40, late: 5, absent: 2 },
  { day: "Thu", onTime: 44, late: 2, absent: 1 },
  { day: "Fri", onTime: 38, late: 4, absent: 5 },
];

const etaData = [
  { time: "7:00", actual: 0, predicted: 0 },
  { time: "7:15", actual: 5, predicted: 4 },
  { time: "7:30", actual: 12, predicted: 10 },
  { time: "7:45", actual: 18, predicted: 17 },
  { time: "8:00", actual: 20, predicted: 20 },
];

const statusData = [
  { name: "On Time", value: 38, color: "hsl(199, 89%, 48%)" },
  { name: "Late", value: 5, color: "hsl(38, 92%, 50%)" },
  { name: "Absent", value: 4, color: "hsl(0, 72%, 51%)" },
];

const AnalyticsCharts = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="glass-card rounded-xl p-4 lg:col-span-2">
        <h3 className="font-semibold mb-4 text-sm">Weekly Attendance</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
            <Bar dataKey="onTime" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="late" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card rounded-xl p-4">
        <h3 className="font-semibold mb-4 text-sm">Today's Status</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
              {statusData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          {statusData.map((item) => (
            <div key={item.name} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
