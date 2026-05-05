export default function Loading() {
  return (
    <section className="bg-white min-h-[60vh] flex items-center" aria-label="Loading" aria-busy="true">
      <span className="sr-only">Loading content, please wait...</span>
      <div className="max-w-content mx-auto px-6 py-24 w-full">
        {/* Skeleton hero */}
        <div className="flex flex-col gap-4 max-w-narrow mx-auto text-center">
          <div className="skeleton h-3 w-32 mx-auto rounded-full" />
          <div className="skeleton h-10 w-4/5 mx-auto rounded-lg" />
          <div className="skeleton h-10 w-3/5 mx-auto rounded-lg" />
          <div className="flex flex-col gap-2 mt-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 mx-auto rounded" />
            <div className="skeleton h-4 w-3/4 mx-auto rounded" />
          </div>
          <div className="flex justify-center gap-3 mt-4">
            <div className="skeleton h-12 w-36 rounded-lg" />
            <div className="skeleton h-12 w-28 rounded-lg" />
          </div>
        </div>

        {/* Skeleton card row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3 p-6 border border-border rounded-xl">
              <div className="skeleton h-8 w-8 rounded-lg" />
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-5/6 rounded" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            #F5F7FA 25%,
            #E5E7EB 50%,
            #F5F7FA 75%
          );
          background-size: 600px 100%;
          animation: una-shimmer 1.5s infinite linear;
        }
        @keyframes una-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
      `}</style>
    </section>
  );
}
