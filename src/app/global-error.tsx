"use client";

import { RouteErrorPage } from "@/components/ui/route-error-page";
import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <RouteErrorPage reset={reset} />
      </body>
    </html>
  );
}
