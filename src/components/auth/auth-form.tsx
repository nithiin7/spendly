"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "update-password";
type OAuthProvider = "google" | "azure";

function SpendlyBrand() {
  return (
    <Link
      aria-label="Spendly home"
      className="inline-flex items-center gap-2.5"
      href="/"
    >
      <span className="flex size-10 items-center justify-center rounded-[14px] bg-forest-800">
        <svg
          aria-hidden="true"
          className="size-[22px]"
          fill="none"
          viewBox="0 0 32 32"
        >
          <path
            d="M8 21.5c0-6.2 4.2-11 13.7-13.2-.2 9.5-5 15.7-11.2 15.7-2.7 0-4.5-1.1-4.5-3.1"
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path
            d="M9 24c2.2-3.2 5.3-6 9.6-8.8"
            stroke="white"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
        </svg>
      </span>
      <span className="text-2xl font-semibold tracking-[-0.06em] text-forest-950">
        spendly
      </span>
    </Link>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      viewBox="0 0 48 48"
    >
      <path
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
        fill="#4285F4"
      />
      <path
        d="M24 44c5.5 0 10.2-1.8 13.6-4.9L31 34c-1.8 1.2-4.1 2-7 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
        fill="#34A853"
      />
      <path
        d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"
        fill="#FBBC05"
      />
      <path
        d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9A19.8 19.8 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3c1.6-4.9 6.1-8.5 11.4-8.5Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      viewBox="0 0 24 24"
    >
      <path d="M2 2h9v9H2z" fill="#F25022" />
      <path d="M13 2h9v9h-9z" fill="#7FBA00" />
      <path d="M2 13h9v9H2z" fill="#00A4EF" />
      <path d="M13 13h9v9h-9z" fill="#FFB900" />
    </svg>
  );
}

const modeCopy: Record<AuthMode, { title: string; action: string }> = {
  "sign-in": { title: "Welcome back", action: "Sign in" },
  "sign-up": { title: "Create your account", action: "Create account" },
  "forgot-password": {
    title: "Reset your password",
    action: "Send reset link",
  },
  "update-password": {
    title: "Choose a new password",
    action: "Update password",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(() => {
    const authError = searchParams.get("error");
    if (authError === "supabase-config") {
      return "Supabase is not configured. Add the project URL and publishable key to .env.local, then restart the app.";
    }
    if (authError === "verification") {
      return "That verification or recovery link could not be confirmed. Request a new link and try again.";
    }
    return "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (
      (mode === "sign-up" || mode === "update-password") &&
      password !== confirmPassword
    ) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      if (mode === "sign-in") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        const next = searchParams.get("next");
        router.replace(
          next?.startsWith("/") && !next.startsWith("//") ? next : "/",
        );
        router.refresh();
      } else if (mode === "sign-up") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage(
            "Check your email for a verification link to finish creating your account.",
          );
        }
      } else if (mode === "forgot-password") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
          },
        );
        if (authError) throw authError;
        setMessage(
          "If an account exists for that address, a password reset link is on its way.",
        );
      } else {
        const { error: authError } = await supabase.auth.updateUser({
          password,
        });
        if (authError) throw authError;
        setMessage(
          "Your password was updated. You can now continue to Spendly.",
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The authentication request could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startOAuthSignIn(provider: OAuthProvider) {
    setMessage("");
    setError("");
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
          ...(provider === "azure" ? { scopes: "email" } : {}),
        },
      });
      if (authError) throw authError;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The authentication request could not be completed.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-white p-6 shadow-card sm:p-8">
        <div className="mb-6 flex justify-center">
          <SpendlyBrand />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-[-0.04em] text-ink">
          {modeCopy[mode].title}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-muted">
          Your finance data is private to your account and synchronized
          securely.
        </p>
        {(mode === "sign-in" || mode === "sign-up") && (
          <div className="mt-6 space-y-2.5">
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void startOAuthSignIn("google")}
              type="button"
            >
              <GoogleMark />
              Continue with Google
            </button>
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void startOAuthSignIn("azure")}
              type="button"
            >
              <MicrosoftMark />
              Continue with Microsoft
            </button>
            <div className="flex items-center gap-3 py-1 text-xs text-muted">
              <span className="h-px flex-1 bg-border" />
              <span>or use email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {mode !== "update-password" && (
            <label className="block text-sm font-medium text-ink">
              Email
              <input
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-3 font-normal outline-none focus:border-forest-600"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
          )}
          {mode !== "forgot-password" && (
            <label className="block text-sm font-medium text-ink">
              {mode === "update-password" ? "New password" : "Password"}
              <input
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-3 font-normal outline-none focus:border-forest-600"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
          )}
          {(mode === "sign-up" || mode === "update-password") && (
            <label className="block text-sm font-medium text-ink">
              Confirm password
              <input
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-3 font-normal outline-none focus:border-forest-600"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          )}
          {message && (
            <p
              className="rounded-xl bg-sage-50 px-3.5 py-3 text-sm text-forest-900"
              role="status"
            >
              {message}
            </p>
          )}
          {error && (
            <p
              className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            className="w-full rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Please wait…" : modeCopy[mode].action}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-muted">
          {mode === "sign-in" && (
            <>
              <Link
                className="text-forest-800 hover:underline"
                href="/auth/sign-up"
              >
                Create account
              </Link>
              <Link
                className="text-forest-800 hover:underline"
                href="/auth/forgot-password"
              >
                Forgot password?
              </Link>
            </>
          )}
          {mode === "sign-up" && (
            <Link
              className="text-forest-800 hover:underline"
              href="/auth/sign-in"
            >
              Already have an account? Sign in
            </Link>
          )}
          {mode === "forgot-password" && (
            <Link
              className="text-forest-800 hover:underline"
              href="/auth/sign-in"
            >
              Back to sign in
            </Link>
          )}
          {mode === "update-password" && (
            <Link
              className="text-forest-800 hover:underline"
              href="/auth/sign-in"
            >
              Back to sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
