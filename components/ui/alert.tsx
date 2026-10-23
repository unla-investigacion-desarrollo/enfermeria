import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertProps = React.ComponentProps<"div"> & {
  variant?: "error" | "success" | "info";
};

export function Alert({ className, variant = "error", children, ...props }: AlertProps) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        variant === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
        variant === "success" &&
          "border-emerald-600/30 bg-emerald-50 text-emerald-800",
        variant === "info" && "border-navy/20 bg-navy/5 text-navy",
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
