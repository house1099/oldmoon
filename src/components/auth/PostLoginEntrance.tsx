"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postLoginBootstrapAction } from "@/services/auth-bootstrap.action";

const STORAGE_KEY = "guild_post_login_entrance";

/** 若整頁還在載入資源，等到 load；已 complete（例如 SPA 換頁）則立即繼續 */
const WINDOW_LOAD_TIMEOUT_MS = 12_000;

function waitForWindowLoadIfPending(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.readyState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(), WINDOW_LOAD_TIMEOUT_MS);
    window.addEventListener(
      "load",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** 等下一個繪製幀（連兩次讓 React 排版後有機會上屏） */
function waitNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * 畫面就緒：字型（可選）＋至少一輪繪製。
 * 不依賴「多段 API」，而是瀏覽器載入／排版狀態。
 */
async function waitUntilVisualReady(): Promise<void> {
  await waitForWindowLoadIfPending();

  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }

  await waitNextPaint();
}

type Phase = "idle" | "sync" | "doors";

/**
 * 登入成功後全螢幕過場：進度與「後端同步 + 畫面就緒」掛鉤，就緒後上下門扉開啟。
 * 觸發：① Email 登入寫入 sessionStorage；② OAuth 回呼網址帶 ?guild_entrance=1
 */
export function PostLoginEntrance({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let fromStorage = false;
    try {
      fromStorage = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* ignore */
    }

    const sp = new URLSearchParams(window.location.search);
    const fromQuery = sp.get("guild_entrance") === "1";

    if (!fromStorage && !fromQuery) return;

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }

    if (fromQuery) {
      const u = new URL(window.location.href);
      u.searchParams.delete("guild_entrance");
      const next =
        u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
      window.history.replaceState({}, "", next);
    }

    let cancelled = false;
    const bump = (n: number) => {
      if (!cancelled) setPct((p) => Math.max(p, n));
    };

    setPhase("sync");
    setPct(0);

    void (async () => {
      bump(8);
      await postLoginBootstrapAction().catch(() => {});
      if (cancelled) return;
      bump(32);

      await router.refresh();
      if (cancelled) return;
      bump(58);

      await waitUntilVisualReady();
      if (cancelled) return;
      bump(100);

      await new Promise((r) => setTimeout(r, 280));
      if (cancelled) return;
      setPhase("doors");
      await new Promise((r) => setTimeout(r, 900));
      if (cancelled) return;
      setPhase("idle");
      setPct(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      {children}
      {phase !== "idle" ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[10000]"
          aria-live="polite"
          aria-busy={phase === "sync"}
          aria-label={phase === "sync" ? "營地同步中" : "進入公會"}
        >
          <div
            className={`fixed left-0 right-0 top-0 z-[3] h-1/2 origin-top border-b border-amber-900/25 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 shadow-[inset_0_-12px_40px_rgba(0,0,0,0.55)] transition-transform duration-[850ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
              phase === "doors" ? "-translate-y-full" : "translate-y-0"
            }`}
          />
          <div
            className={`fixed bottom-0 left-0 right-0 z-[3] h-1/2 origin-bottom border-t border-amber-900/25 bg-gradient-to-t from-zinc-800 via-zinc-900 to-zinc-950 shadow-[inset_0_12px_40px_rgba(0,0,0,0.55)] transition-transform duration-[850ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
              phase === "doors" ? "translate-y-full" : "translate-y-0"
            }`}
          />
          <div
            className={`fixed inset-0 z-[2] flex flex-col items-center justify-center bg-black/55 transition-opacity duration-300 ${
              phase === "doors" ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="guild-route-loading-orb" role="presentation" />
            <p className="mt-6 text-sm tracking-wide text-zinc-400">
              {pct >= 100
                ? "準備開啟…"
                : pct >= 58
                  ? "等待畫面就緒…"
                  : "與公會連線中…"}
            </p>
            <p className="mt-2 font-mono text-3xl tabular-nums text-amber-200/90">
              {pct}%
            </p>
            <p className="mt-3 max-w-[16rem] text-center text-[11px] leading-relaxed text-zinc-600">
              畫面與資源載入完成後才會開啟大門
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function markPostLoginEntrance(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
