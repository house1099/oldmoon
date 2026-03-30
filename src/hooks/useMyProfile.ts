'use client'

import useSWR from 'swr'
import type { UserRow } from '@/lib/repositories/server/user.repository'
import { SWR_KEYS } from '@/lib/swr/keys'
import { getMyProfileAction } from '@/services/profile.action'

export type UseMyProfileOptions = {
  fallbackData?: UserRow
  revalidateOnMount?: boolean
  revalidateIfStale?: boolean
  revalidateOnFocus?: boolean
}

export function useMyProfile(options?: UseMyProfileOptions) {
  const { data, isLoading, mutate } = useSWR(
    SWR_KEYS.profile,
    () => getMyProfileAction(),
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateOnMount: options?.revalidateOnMount ?? true,
      revalidateIfStale: options?.revalidateIfStale,
      ...(options?.fallbackData !== undefined
        ? { fallbackData: options.fallbackData }
        : {}),
    },
  )

  return {
    profile: data ?? null,
    isLoading,
    mutate,
  }
}
