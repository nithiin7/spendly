import type { LucideIcon } from "lucide-react";

type SummaryCardProps = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: "default" | "positive";
};

export function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "default",
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.045em] text-ink sm:text-[30px]">
            {value}
          </p>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
            tone === "positive"
              ? "bg-sage-100 text-forest-800"
              : "bg-canvas text-muted"
          }`}
        >
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">{note}</p>
    </article>
  );
}
