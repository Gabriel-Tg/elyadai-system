import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-[var(--tactical-blue)] bg-[var(--tactical-blue)] text-white shadow-[var(--glow-blue)] hover:bg-blue-500 hover:border-blue-400",
  secondary: "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]",
  success: "border-[var(--operational-green)] bg-[var(--operational-green)] text-white shadow-[var(--glow-green)] hover:bg-green-600",
  warning: "border-[var(--attention-yellow)] bg-[rgba(210,153,34,0.14)] text-[#f0d18a] shadow-[var(--glow-yellow)] hover:bg-[rgba(210,153,34,0.24)]",
  danger: "border-[var(--alert-red)] bg-[rgba(218,54,51,0.16)] text-[#ffb4b2] shadow-[var(--glow-red)] hover:bg-[rgba(218,54,51,0.25)]",
  ghost: "border-transparent bg-transparent text-[var(--muted-strong)] hover:border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:text-white",
};

const baseClasses = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] outline-none focus-visible:ring-2 focus-visible:ring-[var(--tactical-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px disabled:shadow-none";

function classes(variant: ButtonVariant, className?: string) {
  return [baseClasses, variantClasses[variant], className].filter(Boolean).join(" ");
}

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={classes(variant, className)} {...props} />;
}

export function ButtonLink({ children, className, variant = "primary", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string; variant?: ButtonVariant }) {
  return <Link className={classes(variant, className)} {...props}>{children}</Link>;
}