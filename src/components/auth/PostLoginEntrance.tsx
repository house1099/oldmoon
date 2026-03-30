"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { postLoginBootstrapAction } from "@/services/auth-bootstrap.action";

/** 與 `public/images/splash.png`（品牌開場圖）對應 */
export const GUILD_ENTRANCE_SPLASH_PATH = "/images/splash.png";

const LOGIN_TRIGGER_KEY = "guild_post_login_entrance";
/** 同一分頁工作階段內已完成過開場則略過；登入成功觸發時仍會再播一次 */
const SPLASH_SESSION_KEY = "guild_app_splash_done_v1";

const WINDOW_LOAD_TIMEOUT_MS = 12_000;
const DOOR_MS = 1800;
const HOLD_AT_100_MS = 520;

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

function waitNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

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
 * 公會開場儀式：全螢幕品牌圖、進度條、完成後上下門緩慢開啟。
 *
 * - **每次新開分頁／關閉後再開**（sessionStorage 清空）：進入 App 即播放。
 * - **同一分頁內**已播過：不再打擾；但若為 **剛登入**（`markPostLoginEntrance` 或 `?guild_entrance=1`）則再播一次。
 */
export function PostLoginEntrance({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [smoothPct, setSmoothPct] = useState(0);
  const goalRef = useRef(0);

  useEffect(() => {
    if (phase === "idle") return;
    let raf = 0;
    const loop = () => {
      setSmoothPct((prev) => {
        const g = goalRef.current;
        if (prev >= g) return prev;
        const step = Math.max(0.22, (g - prev) * 0.045);
        return Math.min(prev + step, g);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let fromLoginStorage = false;
    try {
      fromLoginStorage = sessionStorage.getItem(LOGIN_TRIGGER_KEY) === "1";
    } catch {
      /* ignore */
    }

    const sp = new URLSearchParams(window.location.search);
    const fromLoginQuery = sp.get("guild_entrance") === "1";

    let splashDone = false;
    try {
      splashDone = sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
    } catch {
      /* ignore */
    }

    const fromLogin = fromLoginStorage || fromLoginQuery;
    if (splashDone && !fromLogin) return;

    try {
      sessionStorage.removeItem(LOGIN_TRIGGER_KEY);
    } catch {
      /* ignore */
    }

    if (fromLoginQuery) {
      const u = new URL(window.location.href);
      u.searchParams.delete("guild_entrance");
      const next =
        u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
      window.history.replaceState({}, "", next);
    }

    let cancelled = false;
    const setGoal = (n: number) => {
      if (!cancelled) goalRef.current = Math.max(goalRef.current, n);
    };

    goalRef.current = 0;
    setSmoothPct(0);
    setPhase("sync");

    void (async () => {
      setGoal(6);
      await postLoginBootstrapAction().catch(() => {});
      if (cancelled) return;
      setGoal(28);

      await router.refresh();
      if (cancelled) return;
      setGoal(52);

      await waitUntilVisualReady();
      if (cancelled) return;
      setGoal(100);
      /* 讓平滑進度條有时间追上 100%，維持儀式感 */
      await new Promise((r) => setTimeout(r, 2400));
      if (cancelled) return;
      goalRef.current = 100;
      setSmoothPct(100);

      await new Promise((r) => setTimeout(r, HOLD_AT_100_MS));
      if (cancelled) return;

      setPhase("doors");
      await new Promise((r) => setTimeout(r, DOOR_MS + 120));
      if (cancelled) return;

      try {
        sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("idle");
      goalRef.current = 0;
      setSmoothPct(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const doorOpen = phase === "doors";
  const showOverlay = phase !== "idle";
  const barPct = Math.min(100, Math.round(smoothPct * 10) / 10);

  return (
    <>
      {children}
      {showOverlay ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[10000] bg-black"
          aria-live="polite"
          aria-busy={phase === "sync"}
          aria-label={phase === "sync" ? "公會營地載入中" : "進入公會"}
        >
          {/* 上門：與下門共用同一張圖，裁切對齊 */}
          <div
            className="fixed left-0 right-0 top-0 z-[2] h-1/2 overflow-hidden bg-black"
            style={{
              transform: doorOpen ? "translateY(-100%)" : "translateY(0)",
              transition: `transform ${DOOR_MS}ms cubic-bezier(0.45, 0, 0.15, 1)`,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-[100dvh] min-h-[100vh] w-full bg-black"
              style={{
                backgroundImage: `url(${GUILD_ENTRANCE_SPLASH_PATH})`,
                backgroundSize: "contain",
                backgroundPosition: "center top",
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>

          <div
            className="fixed bottom-0 left-0 right-0 z-[2] h-1/2 overflow-hidden bg-black"
            style={{
              transform: doorOpen ? "translateY(100%)" : "translateY(0)",
              transition: `transform ${DOOR_MS}ms cubic-bezier(0.45, 0, 0.15, 1)`,
            }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-[100dvh] min-h-[100vh] w-full bg-black"
              style={{
                backgroundImage: `url(${GUILD_ENTRANCE_SPLASH_PATH})`,
                backgroundSize: "contain",
                backgroundPosition: "center bottom",
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>

          {/* 中央微光與儀式感邊緣 */}
          <div
            className="pointer-events-none fixed inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.25)_55%,rgba(0,0,0,0.65)_100%)]"
            style={{
              opacity: doorOpen ? 0 : 1,
              transition: `opacity ${DOOR_MS * 0.5}ms ease-out`,
            }}
          />

          {/* 進度條 + 百分比（門縫附近） */}
          <div
            className="fixed z-[4] flex w-[min(18rem,calc(100vw-2rem))] flex-col items-center gap-3"
            style={{
              left: "50%",
              top: "50%",
              transform:
                "translate(-50%, calc(-50% + min(10vh, 4rem)))",
              opacity: doorOpen ? 0 : 1,
              transition: "opacity 400ms ease-out",
            }}
          >
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-900/90 shadow-inner ring-1 ring-amber-900/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-900 via-amber-400 to-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                style={{
                  width: `${barPct}%`,
                  transition: "width 120ms linear",
                }}
              />
            </div>
            <p className="font-mono text-sm tabular-nums tracking-[0.2em] text-amber-200/85">
              {barPct >= 100 ? "100" : barPct.toFixed(1)}%
            </p>
            <p className="text-center text-[10px] uppercase tracking-[0.35em] text-zinc-500">
              {phase === "doors"
                ? "門扉開啟"
                : barPct >= 99
                  ? "同步完成"
                  : "連線公會中樞…"}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function markPostLoginEntrance(): void {
  try {
    sessionStorage.setItem(LOGIN_TRIGGER_KEY, "1");
  } catch {
    /* ignore */
  }
}
