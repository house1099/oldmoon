import { PostLoginEntrance } from "@/components/auth/PostLoginEntrance";
import { AppBadgeUnreadChatSync } from "@/components/shared/app-badge-unread-chat-sync";
import { AppBroadcastChrome } from "@/components/layout/app-broadcast-chrome";
import { FloatingToolbarProvider } from "@/components/layout/FloatingToolbar";
import { Navbar } from "@/components/layout/Navbar";
import { GuildTabProvider } from "@/contexts/guild-tab-context";
import SWRProvider from "@/lib/swr/provider";
import { getMessageLimitsAction } from "@/services/system-settings.action";
import { getActiveBroadcastsAction } from "@/services/rewards.action";

export default async function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ tavernMax }, broadcasts] = await Promise.all([
    getMessageLimitsAction(),
    getActiveBroadcastsAction(),
  ]);
  const initialHasBroadcast = broadcasts.length > 0;
  return (
    <SWRProvider>
      <GuildTabProvider>
        <FloatingToolbarProvider messageMaxLength={tavernMax}>
          <PostLoginEntrance>
            <AppBadgeUnreadChatSync />
            <AppBroadcastChrome initialHasBroadcast={initialHasBroadcast}>
              {children}
            </AppBroadcastChrome>
            <Navbar />
          </PostLoginEntrance>
        </FloatingToolbarProvider>
      </GuildTabProvider>
    </SWRProvider>
  );
}
