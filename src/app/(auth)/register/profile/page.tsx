import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

function hasInstagramInMetadata(meta: unknown): boolean {
  const m = meta as Record<string, unknown> | undefined;
  const v = m?.instagram_handle;
  return typeof v === "string" && v.trim().length > 0;
}

export default async function RegisterProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsProfileInstagram =
    !user || !hasInstagramInMetadata(user.user_metadata);

  return <ProfileForm needsProfileInstagram={needsProfileInstagram} />;
}
