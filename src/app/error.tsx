"use client";

import { RouteErrorPage } from "@/components/ui/route-error-page";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorPage reset={reset} />;
}
