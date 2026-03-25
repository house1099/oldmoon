export const SWR_KEYS = {
  profile: 'my-profile',
  villageUsers: 'village-users',
  marketUsers: (query: string) => `market-users-${query}`,
  myAlliances: 'my-alliances',
  pendingAlliances: 'pending-alliances',
} as const
