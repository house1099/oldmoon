"use client";

import { useMemo, useState } from "react";
import { useTavern } from "@/hooks/useTavern";
import { TavernModal } from "@/components/tavern/TavernModal";

export function TavernFab({
  messageMaxLength = 50,
}: {
  messageMaxLength?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastClosedAt, setLastClosedAt] = useState(() => Date.now());
  const { messages } = useTavern();

  const showDot = useMemo(() => {
    if (isOpen) return false;
    const last = messages[messages.length - 1];
    if (!last) return false;
    return new Date(last.created_at).getTime() > lastClosedAt;
  }, [messages, isOpen, lastClosedAt]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setLastClosedAt(Date.now());
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-xl shadow-lg transition-colors hover:bg-amber-500"
        style={{
          marginBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="開啟酒館廣場"
      >
        <span className="relative">
          🍺
          {showDot ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-zinc-950" />
          ) : null}
        </span>
      </button>
      <TavernModal
        open={isOpen}
        onClose={() => handleOpenChange(false)}
        maxLength={messageMaxLength}
      />
    </>
  );
}
