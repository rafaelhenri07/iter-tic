"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EfetividadeData {
  acao: string;
  estimativa: number;
  efetivo: number;
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 shadow-xl">
      <p className="mb-1.5 text-xs font-bold text-white">Ação {label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-semibold text-white">
            {formatCurrencyShort(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function EfetividadeFinanceiraChart({
  data,
}: {
  data: EfetividadeData[];
}) {
  return (
    <ResponsiveContainer width="100%" height={310}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        barGap={4}
        barSize={22}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          vertical={false}
        />
        <XAxis
          dataKey="acao"
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrencyShort(v)}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.06)" }} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
        />
        <Bar
          dataKey="estimativa"
          name="Estimativa Inicial"
          fill="#cbd5e1"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="efetivo"
          name="Custo Efetivo"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
