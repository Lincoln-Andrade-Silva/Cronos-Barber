import { cn } from "@/lib/cn";

type Tone = "success" | "muted" | "brand" | "danger" | "warning";

const toneClasses: Record<Tone, string> = {
  success: "border-success-line bg-success-surface text-success-ink",
  danger: "border-danger-line bg-danger-surface text-danger-ink",
  warning: "border-warning-line bg-warning-surface text-warning-ink",
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
