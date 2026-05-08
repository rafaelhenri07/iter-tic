"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ── Cores por status PDTIC ────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  "Não iniciada": "#94a3b8",     // slate-400
  "Em andamento": "#3b82f6",     // blue-500
  "Contratada": "#10b981",       // emerald-500
};

interface StatusChartProps {
  data: Record<string, number>;
}

export default function StatusChart({ data }: StatusChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] ?? "#8b5cf6",
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-foreground-muted">
        Sem dados de status disponíveis
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
        barSize={36}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          interval={0}
          angle={-12}
          textAnchor="end"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            borderColor: "#334155",
            borderRadius: 10,
            fontSize: 12,
            color: "#f1f5f9",
          }}
          labelStyle={{ fontWeight: 700, color: "#f1f5f9" }}
          cursor={{ fill: "rgba(139, 92, 246, 0.08)" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Ações">
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
