import { Suspense, type ReactNode } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <LoadingIndicator label="Loading account page" />
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
