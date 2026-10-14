import Link from "next/link";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  House,
  Leaf,
  Tags,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "#overview", icon: House },
  { label: "Transactions", href: "#transactions", icon: ArrowLeftRight },
  { label: "Categories", href: "#categories", icon: Tags },
  { label: "Reports", href: "#reports", icon: ChartNoAxesCombined },
];

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      <ul
        className={
          mobile
            ? "flex min-w-max items-center gap-1"
            : "flex flex-col gap-1"
        }
      >
        {navigation.map(({ label, href, icon: Icon }, index) => (
          <li key={label}>
            <Link
              aria-current={index === 0 ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                index === 0
                  ? "bg-white/10 text-white"
                  : "text-white/65 hover:bg-white/[0.07] hover:text-white"
              } ${mobile ? "px-3 py-2" : ""}`}
              href={href}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppSidebar() {
  return (
    <>
      <aside className="hidden min-h-screen w-[248px] shrink-0 flex-col bg-forest-950 px-5 py-6 text-white md:flex">
        <Link
          aria-label="Spendly home"
          className="mb-12 flex items-center gap-3 px-2"
          href="#overview"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-sage-300 text-forest-950">
            <Leaf aria-hidden="true" className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-[19px] font-semibold tracking-[-0.04em]">
            spendly
          </span>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Workspace
        </p>
        <NavigationLinks />

        <div className="mt-auto space-y-1">
          <div className="mt-5 flex items-center gap-3 border-t border-white/10 px-2 pt-5">
            <div
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-sage-300 text-xs font-semibold text-forest-950"
            >
              JD
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Jordan Davis</p>
              <p className="truncate text-xs text-white/45">Personal account</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="border-b border-border bg-forest-950 px-4 py-3 text-white md:hidden">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sage-300 text-forest-950">
            <Leaf aria-hidden="true" className="size-4" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-[-0.04em]">
            spendly
          </span>
        </div>
        <div className="overflow-x-auto">
          <NavigationLinks mobile />
        </div>
      </div>
    </>
  );
}
