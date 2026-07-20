import {
  BarChart3,
  Boxes,
  CalendarDays,
  CreditCard,
  Gauge,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  ready?: boolean;
}

export interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

// Menu lateral do admin, dividido por categorias. `ready` marca o que já existe.
export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/admin", icon: Gauge, ready: true },
      { label: "Agenda", href: "/admin/agenda", icon: CalendarDays, ready: true },
      { label: "Barbeiros", href: "/admin/barbeiros", icon: Users, ready: true },
      { label: "Cadastros", href: "/admin/cadastros", icon: Boxes, ready: true },
      { label: "Vendas", href: "/admin/vendas", icon: ShoppingCart, ready: true },
      { label: "Assinaturas", href: "/admin/assinaturas", icon: CreditCard, ready: true },
      { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [{ label: "Configurações", href: "/admin/configuracoes", icon: Settings, ready: true }],
  },
];
