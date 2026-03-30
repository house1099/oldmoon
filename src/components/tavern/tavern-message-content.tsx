"use client";

import type { ReactNode } from "react";
import type { TavernMessageDto } from "@/types/database.types";

/** 以目前訊息串出現過的暱稱對應 user_id（同暱稱則後蓋前） */
export function buildTavernNicknameToUserId(
  messages: TavernMessageDto[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of messages) {
    const n = row.user.nickname?.trim();
    if (n) map.set(n, row.user_id);
  }
  return map;
}

export function renderTavernMessageText(
  text: string,
  nicknameToId: Map<string, string>,
  onMentionClick: (userId: string) => void,
): ReactNode {
  const re = /@([^\s@]+)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    const nick = m[1]!;
    const start = m.index;
    if (start > last) {
      parts.push(<span key={`t-${k++}`}>{text.slice(last, start)}</span>);
    }
    const uid = nicknameToId.get(nick);
    if (uid) {
      parts.push(
        <button
          key={`m-${k++}`}
          type="button"
          className="inline max-w-full break-all font-semibold text-amber-300/95 underline-offset-2 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onMentionClick(uid);
          }}
        >
          @{nick}
        </button>,
      );
    } else {
      parts.push(<span key={`u-${k++}`}>@{nick}</span>);
    }
    last = start + m[0].length;
  }
  if (last < text.length) {
    parts.push(<span key={`e-${k++}`}>{text.slice(last)}</span>);
  }
  return parts.length > 0 ? parts : text;
}
