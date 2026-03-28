import { AppShellMotion } from "@/components/layout/app-shell-motion";
import { FloatingToolbarProvider } from "@/components/layout/FloatingToolbar";
import { Navbar } from "@/components/layout/Navbar";
import { TavernMarquee } from "@/components/tavern/TavernMarquee";
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
          <TavernMarquee />
          <AppShellMotion>{children}</AppShellMotion>
          <Navbar />
        </FloatingToolbarProvider>
      </GuildTabProvider>
    </SWRProvider>
  );
}
