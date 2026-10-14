"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ChartNoAxesCombined,
  House,
  Leaf,
  LogOut,
  Menu,
  PiggyBank,
  Repeat2,
  Settings,
  Tags,
  X,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: House },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Income", href: "/income", icon: ArrowDownToLine },
  { label: "Recurring", href: "/recurring", icon: Repeat2 },
  { label: "Budgets", href: "/budgets", icon: PiggyBank },
  { label: "Insights", href: "/insights", icon: ChartNoAxesCombined },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/transactions": "Transactions",
  "/income": "Income",
  "/recurring": "Recurring",
  "/budgets": "Budgets",
  "/insights": "Insights",
  "/categories": "Categories",
  "/settings": "Settings",
};

function Brand() {
  return (
    <Link
      aria-label="Spendly home"
      className="flex items-center gap-3 px-2"
      href="/"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-sage-300 text-forest-950">
        <Leaf aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </span>
      <span className="text-[19px] font-semibold tracking-[-0.04em]">spendly</span>
    </Link>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      <ul className="flex flex-col gap-1">
        {navigation.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={label}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                }`}
                href={href}
                onClick={onNavigate}
              >
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AccountIdentity() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    if (!getSupabasePublicConfig()) return;

    const supabase = createClient();
    void supabase.auth.getUser().then(
      ({ data, error: authError }) => {
        if (!active) return;
        if (authError) setError("Account status could not be loaded.");
        else setEmail(data.user?.email ?? null);
      },
      () => {
        if (active) setError("Account status could not be loaded.");
      },
    );
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    unsubscribe = () => data.subscription.unsubscribe();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signOut() {
    setError("");
    try {
      const { error: authError } = await createClient().auth.signOut();
      if (authError) throw authError;
      router.replace("/auth/sign-in");
      router.refresh();
    } catch {
      setError("You could not be signed out. Please try again.");
    }
  }

  if (!email) {
    return (
      <Link
        className="rounded-lg px-3 py-2 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
        href="/auth/sign-in"
      >
        Sign in to sync
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-300 text-xs font-semibold uppercase text-forest-950"
      >
        {email.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{email}</p>
        <p className="truncate text-xs text-white/45">Private cloud account</p>
        {error && <p className="mt-1 text-xs text-red-200" role="alert">{error}</p>}
      </div>
      <button
        aria-label="Sign out"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white"
        onClick={signOut}
        type="button"
      >
        <LogOut aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function AppSidebar({
  mobileTriggerOnly = false,
}: {
  mobileTriggerOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (mobileTriggerOnly) {
    return (
      <>
        <button
          aria-controls="mobile-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className="flex size-10 items-center justify-center rounded-xl border border-border text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700"
          onClick={() => setIsOpen((open) => !open)}
          ref={triggerRef}
          type="button"
        >
          {isOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
        {isOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-forest-950/35"
              onClick={() => setIsOpen(false)}
              type="button"
            />
            <aside
              aria-label="Mobile navigation drawer"
              className="relative h-full w-[min(82vw,320px)] bg-forest-950 px-5 py-6 text-white shadow-2xl"
              id="mobile-navigation"
            >
              <div className="mb-10 flex items-center justify-between">
                <Brand />
                <button
                  aria-label="Close navigation menu"
                  className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-300"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Workspace
              </p>
              <NavigationLinks onNavigate={() => setIsOpen(false)} />
            </aside>
          </div>
        )}
      </>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-forest-950 px-5 py-6 text-white md:flex">
      <div className="mb-12">
        <Brand />
      </div>
      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
        Workspace
      </p>
      <NavigationLinks />
      <div className="mt-auto border-t border-white/10 px-2 pt-5">
        <AccountIdentity />
      </div>
    </aside>
  );
}
