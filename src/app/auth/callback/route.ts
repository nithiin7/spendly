import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function localRedirectPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const config = getSupabasePublicConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=supabase-config", request.url),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const destination = localRedirectPath(request.nextUrl.searchParams.get("next"));
  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=verification", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=verification", request.url),
    );
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
