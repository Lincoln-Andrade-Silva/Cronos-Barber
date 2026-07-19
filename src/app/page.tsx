export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-navy-800 bg-navy-900/60 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-500 text-lg font-bold">
            CB
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Cronos Barber</h1>
            <p className="text-sm text-navy-300">Sistema de gestão para barbearia</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-navy-200">
          Fase 0 concluída — projeto Next.js, TailwindCSS e Drizzle conectados ao
          Supabase. As telas do sistema entram nas próximas fases.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy-800 px-3 py-1 text-xs text-navy-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Setup ativo
        </div>
      </div>
    </main>
  );
}
