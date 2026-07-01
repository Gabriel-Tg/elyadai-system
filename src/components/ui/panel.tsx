import type { HTMLAttributes } from "react";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["rounded-lg border border-[var(--border)] bg-[rgba(22,27,34,0.92)] shadow-[0_18px_50px_rgba(0,0,0,0.22)]", className].filter(Boolean).join(" ")} {...props} />;
}