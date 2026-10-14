export function FinancePageState({
  isLoading,
  error,
}: {
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading your finance data"
        className="space-y-4"
        role="status"
      >
        <div className="h-28 animate-pulse rounded-2xl border border-border bg-white" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-white" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <h2 className="font-semibold">Your finance data could not be loaded</h2>
      <p className="mt-2" role="alert">
        {error ??
          "The browser did not provide access to local storage. Your existing data has not been replaced."}
      </p>
      <p className="mt-2">
        Visit Settings to restore a backup, or Overview to explicitly restore
        the sample data.
      </p>
    </div>
  );
}
