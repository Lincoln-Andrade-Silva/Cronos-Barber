"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { montarUrl } from "@/lib/pagination";
import { TabBar, type TabItem } from "./tab-bar";

export function UrlTabBar({
  tabs,
  defaultTab,
}: {
  tabs: readonly TabItem[];
  defaultTab: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? defaultTab;

  function onChange(key: string) {
    // Troca de aba reseta paginação, busca e filtros.
    router.replace(
      montarUrl(pathname, searchParams, {
        tab: key === defaultTab ? null : key,
        page: null,
        q: null,
        status: null,
        prof: null,
      }),
    );
  }

  return <TabBar tabs={tabs} active={active} onChange={onChange} />;
}
