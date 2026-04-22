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

interface EquipeData {
  nome: string;
  planejamento: number;
  fiscalizacao: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + p.value, 0);
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 shadow-xl">
      <p className="mb-1.5 text-xs font-bold text-white">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-semibold text-white">
            {p.value} projeto{p.value !== 1 ? "s" : ""}
          </span>
        </div>
      ))}
      <div className="mt-1.5 border-t border-slate-600/60 pt-1.5 text-[11px] text-slate-400">
        Total: <span className="font-semibold text-white">{total}</span>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function CargaEquipeChart({
  data,
}: {
  data: EquipeData[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        barSize={30}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          vertical={false}
        />
        <XAxis
          dataKey="nome"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
        />
        <Bar
          dataKey="planejamento"
          name="Fase interna"
          stackId="a"
          fill="#93c5fd"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="fiscalizacao"
          name="Gestão de Contratos"
          stackId="a"
          fill="#3730a3"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
