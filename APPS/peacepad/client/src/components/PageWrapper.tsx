import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "plain";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  noPadding?: boolean;
  as?: "main" | "section" | "div";
  "aria-label"?: string;
}

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

export function PageWrapper({
  children,
  className,
  variant = "default",
  maxWidth = "lg",
  noPadding = false,
  as: Component = "div",
  "aria-label": ariaLabel,
}: PageWrapperProps) {
  const baseClasses = cn(
    "w-full",
    "min-h-[calc(var(--app-viewport-height,100vh)-4rem)]",
    "pb-24 lg:pb-8",
    !noPadding && "px-4 py-6 sm:px-6 sm:py-8",
    variant === "default" && "bg-background",
    variant === "gradient" && "bg-gradient-to-b from-background to-muted/20",
    variant === "plain" && "",
    className
  );

  const contentClasses = cn(
    "mx-auto w-full",
    maxWidthClasses[maxWidth]
  );

  return (
    <Component className={baseClasses} aria-label={ariaLabel}>
      <div className={contentClasses}>
        {children}
      </div>
    </Component>
  );
}

export function PageHeader({
  children,
  className,
  title,
  description,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <header className={cn("space-y-2 mb-6", className)} role="banner">
      {title && (
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
      )}
      {description && (
        <p className="text-muted-foreground text-sm sm:text-base">{description}</p>
      )}
      {children}
    </header>
  );
}

export function PageSection({
  children,
  className,
  title,
  description,
  "aria-labelledby": ariaLabelledby,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  "aria-labelledby"?: string;
}) {
  const headingId = title ? `section-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  return (
    <section
      className={cn("space-y-4", className)}
      aria-labelledby={ariaLabelledby || headingId}
    >
      {title && (
        <div className="space-y-1">
          <h2 id={headingId} className="text-lg sm:text-xl font-semibold">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export default PageWrapper;
