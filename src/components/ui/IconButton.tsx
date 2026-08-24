"use client";

import { cloneElement, type ButtonHTMLAttributes, type ReactElement } from "react";

type IconButtonSize = "sm" | "md";

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: "icon-btn-sm",
  md: "icon-btn-md",
};

const ICON_SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactElement<{ className?: string }>;
  label: string;
  size?: IconButtonSize;
}

export function IconButton({
  icon,
  label,
  size = "md",
  className = "",
  ...rest
}: IconButtonProps) {
  const iconWithSize = cloneElement(icon, {
    className: `${ICON_SIZE_CLASS[size]} ${icon.props.className ?? ""}`.trim(),
    "aria-hidden": true,
  } as { className: string; "aria-hidden": boolean });

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-btn ${SIZE_CLASS[size]} focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${className}`}
      {...rest}
    >
      {iconWithSize}
      <span className="sr-only">{label}</span>
    </button>
  );
}
