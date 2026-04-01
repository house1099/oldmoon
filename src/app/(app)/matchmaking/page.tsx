"use client";

import { FishingPanel } from "@/components/matchmaking/fishing-panel";
import { LikesListPanel } from "@/components/matchmaking/likes-list-panel";
import { MatchmakerSettingsTab } from "@/components/matchmaking/matchmaker-settings-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MatchmakingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-xl">
        <h1 className="mb-3 text-center text-base font-bold text-white">月老</h1>
      </div>

      <div className="px-4 pt-4">
        <Tabs defaultValue="fish" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1 rounded-full bg-zinc-900/60 p-1">
            <TabsTrigger
              value="fish"
              className="rounded-full text-xs data-[state=active]:bg-white/15 data-[state=active]:text-white"
            >
              🎣 月老魚池
            </TabsTrigger>
            <TabsTrigger
              value="likes"
              className="rounded-full text-xs data-[state=active]:bg-white/15 data-[state=active]:text-white"
            >
              💖 緣分列表
            </TabsTrigger>
            <TabsTrigger
              value="prefs"
              className="rounded-full text-xs data-[state=active]:bg-white/15 data-[state=active]:text-white"
            >
              ⚙️ 配對設定
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fish" className="mt-6 outline-none">
            <FishingPanel />
          </TabsContent>
          <TabsContent value="likes" className="mt-6 outline-none">
            <LikesListPanel />
          </TabsContent>
          <TabsContent value="prefs" className="mt-6 outline-none">
            <MatchmakerSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
