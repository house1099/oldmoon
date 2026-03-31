export const SWR_KEYS = {
  profile: 'my-profile',
  myStreak: 'myStreak',
  streakRewardSettings: 'streakRewardSettings',
  villageUsers: 'village-users',
  marketUsers: (query: string) => `market-users-${query}`,
  myAlliances: 'my-alliances',
  pendingAlliances: 'pending-alliances',
  conversations: 'conversations',
  messages: (conversationId: string) => `messages-${conversationId}`,
  unreadNotifications: 'unread-notifications',
  /** 至少一則對話有「對方未讀訊息」的對話數 */
  unreadChatConversations: 'unread-chat-conversations',
  notifications: 'notifications',
  tavernMessages: 'tavern-messages',
  myMarketListings: 'my-market-listings',
  marketRecentSold: 'market-recent-sold',
} as const
