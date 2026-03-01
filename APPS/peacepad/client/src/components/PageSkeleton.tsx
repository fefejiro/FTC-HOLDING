import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  variant?: "default" | "dashboard" | "list" | "chat" | "settings";
}

export function PageSkeleton({ variant = "default" }: PageSkeletonProps) {
  switch (variant) {
    case "dashboard":
      return (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border bg-card">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "list":
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-6" />
              </div>
            ))}
          </div>
        </div>
      );

    case "chat":
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`space-y-2 max-w-[70%] ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
                  <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-56'} rounded-2xl`} />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
      );

    case "settings":
      return (
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg border bg-card space-y-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
          <div className="space-y-2 text-center">
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        </div>
      );
  }
}

export function AuthLoadingSkeleton() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Loading PeacePad</p>
          <p className="text-xs text-muted-foreground">Setting up your experience...</p>
        </div>
      </div>
    </div>
  );
}
