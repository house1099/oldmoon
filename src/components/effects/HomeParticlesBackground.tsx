"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { loadEmittersPlugin } from "@tsparticles/plugin-emitters";
import { loadImageShape } from "@tsparticles/shape-image";

import homeParticlesOptions from "@/config/home-particles.json";

export function HomeParticlesBackground() {
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    void initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      await loadEmittersPlugin(engine);
      await loadImageShape(engine);
    }).then(() => setEngineReady(true));
  }, []);

  const options = useMemo<ISourceOptions>(() => {
    const base = homeParticlesOptions as unknown as ISourceOptions;
    return {
      ...base,
      fullScreen: {
        ...(typeof base.fullScreen === "object" && base.fullScreen
          ? base.fullScreen
          : {}),
        enable: false,
        zIndex: 0,
      },
    };
  }, []);

  if (!engineReady) {
    return null;
  }

  return (
    <Particles
      id="tsparticles-home"
      className="pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full"
      options={options}
    />
  );
}
