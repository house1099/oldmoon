'use client';

import useSWR from 'swr';
import {
  getPublicAppSettingsAction,
  DEFAULT_SETTINGS,
} from '@/services/public-settings.action';
import type { PublicAppSettings } from '@/services/public-settings.action';

export type { PublicAppSettings };

export function useAppSettings() {
  const { data, isLoading } = useSWR(
    'public-app-settings',
    getPublicAppSettingsAction,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
      fallbackData: DEFAULT_SETTINGS,
    },
  );

  return {
    settings: data ?? DEFAULT_SETTINGS,
    isLoading,
  };
}
