"use server";

import { unstable_cache } from "next/cache";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";

const DEFAULT_INTERESTS_MAX = 12;
const DEFAULT_SKILLS_MAX = 8;

function parseLimit(raw: string | null, fallback: number): number {
  const n = parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

async function loadTagLimits(): Promise<{
  interestsMax: number;
  skillsMax: number;
}> {
  const [interestsRaw, skillsRaw] = await Promise.all([
    findSystemSettingByKey("interests_max_select"),
    findSystemSettingByKey("skills_max_select"),
  ]);
  return {
    interestsMax: parseLimit(interestsRaw, DEFAULT_INTERESTS_MAX),
    skillsMax: parseLimit(skillsRaw, DEFAULT_SKILLS_MAX),
  };
}

const getCachedTagLimits = unstable_cache(loadTagLimits, ["system-settings-tag-limits"], {
  revalidate: 60,
  tags: ["system_settings"],
});

/** SSR／註冊與編輯標籤用；快取 60s，更新 system_settings 後請 `revalidateTag('system_settings')`。 */
export async function getTagLimitsAction(): Promise<{
  interestsMax: number;
  skillsMax: number;
}> {
  return getCachedTagLimits();
}
