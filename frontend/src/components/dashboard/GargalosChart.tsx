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
import type { GargaloArtefato } from "@/types/dashboard";

/* ── Cores por tipo de artefato ────────────────────────────────────────── */

const TIPO_COLORS: Record<string, string> = {
  DFD: "#3b82f6",                              // blue-500
  ETP: "#6366f1",                              // indigo-500
  "Mapa de Riscos": "#ef4444",                 // red-500
  "Estimativa de Custos e Orçamento": "#10b981", // emerald-500
  TR: "#8b5cf6",                               // violet-500
};

interface GargalosChartProps {
  data: GargaloArtefato[];
}

export default function GargalosChart({ data }: GargalosChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 text-sm text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
        ✅ Nenhum gargalo detectado — todos os artefatos iniciados foram concluídos!
      </div>
    );
  }

  const chartData = data.map((g) => ({
    ...g,
    color: TIPO_COLORS[g.tipo] ?? "#94a3b8",
    // Agora um label curto para caber no eixo Y
    label:
      g.tipo === "Estimativa de Custos e Orçamento"
        ? "Est. Custos"
        : g.tipo,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
        barSize={24}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={90}
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
          cursor={{ fill: "rgba(239, 68, 68, 0.06)" }}
          formatter={(value: number) => [`${value} artefato(s)`, "Em andamento"]}
        />
        <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} name="Em andamento">
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
