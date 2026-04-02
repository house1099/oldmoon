'use server';

import { unstable_cache } from 'next/cache';
import { findSystemSettingByKey } from '@/lib/repositories/server/invitation.repository';

export interface PublicAppSettings {
  matchmaker_age_max: number;
  matchmaker_v_max_diff: number;
  matchmaker_height_tall_threshold: number;
  matchmaker_height_short_threshold: number;

  tavern_message_max_length: number;
  mood_max_length: number;
  chat_message_max_length: number;
  broadcast_message_max_length: number;

  inventory_max_slots: number;
  bag_expansion_slots_per_use: number;

  interests_max_select: number;
  skills_max_select: number;

  market_max_listings_per_user: number;
  market_listing_days: number;
  market_tax_rate: number;

  nickname_max_length: number;
  bio_field_max_length: number;
}

export const DEFAULT_SETTINGS: PublicAppSettings = {
  matchmaker_age_max: 30,
  matchmaker_v_max_diff: 2,
  matchmaker_height_tall_threshold: 175,
  matchmaker_height_short_threshold: 163,
  tavern_message_max_length: 50,
  mood_max_length: 50,
  chat_message_max_length: 500,
  broadcast_message_max_length: 50,
  inventory_max_slots: 48,
  bag_expansion_slots_per_use: 4,
  interests_max_select: 12,
  skills_max_select: 8,
  market_max_listings_per_user: 5,
  market_listing_days: 7,
  market_tax_rate: 0,
  nickname_max_length: 32,
  bio_field_max_length: 200,
};

export const getPublicAppSettingsAction = unstable_cache(
  async (): Promise<PublicAppSettings> => {
    const keys = Object.keys(DEFAULT_SETTINGS) as (keyof PublicAppSettings)[];

    const entries = await Promise.all(
      keys.map(async (key) => {
        const val = await findSystemSettingByKey(key);
        const num = val !== null ? Number(val) : NaN;
        return [key, isNaN(num) ? DEFAULT_SETTINGS[key] : num] as const;
      }),
    );
    return Object.fromEntries(entries) as unknown as PublicAppSettings;
  },
  ['public-app-settings'],
  { revalidate: 60, tags: ['system_settings'] },
);
