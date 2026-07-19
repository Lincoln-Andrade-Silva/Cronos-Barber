const FEATURES = [
  "Agendamento online sem conflitos de horário",
  "Painel exclusivo para cada tipo de usuário",
  "Histórico completo de atendimentos",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Hero: visivel apenas em telas grandes */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-panel p-12 lg:flex xl:p-14">
        <div className="pointer-events-none absolute -right-[150px] -top-[150px] h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-[100px] -left-[100px] h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(59,130,246,0.05)_0%,transparent_70%)]" />

        <div className="relative">
          <span className="text-[26px] font-extrabold tracking-tight text-white">
            Cronos Barber
          </span>
        </div>

        <div className="relative">
          <span className="mb-7 inline-block rounded-full border border-brand/25 bg-brand/[0.12] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-light">
            Sistema de Agendamento
          </span>
          <h1 className="mb-4 text-[50px] font-extrabold leading-[1.1] tracking-tight">
            A arte do
            <br />
            corte <span className="text-brand-light">perfeito.</span>
          </h1>
          <p className="max-w-[360px] text-[15px] leading-[1.8] text-muted">
            Gerencie agendamentos com elegância. Para clientes, barbeiros e administradores,
            em um só lugar.
          </p>
        </div>

        <ul className="relative flex flex-col gap-3.5">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-[13px] text-muted">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border border-brand/25 bg-brand/[0.12] text-[10px] text-brand-light">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </aside>

      {/* Card de autenticacao */}
      <main className="flex items-center justify-center bg-bg px-6 py-10 sm:px-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
