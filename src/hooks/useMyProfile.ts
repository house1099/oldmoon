'use client'

import useSWR from 'swr'
import { SWR_KEYS } from '@/lib/swr/keys'
import { getMyProfileAction } from '@/services/profile.action'

export function useMyProfile() {
  const { data, isLoading, mutate } = useSWR(
    SWR_KEYS.profile,
    () => getMyProfileAction(),
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
    },
  )

  return {
    profile: data ?? null,
    isLoading,
    mutate,
  }
}
