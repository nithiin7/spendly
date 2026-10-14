import { LoadingIndicator } from "@/components/ui/loading-indicator";

function Skeleton({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-sage-100 motion-reduce:animate-none ${className}`}
    />
  );
}

export function DashboardLoading() {
  return (
    <div aria-busy="true" className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-44" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            aria-hidden="true"
            className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-card"
            key={index}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-72 rounded-2xl border border-border bg-white" />
        <Skeleton className="h-72 rounded-2xl border border-border bg-white" />
      </div>
      <div className="flex justify-center py-2">
        <LoadingIndicator label="Loading your finances" />
      </div>
    </div>
  );
}
