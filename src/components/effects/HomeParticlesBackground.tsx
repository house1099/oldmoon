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
  return {
    ...base,
    fullScreen: {
      ...prevFull,
      enable: false,
      zIndex: 0,
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
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-full min-h-[100dvh]"
      options={options}
    />
  );
}
