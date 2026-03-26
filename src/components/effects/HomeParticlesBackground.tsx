"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { loadEmittersPlugin } from "@tsparticles/plugin-emitters";
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
    /** 讓 AppShell 紫黑漸層透出；粒子與圖片仍照常繪製 */
    background: {
      ...prevBg,
      color: {
        ...prevBgColor,
        value: "transparent",
      },
    },
  } as ISourceOptions;
}

export function HomeParticlesBackground() {
  const [engineReady, setEngineReady] = useState(false);
  const [options, setOptions] = useState<ISourceOptions | null>(null);

  useEffect(() => {
    void initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      await loadEmittersPlugin(engine);
      /**
       * v3.0.3 無 `loadExternalImageShape`／`loadShapes` 此名稱；
       * `loadImageShape` 會註冊 `image`／`images`、掛載 `engine.loadImage`，
       * 可載入配方內遠端圖（如 particles.js.org）。
       */
      await loadImageShape(engine);
    }).then(() => setEngineReady(true));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(PARTICLES_JSON_URL, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`particles.json ${res.status}`);
        }
        const data: unknown = await res.json();
        if (!cancelled) {
          setOptions(normalizeParticleOptions(data));
        }
      } catch {
        if (!cancelled) {
          setOptions(
            normalizeParticleOptions(fallbackOptions as unknown),
          );
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
      id="tsparticles-home"
      className="pointer-events-none fixed inset-0 z-[1] h-full min-h-[100dvh] w-full max-w-none"
      style={{ width: "100%", height: "100%" }}
      options={options}
    />
  );
}
