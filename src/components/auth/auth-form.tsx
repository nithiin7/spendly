"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "update-password";

const modeCopy: Record<AuthMode, { title: string; action: string }> = {
  "sign-in": { title: "Welcome back", action: "Sign in" },
  "sign-up": { title: "Create your account", action: "Create account" },
  "forgot-password": { title: "Reset your password", action: "Send reset link" },
  "update-password": { title: "Choose a new password", action: "Update password" },
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
        router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
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
          setMessage("Check your email for a verification link to finish creating your account.");
        }
      } else if (mode === "forgot-password") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
          },
        );
        if (authError) throw authError;
        setMessage("If an account exists for that address, a password reset link is on its way.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Your password was updated. You can now continue to Spendly.");
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border bg-white p-7 shadow-card sm:p-9">
        <Link className="text-sm font-semibold tracking-tight text-forest-800" href="/">
          spendly
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-[-0.04em] text-ink">
          {modeCopy[mode].title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your finance data is private to your account and synchronized securely.
        </p>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
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
            <p className="rounded-xl bg-sage-50 px-3.5 py-3 text-sm text-forest-900" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          <button
            className="w-full rounded-xl bg-forest-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Please wait…" : modeCopy[mode].action}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-muted">
          {mode === "sign-in" && (
            <>
              <Link className="text-forest-800 hover:underline" href="/auth/sign-up">
                Create account
              </Link>
              <Link className="text-forest-800 hover:underline" href="/auth/forgot-password">
                Forgot password?
              </Link>
            </>
          )}
          {mode === "sign-up" && (
            <Link className="text-forest-800 hover:underline" href="/auth/sign-in">
              Already have an account? Sign in
            </Link>
          )}
          {mode === "forgot-password" && (
            <Link className="text-forest-800 hover:underline" href="/auth/sign-in">
              Back to sign in
            </Link>
          )}
          {mode === "update-password" && (
            <Link className="text-forest-800 hover:underline" href="/auth/sign-in">
              Back to sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
