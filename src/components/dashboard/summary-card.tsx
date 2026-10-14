import type { LucideIcon } from "lucide-react";
import { motion, type Variants } from "framer-motion";

export const summaryCardsVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

const summaryCardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
};

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
    <motion.article
      className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      variants={summaryCardVariants}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.045em] text-ink sm:text-[30px]">
            <span data-financial-value>{value}</span>
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
    </motion.article>
  );
}
