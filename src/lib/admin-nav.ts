import {
  BarChart3,
  Boxes,
  CalendarDays,
  CreditCard,
  Gauge,
  Scissors,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  ready?: boolean;
}

// Menu lateral do admin. `ready` marca o que ja existe; o resto entra nas proximas fases.
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: Gauge, ready: true },
  { label: "Agenda", href: "/admin/agenda", icon: CalendarDays },
  { label: "Financeiro", href: "/admin/financeiro", icon: Wallet },
  { label: "Barbeiros", href: "/admin/barbeiros", icon: Scissors },
  { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
  { label: "Gestão", href: "/admin/gestao", icon: Boxes },
  { label: "Assinaturas", href: "/admin/assinaturas", icon: CreditCard },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings, ready: true },
];
