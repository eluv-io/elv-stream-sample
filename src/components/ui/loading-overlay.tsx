import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  loading: boolean;
  fullPage?: boolean;
  className?: string;
  children: ReactNode;
}

export function LoadingOverlay({
  loading,
  fullPage = false,
  className,
  children,
}: LoadingOverlayProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          fullPage ? "min-h-[50vh]" : "min-h-[200px]",
          className,
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
