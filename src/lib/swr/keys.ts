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
  myProfileChangeRequest: 'my-profile-change-request',
  profileBannerSettings: 'profile-banner-settings',
  /** 釣魚：釣竿／釣餌持有狀態 */
  fishingStatus: 'fishing-status',
  /** 釣魚日誌（月老魚／釣獲物列表） */
  fishingLogs: 'fishing-logs',
} as const
