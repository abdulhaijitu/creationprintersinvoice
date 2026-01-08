import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "text" | "heading" | "avatar" | "button" | "card";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variantClasses = {
    default: "rounded-md bg-muted",
    text: "h-4 rounded bg-muted",
    heading: "h-6 rounded bg-muted",
    avatar: "h-10 w-10 rounded-full bg-muted",
    button: "h-10 w-24 rounded-md bg-muted",
    card: "rounded-lg border bg-card p-4 md:p-6",
  };

  return (
    <div
      className={cn("animate-pulse", variantClasses[variant], className)}
      {...props}
    />
  );
}

// Compound components for common patterns
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(i === lines - 1 && "w-3/4")}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 md:p-6 space-y-4", className)}>
      <Skeleton variant="heading" className="w-1/3" />
      <SkeletonText lines={2} />
    </div>
  );
}

function SkeletonTableRow({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-4 border-b", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn("flex-1", i === 0 && "w-12 flex-none")}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTableRow };
