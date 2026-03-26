'use client'

import useSWR from 'swr'
import { SWR_KEYS } from '@/lib/swr/keys'
import {
  getMessagesAction,
  getMyConversationsAction,
  getUnreadChatConversationsCountAction,
} from '@/services/chat.action'
import { getUnreadNotificationCountAction } from '@/services/notification.action'

export function useConversations() {
  const { data, isLoading, mutate } = useSWR(
    SWR_KEYS.conversations,
    () => getMyConversationsAction(),
    { revalidateOnFocus: false },
  )

  return {
    conversations: data ?? [],
    isLoading,
    mutate,
  }
}

export function useMessages(conversationId: string | null) {
  const { data, isLoading, mutate } = useSWR(
    conversationId ? SWR_KEYS.messages(conversationId) : null,
    () => getMessagesAction(conversationId!),
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  )

  return {
    messages: data?.messages ?? [],
    isLoading,
    mutate,
  }
}

export function useUnreadNotificationCount() {
  const { data, mutate, isLoading } = useSWR(
    SWR_KEYS.unreadNotifications,
    () => getUnreadNotificationCountAction(),
    {
      revalidateOnFocus: true,
      refreshInterval: 30_000,
    },
  )

  return { count: data ?? 0, mutate, isLoading }
}

export function useUnreadChatConversationsCount() {
  const { data, mutate, isLoading } = useSWR(
    SWR_KEYS.unreadChatConversations,
    () => getUnreadChatConversationsCountAction(),
    {
      revalidateOnFocus: true,
      refreshInterval: 30_000,
    },
  )

  return { count: data ?? 0, mutate, isLoading }
}

/** 未讀私訊「對話」數（至少一則對方發送且未讀）；等同 {@link useUnreadChatConversationsCount}。 */
export const useUnreadChatCount = useUnreadChatConversationsCount
