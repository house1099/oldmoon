"use client";

import { useEffect } from "react";
import { useUnreadChatCount } from "@/hooks/useChat";
import { setPwaAppBadgeFromUnreadChatCount } from "@/lib/utils/app-badge";

/**
 * 依 **未讀私訊對話數**（與公會「聊天」紅點同源）同步 PWA 圖示角標。
 * 掛在具 SWR 的 (app) layout；離開該 shell 時清除角標。
 */
export function AppBadgeUnreadChatSync() {
  const { count } = useUnreadChatCount();

  useEffect(() => {
    void setPwaAppBadgeFromUnreadChatCount(count);
  }, [count]);

  useEffect(() => {
    return () => {
      void setPwaAppBadgeFromUnreadChatCount(0);
    };
  }, []);

  return null;
}
