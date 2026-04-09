export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Painel de indicadores do sistema ITER TIC
        </p>
      </div>

      <div
        className="flex h-64 items-center justify-center rounded-xl border
                   border-dashed border-border bg-background-card text-foreground-muted"
      >
        Dashboard em desenvolvimento
      </div>
    </div>
  );
}
