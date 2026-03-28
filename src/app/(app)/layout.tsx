import { AppBroadcastChrome } from "@/components/layout/app-broadcast-chrome";
import { FloatingToolbarProvider } from "@/components/layout/FloatingToolbar";
import { Navbar } from "@/components/layout/Navbar";
import { GuildTabProvider } from "@/contexts/guild-tab-context";
import SWRProvider from "@/lib/swr/provider";
import { getMessageLimitsAction } from "@/services/system-settings.action";

export default async function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { tavernMax } = await getMessageLimitsAction();
  return (
    <SWRProvider>
      <GuildTabProvider>
        <FloatingToolbarProvider messageMaxLength={tavernMax}>
          <AppBroadcastChrome>{children}</AppBroadcastChrome>
          <Navbar />
        </FloatingToolbarProvider>
      </GuildTabProvider>
    </SWRProvider>
  );
}
