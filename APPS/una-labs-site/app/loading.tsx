export default function Loading() {
  return (
    <section className="bg-white min-h-[60vh] flex items-center" role="status" aria-live="polite">
      <span className="sr-only">Loading content&hellip;</span>
      <div className="max-w-content mx-auto px-6 py-24 w-full" aria-hidden="true">
        <div className="animate-pulse space-y-6 max-w-narrow mx-auto">
          <div className="h-3 w-24 bg-bg-subtle rounded mx-auto" />
          <div className="h-10 w-3/4 bg-bg-subtle rounded mx-auto" />
          <div className="space-y-3">
            <div className="h-5 bg-bg-subtle rounded" />
            <div className="h-5 bg-bg-subtle rounded w-5/6 mx-auto" />
            <div className="h-5 bg-bg-subtle rounded w-4/6 mx-auto" />
          </div>
          <div className="flex justify-center gap-4 pt-4">
            <div className="h-12 w-40 bg-bg-subtle rounded-lg" />
            <div className="h-12 w-40 bg-bg-subtle rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
