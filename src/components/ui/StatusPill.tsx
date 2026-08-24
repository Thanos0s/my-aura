import { cloneElement, type ReactElement, type ReactNode } from "react";

type PillTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<PillTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

interface StatusPillProps {
  icon: ReactElement<{ className?: string }>;
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}

export function StatusPill({ icon, tone = "neutral", children, className = "" }: StatusPillProps) {
  const iconWithSize = cloneElement(icon, {
    className: `w-3.5 h-3.5 ${icon.props.className ?? ""}`.trim(),
    "aria-hidden": true,
  } as { className: string; "aria-hidden": boolean });

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      {iconWithSize}
      {children}
    </span>
  );
}
