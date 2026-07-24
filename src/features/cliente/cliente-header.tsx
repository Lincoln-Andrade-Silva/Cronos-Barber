import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getEstabelecimentoBrand } from "@/lib/estabelecimento";
import { LogoutButton } from "@/features/auth/logout-button";

export async function ClienteHeader({ nomeUsuario }: { nomeUsuario: string }) {
  const { nome, logoUrl } = await getEstabelecimentoBrand();
  return (
    <>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Início
      </Link>
      <header className="mb-8 flex items-center justify-between gap-4">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={nome}
            className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
          />
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-lg font-extrabold tracking-tight text-ink">{nome}</p>
          <p className="truncate text-xs text-muted">Olá, {nomeUsuario}</p>
        </div>
      </Link>
      <LogoutButton fullWidth={false} />
      </header>
    </>
  );
}
