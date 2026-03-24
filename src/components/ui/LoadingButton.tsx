"use client";

import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface LoadingButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "type" | "disabled" | "children"
  > {
  onClick?: () => Promise<void> | void;
  /** 受控：由父層決定是否顯示 loading（須自行在 onClick 內切換） */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  loadingText?: string;
  children: ReactNode;
}

export function PendingLabel({
  text = "處理中…",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("flex items-center justify-center gap-2", className)}
    >
      <span
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
        aria-hidden
      />
      {text}
    </span>
  );
}

export default function LoadingButton({
  onClick,
  loading: controlledLoading,
  disabled = false,
  className = "",
  loadingText = "處理中…",
  children,
  ...rest
}: LoadingButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const lockRef = useRef(false);
  const controlled = controlledLoading !== undefined;
  const busy = controlled ? Boolean(controlledLoading) : internalLoading;

  async function handleClick() {
    if (busy || disabled) return;
    if (lockRef.current) return;
    lockRef.current = true;
    if (!controlled) {
      setInternalLoading(true);
    }
    try {
      await onClick?.();
    } finally {
      if (!controlled) {
        setInternalLoading(false);
      }
      lockRef.current = false;
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy || disabled}
      className={cn(
        "relative transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        className,
      )}
      {...rest}
    >
      {busy ? <PendingLabel text={loadingText} /> : children}
    </button>
  );
}
