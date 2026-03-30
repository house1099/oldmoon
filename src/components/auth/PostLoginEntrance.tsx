"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { postLoginBootstrapAction } from "@/services/auth-bootstrap.action";

/** 與 `public/images/splash.png`（品牌開場圖）對應 */
export const GUILD_ENTRANCE_SPLASH_PATH = "/images/splash.png";

const LOGIN_TRIGGER_KEY = "guild_post_login_entrance";
const SPLASH_SESSION_KEY = "guild_app_splash_done_v1";

const WINDOW_LOAD_TIMEOUT_MS = 12_000;
const DOOR_MS = 1800;
const HOLD_AT_100_MS = 520;
const SPLASH_IMAGE_WAIT_MS = 2800;

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

function rampGoalLinear(
  from: number,
  to: number,
  durationMs: number,
  setGoalCap: (n: number) => void,
  isCancelled: () => boolean,
): Promise<void> {
  if (durationMs <= 0) {
    setGoalCap(to);
    return Promise.resolve();
  }
  const t0 = performance.now();
  return new Promise((resolve) => {
    function tick(now: number) {
      if (isCancelled()) {
        resolve();
        return;
      }
      const u = Math.min(1, (now - t0) / durationMs);
      setGoalCap(from + (to - from) * u);
      if (u >= 1) {
        setGoalCap(to);
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

type Phase = "idle" | "sync" | "doors";
type Gate = "blocking" | "splash" | "off";

/**
 * 公會開場儀式：先全黑覆蓋（避免首屏閃內容）→ 預載圖 → 上下門圖檔 + 平滑進度條 → 開門。
 */
export function PostLoginEntrance({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("blocking");
  const [phase, setPhase] = useState<Phase>("idle");
  const [smoothPct, setSmoothPct] = useState(0);
  const goalRef = useRef(0);
  const splashTicketRef = useRef(0);
  const sequenceTicketRef = useRef(0);

  const animatingProgress =
    gate === "splash" && (phase === "sync" || phase === "doors");

  useEffect(() => {
    if (!animatingProgress && goalRef.current === 0) return;
    let raf = 0;
    const loop = () => {
      setSmoothPct((prev) => {
        const g = goalRef.current;
        if (g <= prev + 0.04) return g;
        const step = Math.max(0.1, (g - prev) * 0.16);
        return Math.min(prev + step, g);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animatingProgress]);

  useLayoutEffect(() => {
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
    if (splashDone && !fromLogin) {
      setGate("off");
      return;
    }

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

    const ticket = ++splashTicketRef.current;
    let settled = false;
    const finishBlocking = () => {
      if (settled || splashTicketRef.current !== ticket) return;
      settled = true;
      goalRef.current = 0;
      setSmoothPct(0);
      setPhase("sync");
      setGate("splash");
    };

    const img = new Image();
    const timer = window.setTimeout(finishBlocking, SPLASH_IMAGE_WAIT_MS);
    img.onload = () => {
      window.clearTimeout(timer);
      finishBlocking();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finishBlocking();
    };
    img.src = GUILD_ENTRANCE_SPLASH_PATH;
  }, []);

  useEffect(() => {
    if (gate !== "splash" || phase !== "sync") return;

    const seq = ++sequenceTicketRef.current;
    let cancelled = false;
    const isCancelled = () =>
      cancelled || sequenceTicketRef.current !== seq;

    const setGoal = (n: number) => {
      if (!isCancelled()) goalRef.current = Math.max(goalRef.current, n);
    };

    void (async () => {
      goalRef.current = 0;
      setSmoothPct(0);
      setGoal(4);

      await postLoginBootstrapAction().catch(() => {});
      if (isCancelled()) return;
      setGoal(22);

      await router.refresh();
      if (isCancelled()) return;
      setGoal(40);

      await waitUntilVisualReady();
      if (isCancelled()) return;
      setGoal(58);

      const from = goalRef.current;
      await rampGoalLinear(from, 100, 2400, setGoal, isCancelled);
      if (isCancelled()) return;

      await new Promise((r) => setTimeout(r, HOLD_AT_100_MS));
      if (isCancelled()) return;

      setPhase("doors");
      await new Promise((r) => setTimeout(r, DOOR_MS + 120));
      if (isCancelled()) return;

      try {
        sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("idle");
      setGate("off");
      goalRef.current = 0;
      setSmoothPct(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [gate, phase, router]);

  const doorOpen = phase === "doors";
  const showBlackOnly = gate === "blocking";
  const showSplashUi = gate === "splash";
  const barPct = Math.min(100, Math.round(smoothPct * 10) / 10);

  return (
    <>
      {children}
      {gate !== "off" ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[10000] bg-black"
          aria-live="polite"
          aria-busy={showSplashUi && phase === "sync"}
          aria-label={
            showBlackOnly
              ? "載入中"
              : phase === "sync"
                ? "公會營地載入中"
                : "進入公會"
          }
        >
          {showSplashUi ? (
            <>
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

              <div
                className="pointer-events-none fixed inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.25)_55%,rgba(0,0,0,0.65)_100%)]"
                style={{
                  opacity: doorOpen ? 0 : 1,
                  transition: `opacity ${DOOR_MS * 0.5}ms ease-out`,
                }}
              />

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
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <p className="font-mono text-sm tabular-nums tracking-[0.2em] text-amber-200/85">
                  {barPct >= 100 ? "100.0" : barPct.toFixed(1)}%
                </p>
                <p className="text-center text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                  {phase === "doors"
                    ? "門扉開啟"
                    : barPct >= 99.5
                      ? "同步完成"
                      : "連線公會中樞…"}
                </p>
              </div>
            </>
          ) : null}
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
