"use client";

import { useEffect, useId, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadFull } from "tsparticles";
import { loadImageShape } from "@tsparticles/shape-image";

import fallbackOptions from "@/config/home-particles.json";

const PARTICLES_JSON_URL = "/particles.json";

function normalizeParticleOptions(raw: unknown): ISourceOptions {
  const base = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const prevFull =
    typeof base.fullScreen === "object" && base.fullScreen !== null
      ? (base.fullScreen as Record<string, unknown>)
      : {};
  const prevBg =
    typeof base.background === "object" && base.background !== null
      ? (base.background as Record<string, unknown>)
      : {};
  const prevBgColor =
    typeof prevBg.color === "object" && prevBg.color !== null
      ? (prevBg.color as Record<string, unknown>)
      : {};

  return {
    ...base,
    fullScreen: {
      ...prevFull,
      enable: false,
      zIndex: 0,
    },
    background: {
      ...prevBg,
      color: {
        ...prevBgColor,
        value: "transparent",
      },
    },
  } as ISourceOptions;
}

/** 避免無效 JSON／結構錯誤打爆首頁 */
function tryNormalizeOptions(raw: unknown): ISourceOptions | null {
  try {
    return normalizeParticleOptions(raw);
  } catch (e) {
    console.error("HomeParticlesBackground: invalid particle options", e);
    return null;
  }
}

export function HomeParticlesBackground() {
  const instanceId = useId().replace(/:/g, "");
  const particlesDomId = `tsparticles-home-${instanceId}`;

  const [engineReady, setEngineReady] = useState(false);
  const [options, setOptions] = useState<ISourceOptions | null>(null);

  useEffect(() => {
    void initParticlesEngine(async (engine) => {
      /** 完整 bundle（內含 slim、emitters、多數 updater）；圖片形狀需另載 */
      await loadFull(engine);
      await loadImageShape(engine);
    })
      .then(() => {
        setEngineReady(true);
      })
      .catch((e: unknown) => {
        console.error("HomeParticlesBackground: initParticlesEngine failed", e);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(PARTICLES_JSON_URL, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`particles.json ${res.status}`);
        }
        const text = await res.text();
        let data: unknown;
        try {
          data = JSON.parse(text) as unknown;
        } catch (parseErr) {
          console.error("HomeParticlesBackground: particles.json is not valid JSON", parseErr);
          throw parseErr;
        }
        if (typeof data !== "object" || data === null) {
          throw new Error("particles.json root must be an object");
        }
        const normalized = tryNormalizeOptions(data);
        if (!cancelled) {
          if (normalized) {
            setOptions(normalized);
          } else {
            const fb = tryNormalizeOptions(fallbackOptions as unknown);
            setOptions(fb);
          }
        }
      } catch (e) {
        console.error("HomeParticlesBackground: fetch particles failed, using fallback", e);
        if (!cancelled) {
          const fb = tryNormalizeOptions(fallbackOptions as unknown);
          setOptions(fb);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!engineReady || !options) {
    return null;
  }

  return (
    <Particles
      id={particlesDomId}
      className="pointer-events-none fixed inset-0 z-[1] h-full min-h-[100dvh] w-full max-w-none"
      style={{ width: "100%", height: "100%" }}
      options={options}
    />
  );
}
