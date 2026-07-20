"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  avatarUrl?: string | null;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  withAvatar?: boolean;
}

function Avatar({ url, nome }: { url?: string | null; nome: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nome}
        className="h-6 w-6 shrink-0 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}

export function Select({ value, onChange, options, className, withAvatar }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:border-line2 hover:bg-surface2"
      >
        <span className="flex min-w-0 items-center gap-2">
          {withAvatar && selected && selected.avatarUrl !== undefined && (
            <Avatar url={selected.avatarUrl} nome={selected.label} />
          )}
          <span className="truncate">{selected?.label ?? "Selecionar"}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted2 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 min-w-full overflow-hidden rounded-lg border border-line bg-panel p-1 shadow-2xl">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition",
                  active ? "bg-brand/10 font-medium text-brand-light" : "text-ink hover:bg-surface",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {withAvatar && option.avatarUrl !== undefined && (
                    <Avatar url={option.avatarUrl} nome={option.label} />
                  )}
                  <span className="truncate">{option.label}</span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
