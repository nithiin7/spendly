import { LoadingIndicator } from "@/components/ui/loading-indicator";

export default function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoadingIndicator label="Loading account page" />
    </main>
  );
}
