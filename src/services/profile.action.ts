'use server'

import { createClient } from '@/lib/supabase/server'
import { getCachedProfile } from '@/lib/supabase/get-cached-profile'

export async function getMyProfileAction() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return getCachedProfile(user.id)
}
