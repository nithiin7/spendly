import { LoadingIndicator } from "@/components/ui/loading-indicator";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoadingIndicator />
    </main>
  );
}
