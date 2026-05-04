export default function Loading() {
  return (
    <div className="bg-bg-subtle min-h-[60vh] flex items-center justify-center">
      <div className="max-w-content mx-auto px-6 py-24 w-full animate-pulse">
        <div className="h-3 bg-bg-hover rounded w-1/4 mb-6" />
        <div className="h-10 bg-bg-hover rounded w-1/2 mb-4" />
        <div className="h-4 bg-bg-hover rounded w-3/4 mb-3" />
        <div className="h-4 bg-bg-hover rounded w-2/3 mb-3" />
        <div className="h-4 bg-bg-hover rounded w-1/2 mb-10" />
        <div className="flex gap-4">
          <div className="h-12 bg-bg-hover rounded-lg w-32" />
          <div className="h-12 bg-bg-hover rounded-lg w-36" />
        </div>
      </div>
    </div>
  );
}
