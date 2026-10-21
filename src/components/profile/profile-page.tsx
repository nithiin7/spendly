"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SIGNED_URL_LIFETIME = 60 * 60 * 24 * 7;

type ProfileUser = {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
};

export function ProfilePage() {
  const hasSupabaseConfig = getSupabasePublicConfig() !== null;
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [username, setUsername] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!hasSupabaseConfig) return;

    const supabase = createClient();
    void supabase.auth.getUser().then(
      async ({ data, error: authError }) => {
        if (!active) return;
        if (authError) {
          setError("Your account could not be loaded. Please try again.");
          setIsLoading(false);
          return;
        }
        const currentUser = data.user;
        if (!currentUser) {
          setIsLoading(false);
          return;
        }
        setUser(currentUser);
        setUsername(
          typeof currentUser.user_metadata.username === "string"
            ? currentUser.user_metadata.username
            : "",
        );
        const path = currentUser.user_metadata.avatar_path;
        if (typeof path === "string") {
          setAvatarPath(path);
          const { data: avatar, error: avatarError } = await supabase.storage
            .from("avatars")
            .createSignedUrl(path, SIGNED_URL_LIFETIME);
          if (!active) return;
          if (avatarError) {
            setError(
              `Your profile photo could not be loaded: ${avatarError.message}`,
            );
          } else {
            setAvatarUrl(avatar.signedUrl);
          }
        }
        if (active) setIsLoading(false);
      },
      () => {
        if (!active) return;
        setError("Your account could not be loaded. Please try again.");
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [hasSupabaseConfig]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function selectAvatar(file: File | undefined) {
    setError("");
    setSuccess("");
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Profile photos must be 5 MB or smaller.");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewUrlRef.current);
    setSelectedAvatar(file);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedUsername = username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(normalizedUsername)) {
      setError(
        "Use 3–24 characters: letters, numbers, periods, hyphens, or underscores.",
      );
      return;
    }
    if (!user) {
      setError("Sign in to update your profile.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    try {
      let nextAvatarPath = avatarPath;
      let nextAvatarUrl = avatarUrl;
      if (selectedAvatar) {
        nextAvatarPath = `${user.id}/avatar`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(nextAvatarPath, selectedAvatar, {
            cacheControl: "3600",
            contentType: selectedAvatar.type,
            upsert: true,
          });
        if (uploadError) {
          setError(`Profile photo upload failed: ${uploadError.message}`);
          return;
        }
        const { data: avatar, error: avatarError } = await supabase.storage
          .from("avatars")
          .createSignedUrl(nextAvatarPath, SIGNED_URL_LIFETIME);
        if (avatarError) {
          setError(`Profile photo preview failed: ${avatarError.message}`);
          return;
        }
        nextAvatarUrl = avatar.signedUrl;
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          username: normalizedUsername,
          avatar_path: nextAvatarPath,
        },
      });
      if (updateError) {
        setError(`Profile update failed: ${updateError.message}`);
        return;
      }
      if (!data.user) {
        setError(
          "The updated profile was not returned by the account service.",
        );
        return;
      }

      setUser(data.user);
      setUsername(normalizedUsername);
      setAvatarPath(nextAvatarPath);
      setAvatarUrl(nextAvatarUrl);
      setSelectedAvatar(null);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
      setSuccess("Your profile has been saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `Profile update failed: ${saveError.message}`
          : "Profile update failed because the account service returned an unknown error.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingIndicator label="Loading your profile" />
      </div>
    );
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-ink">
          Cloud profile unavailable
        </h2>
        <p className="mt-2 text-sm text-muted">
          Connect Spendly to Supabase to create and manage a cloud profile.
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-ink">
          Sign in to manage your profile
        </h2>
        <p className="mt-2 text-sm text-muted">
          Your profile is available when you use a cloud account.
        </p>
        <Link className="button-primary mt-5" href="/auth/sign-in">
          Sign in
        </Link>
      </section>
    );
  }

  const displayedAvatar = previewUrl ?? avatarUrl;

  return (
    <div className="max-w-2xl">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">
            Your profile
          </h2>
          <p className="mt-1 text-sm text-muted">
            Choose how your account appears in Spendly.
          </p>
        </div>

        <form className="mt-8 space-y-7" onSubmit={saveProfile}>
          <div className="flex items-center gap-5">
            {displayedAvatar ? (
              <Image
                alt="Profile photo preview"
                className="size-20 rounded-full object-cover"
                height={80}
                src={displayedAvatar}
                unoptimized
                width={80}
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex size-20 items-center justify-center rounded-full bg-sage-200 text-xl font-semibold uppercase text-forest-800"
              >
                {username.slice(0, 2) || user.email?.slice(0, 2) || "SP"}
              </div>
            )}
            <div>
              <label className="button-secondary" htmlFor="profile-photo">
                {selectedAvatar ? "Choose another photo" : "Upload photo"}
              </label>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                id="profile-photo"
                onChange={(event) =>
                  selectAvatar(event.currentTarget.files?.[0])
                }
                type="file"
              />
              <p className="mt-2 text-xs text-muted">
                JPG, PNG, or WebP. Maximum 5 MB.
              </p>
            </div>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-ink"
              htmlFor="username"
            >
              Username
            </label>
            <input
              autoComplete="username"
              className="form-input"
              id="username"
              maxLength={24}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your_username"
              value={username}
            />
            <p className="mt-2 text-xs text-muted">
              3–24 characters; letters, numbers, periods, hyphens, and
              underscores.
            </p>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-ink"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="form-input bg-canvas text-muted"
              id="email"
              readOnly
              value={user.email ?? ""}
            />
            <p className="mt-2 text-xs text-muted">
              Your email is managed by your sign-in provider.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-positive" role="status">
              {success}
            </p>
          )}

          <div className="flex justify-end border-t border-border pt-5">
            <button
              className="button-primary"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
