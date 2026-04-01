"use server";

import { unstable_cache } from "next/cache";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import { resolveTavernMessageMaxLength } from "@/lib/utils/tavern-message-limit";

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

const DEFAULT_MESSAGE_MAX = 50;

async function loadMessageLimits(): Promise<{
  tavernMax: number;
  moodMax: number;
}> {
  const [tavernRaw, moodRaw] = await Promise.all([
    findSystemSettingByKey("tavern_message_max_length"),
    findSystemSettingByKey("mood_max_length"),
  ]);
  return {
    tavernMax: resolveTavernMessageMaxLength(tavernRaw),
    moodMax: parseLimit(moodRaw, DEFAULT_MESSAGE_MAX),
  };
}

const getCachedMessageLimits = unstable_cache(
  loadMessageLimits,
  ["system-settings-message-limits"],
  { revalidate: 60, tags: ["system_settings"] },
);

/** 酒館訊息／今日心情字數上限；快取 60s，tag **`system_settings`**。 */
export async function getMessageLimitsAction(): Promise<{
  tavernMax: number;
  moodMax: number;
}> {
  return getCachedMessageLimits();
}

const DEFAULT_MARQUEE_SPEED = 10;
const DEFAULT_MARQUEE_EFFECT = "glow";

async function loadMarqueeSettings(): Promise<{
  speedSeconds: number;
  broadcastEffect: string;
}> {
  const [speedRaw, effectRaw] = await Promise.all([
    findSystemSettingByKey("marquee_speed_seconds"),
    findSystemSettingByKey("marquee_broadcast_effect"),
  ]);
  const speedParsed = parseInt((speedRaw ?? "").trim(), 10);
  const speedSeconds =
    Number.isFinite(speedParsed) && speedParsed >= 1 && speedParsed <= 300
      ? speedParsed
      : DEFAULT_MARQUEE_SPEED;
  const broadcastEffect = (effectRaw ?? DEFAULT_MARQUEE_EFFECT).trim() || DEFAULT_MARQUEE_EFFECT;
  return { speedSeconds, broadcastEffect };
}

const getCachedMarqueeSettings = unstable_cache(
  loadMarqueeSettings,
  ["system-settings-marquee-v1"],
  { revalidate: 60, tags: ["system_settings"] },
);

/** 跑馬燈／廣播輪播間隔與特效；快取 60s，tag **`system_settings`**。 */
export async function getMarqueeSettingsAction(): Promise<{
  speedSeconds: number;
  broadcastEffect: string;
}> {
  return getCachedMarqueeSettings();
}

const DEFAULT_TAVERN_MODE = "scroll";
const DEFAULT_TAVERN_SPEED = 20;
const DEFAULT_BROADCAST_STYLE = "glow";
const DEFAULT_BROADCAST_SPEED = 10;

function parseSpeed(raw: string | null, fallback: number): number {
  const n = parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(300, n);
}

async function loadMarqueeAndBroadcastSettings(): Promise<{
  marquee: { mode: string; speed: number };
  broadcast: { style: string; speed: number };
}> {
  const [modeRaw, tavernSpeedRaw, styleRaw, broadcastSpeedRaw] =
    await Promise.all([
      findSystemSettingByKey("tavern_marquee_mode"),
      findSystemSettingByKey("tavern_marquee_speed"),
      findSystemSettingByKey("broadcast_style"),
      findSystemSettingByKey("broadcast_speed"),
    ]);

  const mode = (modeRaw ?? DEFAULT_TAVERN_MODE).trim() || DEFAULT_TAVERN_MODE;
  const tavernSpeed = parseSpeed(tavernSpeedRaw, DEFAULT_TAVERN_SPEED);

  const style =
    (styleRaw ?? DEFAULT_BROADCAST_STYLE).trim() || DEFAULT_BROADCAST_STYLE;
  const broadcastSpeed = parseSpeed(
    broadcastSpeedRaw,
    DEFAULT_BROADCAST_SPEED,
  );

  return {
    marquee: { mode, speed: tavernSpeed },
    broadcast: { style, speed: broadcastSpeed },
  };
}

const getCachedMarqueeAndBroadcastSettings = unstable_cache(
  loadMarqueeAndBroadcastSettings,
  ["system-settings-marquee-broadcast-v1"],
  { revalidate: 60, tags: ["system_settings"] },
);

/**
 * 酒館跑馬燈（mode／speed）與廣播橫幅（style／speed）；快取 60s，tag **`system_settings`**。
 */
export async function getMarqueeAndBroadcastSettingsAction(): Promise<{
  marquee: { mode: string; speed: number };
  broadcast: { style: string; speed: number };
}> {
  return getCachedMarqueeAndBroadcastSettings();
}

/** 月老年齡差距上限（`system_settings.matchmaker_age_max`） */
export async function getMatchmakerAgeMaxAction(): Promise<number> {
  const raw = await findSystemSettingByKey("matchmaker_age_max");
  const n = parseInt((raw ?? "30").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 30;
  return n;
}
