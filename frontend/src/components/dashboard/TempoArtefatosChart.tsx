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

interface ArtefatoTempo {
  artefato: string;
  dias: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 shadow-xl">
      <p className="text-xs font-bold text-white">{d.payload.artefato}</p>
      <p className="text-[11px] text-slate-300">
        Tempo médio:{" "}
        <span className="font-semibold text-white">{d.value} dias</span>
      </p>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function TempoArtefatosChart({
  data,
}: {
  data: ArtefatoTempo[];
}) {
  /* Detect the slowest artefact */
  const maxDias = Math.max(...data.map((d) => d.dias));

  const COLOR_DEFAULT = "#93c5fd"; // blue-300
  const COLOR_ALERT = "#f97316";   // orange-500

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        barSize={26}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          unit=" d"
        />
        <YAxis
          type="category"
          dataKey="artefato"
          tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          width={65}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
        />
        <Bar dataKey="dias" radius={[0, 6, 6, 0]} name="Dias">
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.dias === maxDias ? COLOR_ALERT : COLOR_DEFAULT}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
