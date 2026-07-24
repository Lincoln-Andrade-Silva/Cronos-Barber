import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Clock, CreditCard, History, MapPin, Receipt } from "lucide-react";
import { Card } from "@/components/ui";
import { CreditoDev } from "@/components/credito-dev";
import { getCurrentProfile } from "@/lib/auth";
import { getEstabelecimentoInfo } from "@/lib/estabelecimento";
import { DIAS_SEMANA, normalizarHorario } from "@/features/estabelecimento/horario";
import { LogoutButton } from "@/features/auth/logout-button";
import type { EstabelecimentoInfo } from "@/db/schema";

export const dynamic = "force-dynamic";

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.46-9.44 2.53 0 4.9.99 6.68 2.78a9.38 9.38 0 0 1 2.76 6.67c0 5.2-4.24 9.45-9.46 9.45zm8.05-17.5A11.28 11.28 0 0 0 12.05.5C5.8.5.72 5.58.72 11.82c0 2 .52 3.95 1.52 5.67L.62 23.5l6.15-1.62a11.3 11.3 0 0 0 5.28 1.35h.01c6.24 0 11.32-5.08 11.32-11.32 0-3.03-1.18-5.87-3.32-8.01z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H17V4.6c-.3-.04-1.3-.13-2.45-.13-2.42 0-4.08 1.48-4.08 4.2v2.34H7.66V14h2.81v8h3.03z" />
    </svg>
  );
}

function formatEndereco(info: EstabelecimentoInfo): string | null {
  const linha1 = [info.enderecoRua, info.enderecoNumero].filter(Boolean).join(", ");
  const linha2 = [info.enderecoBairro, info.enderecoCidade].filter(Boolean).join(" - ");
  return [linha1, linha2].filter(Boolean).join(" - ") || null;
}

export default async function ClientHome() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const info = await getEstabelecimentoInfo();
  const nome = info?.nome?.trim() || "Chronoss";
  const endereco = info ? formatEndereco(info) : null;
  const horario = normalizarHorario(info?.horario);
  const whatsappDigits = info?.whatsapp?.replace(/\D/g, "");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {info?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logoUrl}
              alt={nome}
              className="h-11 w-11 rounded-full border border-line object-cover"
            />
          )}
          <div className="leading-tight">
            <p className="font-display text-lg font-extrabold tracking-tight text-ink">{nome}</p>
            <p className="text-xs text-muted">Olá, {profile.nome}</p>
          </div>
        </div>
        <LogoutButton fullWidth={false} />
      </header>

      {/* Atalhos */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/agendar"
          className="flex flex-col items-start gap-2 rounded-xl border border-line bg-panel p-4 transition hover:border-brand/40 hover:bg-surface"
        >
          <CalendarPlus className="h-5 w-5 text-brand-light" />
          <p className="text-sm font-semibold">Agendar horário</p>
          <span className="text-xs text-muted">Escolha serviço, profissional e horário</span>
        </Link>
        <Link
          href="/meus-agendamentos"
          className="flex flex-col items-start gap-2 rounded-xl border border-line bg-panel p-4 transition hover:border-brand/40 hover:bg-surface"
        >
          <History className="h-5 w-5 text-brand-light" />
          <p className="text-sm font-semibold">Meus agendamentos</p>
          <span className="text-xs text-muted">Veja e gerencie seus horários</span>
        </Link>
        <Link
          href="/planos"
          className="flex flex-col items-start gap-2 rounded-xl border border-line bg-panel p-4 transition hover:border-brand/40 hover:bg-surface"
        >
          <CreditCard className="h-5 w-5 text-brand-light" />
          <p className="text-sm font-semibold">Planos</p>
          <span className="text-xs text-muted">Assine e economize</span>
        </Link>
        <Link
          href="/minhas-assinaturas"
          className="flex flex-col items-start gap-2 rounded-xl border border-line bg-panel p-4 transition hover:border-brand/40 hover:bg-surface"
        >
          <Receipt className="h-5 w-5 text-brand-light" />
          <p className="text-sm font-semibold">Minhas assinaturas</p>
          <span className="text-xs text-muted">Status e cobranças</span>
        </Link>
      </div>

      {/* Info do estabelecimento */}
      <Card className="space-y-5">
        {endereco && (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
            <div>
              <p className="text-sm font-medium">Endereço</p>
              <p className="text-sm text-muted">{endereco}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
          <div className="flex-1">
            <p className="mb-1 text-sm font-medium">Horário de atendimento</p>
            <ul className="space-y-0.5 text-sm text-muted">
              {DIAS_SEMANA.map(({ dia, label }) => {
                const item = horario.find((h) => h.dia === dia);
                if (!item) return null;
                return (
                  <li key={dia} className="flex justify-between gap-4">
                    <span>{label}</span>
                    <span>{item.aberto ? `${item.abre} às ${item.fecha}` : "Fechado"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {(whatsappDigits || info?.instagramLink || info?.facebookLink) && (
          <div className="flex flex-wrap justify-center gap-2 border-t border-line pt-4">
            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition hover:bg-surface2"
              >
                <WhatsappIcon className="h-4 w-4 text-brand-light" />
                WhatsApp
              </a>
            )}
            {info?.instagramLink && (
              <a
                href={info.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition hover:bg-surface2"
              >
                <InstagramIcon className="h-4 w-4 text-brand-light" />
                Instagram
              </a>
            )}
            {info?.facebookLink && (
              <a
                href={info.facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition hover:bg-surface2"
              >
                <FacebookIcon className="h-4 w-4 text-brand-light" />
                Facebook
              </a>
            )}
          </div>
        )}
      </Card>

      <CreditoDev className="mt-8 text-center" />
    </main>
  );
}
