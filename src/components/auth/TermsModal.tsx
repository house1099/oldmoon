"use client";

import { TERMS_OF_SERVICE } from "@/lib/constants/terms";

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TermsModal({ open, onClose }: TermsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
      <div className="glass-panel flex max-h-[85vh] w-full max-w-lg flex-col">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-bold text-white">
            冒險者公會使用者條款
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-zinc-400 transition-colors hover:text-white"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="font-sans text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
            {TERMS_OF_SERVICE}
          </pre>
        </div>

        <div className="flex-shrink-0 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-violet-600 py-4 text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-95"
          >
            我已閱讀並同意條款
          </button>
        </div>
      </div>
    </div>
  );
}
