"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TipoData {
  name: string;
  value: number;
  color: string;
}

interface SituacaoData {
  label: string;
  qtd: number;
  color: string;
}

interface DistribuicaoData {
  porTipo: TipoData[];
  porSituacao: SituacaoData[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 shadow-xl">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: d.payload.color }}
        />
        <span className="font-semibold text-white">{d.name}</span>
        <span className="text-slate-300">
          — {d.value} contrato{d.value !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const RADIAN = Math.PI / 180;
/* eslint-disable @typescript-eslint/no-explicit-any */
function renderLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.08) return null;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DistribuicaoContratosChart({
  data,
}: {
  data: DistribuicaoData;
}) {
  const totalTipo = data.porTipo.reduce((s, d) => s + d.value, 0);
  const totalSituacao = data.porSituacao.reduce((s, d) => s + d.qtd, 0);

  /* Adapter: porSituacao → same shape as porTipo for the Pie */
  const situacaoPieData = data.porSituacao.map((s) => ({
    name: s.label,
    value: s.qtd,
    color: s.color,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {/* ── Donut 1: Por Tipo ────────────────────────────────────────── */}
      <div className="flex flex-col items-center">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Por Tipo
        </p>
        <div className="relative w-[180px] h-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.porTipo}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={82}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderLabel}
                stroke="none"
              >
                {data.porTipo.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalTipo}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">
              contratos
            </span>
          </div>
        </div>

        {/* Legend: tipo */}
        <div className="mt-3 space-y-1.5 w-full max-w-[200px]">
          {data.porTipo.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {t.name}
              </span>
              <span className="ml-auto font-bold text-slate-900 dark:text-white tabular-nums">
                {t.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Donut 2: Por Situação ────────────────────────────────────── */}
      <div className="flex flex-col items-center">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Por Situação
        </p>
        <div className="relative w-[180px] h-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={situacaoPieData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={82}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderLabel}
                stroke="none"
              >
                {situacaoPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalSituacao}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">
              contratos
            </span>
          </div>
        </div>

        {/* Legend: situação */}
        <div className="mt-3 space-y-1.5 w-full max-w-[200px]">
          {data.porSituacao.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {s.label}
              </span>
              <span className="ml-auto font-bold text-slate-900 dark:text-white tabular-nums">
                {s.qtd}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
