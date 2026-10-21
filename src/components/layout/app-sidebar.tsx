"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
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

type AccountUser = {
  email?: string;
  user_metadata: Record<string, unknown>;
};

export const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/transactions": "Transactions",
  "/income": "Income",
  "/recurring": "Recurring",
  "/budgets": "Budgets",
  "/insights": "Insights",
  "/categories": "Categories",
  "/settings": "Settings",
  "/profile": "Profile",
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
      <span className="text-[19px] font-semibold tracking-[-0.04em]">
        spendly
      </span>
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

function AccountIdentity({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let accountRequest = 0;
    let unsubscribe = () => {};
    if (!getSupabasePublicConfig()) return;

    const supabase = createClient();
    async function setAccount(user: AccountUser | null) {
      if (!active) return;
      const request = ++accountRequest;
      setEmail(user?.email ?? null);
      setUsername(
        typeof user?.user_metadata.username === "string"
          ? user.user_metadata.username
          : null,
      );
      const avatarPath = user?.user_metadata.avatar_path;
      if (typeof avatarPath !== "string") {
        setAvatarUrl(null);
        return;
      }
      const { data: avatar, error: avatarError } = await supabase.storage
        .from("avatars")
        .createSignedUrl(avatarPath, 60 * 60 * 24 * 7);
      if (!active || request !== accountRequest) return;
      if (avatarError) {
        setError(`Profile photo could not be loaded: ${avatarError.message}`);
        setAvatarUrl(null);
      } else {
        setAvatarUrl(avatar.signedUrl);
      }
    }

    void supabase.auth.getUser().then(
      async ({ data, error: authError }) => {
        if (!active) return;
        if (authError) setError("Account status could not be loaded.");
        else await setAccount(data.user);
      },
      () => {
        if (active) setError("Account status could not be loaded.");
      },
    );
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void setAccount(session?.user ?? null), 0);
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
        onClick={onNavigate}
      >
        Sign in to sync
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        aria-label={`Open profile for ${email}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sage-300"
        href="/profile"
        onClick={onNavigate}
      >
        {avatarUrl ? (
          <Image
            alt=""
            className="size-9 shrink-0 rounded-full object-cover"
            height={36}
            src={avatarUrl}
            unoptimized
            width={36}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-300 text-xs font-semibold uppercase text-forest-950"
          >
            {(username ?? email).slice(0, 2)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {username ?? email}
          </span>
          <span className="block truncate text-xs text-white/45">
            {username ? email : "Private cloud account"}
          </span>
          {error && (
            <span className="mt-1 block text-xs text-red-200" role="alert">
              {error}
            </span>
          )}
        </span>
      </Link>
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
        <AnimatePresence>
          {isOpen && (
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 md:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <motion.button
                aria-label="Close navigation menu"
                className="absolute inset-0 bg-forest-950/35"
                onClick={() => setIsOpen(false)}
                type="button"
              />
              <motion.aside
                aria-label="Mobile navigation drawer"
                animate={{ x: 0 }}
                className="relative flex h-full w-[min(82vw,320px)] flex-col bg-forest-950 px-5 py-6 text-white shadow-2xl"
                exit={{ x: -24 }}
                id="mobile-navigation"
                initial={{ x: -24 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
                <div className="mt-auto border-t border-white/10 px-2 pt-5">
                  <AccountIdentity onNavigate={() => setIsOpen(false)} />
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
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
