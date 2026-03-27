import { AppShellMotion } from "@/components/layout/app-shell-motion";
import { Navbar } from "@/components/layout/Navbar";
import { TavernFab } from "@/components/tavern/TavernFab";
import { TavernMarquee } from "@/components/tavern/TavernMarquee";
import { EquipmentFab } from "@/components/ui/EquipmentFab";
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
        <TavernMarquee />
        <AppShellMotion>{children}</AppShellMotion>
        <Navbar />
        <EquipmentFab />
        <TavernFab messageMaxLength={tavernMax} />
      </GuildTabProvider>
    </SWRProvider>
  );
}
