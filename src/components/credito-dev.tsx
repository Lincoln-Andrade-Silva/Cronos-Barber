import { cn } from "@/lib/cn";

const LINKEDIN = "https://www.linkedin.com/in/lincoln-andrade-silva-975b891aa/";

export function CreditoDev({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted2", className)}>
      Desenvolvido por{" "}
      <a
        href={LINKEDIN}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-light transition hover:underline"
      >
        Lincoln Andrade
      </a>
    </p>
  );
}
