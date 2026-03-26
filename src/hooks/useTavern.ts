"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { SWR_KEYS } from "@/lib/swr/keys";
import { getTavernMessagesAction } from "@/services/tavern.action";

export function useTavern() {
  const { data, isLoading, mutate } = useSWR(
    SWR_KEYS.tavernMessages,
    () => getTavernMessagesAction(),
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;

      channel = supabase
        .channel("tavern_messages_inserts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "tavern_messages",
          },
          () => {
            void mutate();
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [mutate]);

  return {
    messages: data ?? [],
    isLoading,
    mutate,
  };
}
