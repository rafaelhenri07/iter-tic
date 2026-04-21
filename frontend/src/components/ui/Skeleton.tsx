"use client";

/* ── Skeleton primitivo reutilizável ──────────────────────────────────── */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60 ${className}`}
    />
  );
}

/* ── Skeletons compostos por página ───────────────────────────────────── */

/** Dashboard: 4 KPI cards + 2 chart areas + gargalos */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-background-card p-5 shadow-sm"
          >
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background-card p-5 shadow-sm">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-3 w-32 mb-4" />
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-background-card p-5 shadow-sm">
          <Skeleton className="h-4 w-44 mb-2" />
          <Skeleton className="h-3 w-40 mb-4" />
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </div>
      </div>

      {/* Gargalos */}
      <div className="rounded-xl border border-border bg-background-card p-5 shadow-sm">
        <Skeleton className="h-4 w-36 mb-2" />
        <Skeleton className="h-3 w-64 mb-4" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Meus Projetos: 4 KPI cards + search bar + 5 table rows */
export function ProjetosSkeleton() {
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-background-card px-5 py-4 shadow-sm"
          >
            <Skeleton className="h-3 w-28 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Table header */}
      <div className="rounded-xl border border-border bg-background-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border px-5 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-32 ml-auto" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/50 px-5 py-4"
          >
            <div className="space-y-1.5 w-48">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <div className="flex gap-2 flex-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-16 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** PDTIC: 3 KPI mini-cards + revision bar + 4 action cards */
export function PdticSkeleton() {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm"
          >
            <Skeleton className="h-2.5 w-16 mb-2" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>

      {/* Revision selector */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Filter bar */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Action cards */}
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-background-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-3 w-64" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** PACC: 3 KPI cards + 3 item cards */
export function PaccSkeleton() {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm"
          >
            <Skeleton className="h-2.5 w-20 mb-2" />
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Item cards */}
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-background-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-4 w-52" />
                </div>
                <Skeleton className="h-3 w-36" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Equipe / Contratos: mini KPIs + card list */
export function CardListSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-5">
      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-background-card p-4 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
