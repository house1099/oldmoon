export const SWR_KEYS = {
  profile: 'my-profile',
  villageUsers: 'village-users',
  marketUsers: (query: string) => `market-users-${query}`,
  myAlliances: 'my-alliances',
  pendingAlliances: 'pending-alliances',
  conversations: 'conversations',
  messages: (conversationId: string) => `messages-${conversationId}`,
  unreadNotifications: 'unread-notifications',
  notifications: 'notifications',
} as const
