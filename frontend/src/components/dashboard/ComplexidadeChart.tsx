"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { ProjetosDistribuicaoComplexidade } from "@/types/dashboard";

const COLORS = {
  baixa: "#10b981",  // emerald-500
  media: "#f59e0b",  // amber-500
  alta: "#ef4444",   // red-500
};

const LABELS = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

interface ComplexidadeChartProps {
  data: ProjetosDistribuicaoComplexidade;
}

export function ComplexidadeChart({ data }: ComplexidadeChartProps) {
  const chartData = [
    { name: LABELS.baixa, value: data.baixa, color: COLORS.baixa },
    { name: LABELS.media, value: data.media, color: COLORS.media },
    { name: LABELS.alta, value: data.alta, color: COLORS.alta },
  ].filter((d) => d.value > 0);

  const total = data.baixa + data.media + data.alta;

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-foreground-muted">
        Sem projetos cadastrados
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            borderColor: "#334155",
            borderRadius: 10,
            fontSize: 12,
            color: "#f1f5f9",
          }}
          labelStyle={{ fontWeight: 700, color: "#f1f5f9" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
