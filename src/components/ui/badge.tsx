import { cn } from "@/lib/cn";

type Tone = "success" | "muted" | "brand";

const toneClasses: Record<Tone, string> = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  muted: "border-line bg-surface text-muted2",
  brand: "border-brand/20 bg-brand/10 text-brand-light",
};

export function Badge({
  tone = "brand",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
