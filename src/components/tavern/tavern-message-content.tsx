"use client";

import type { ReactNode } from "react";
import {
  buildTavernNicknameToUserId,
  createTavernMentionNickRegex,
} from "@/lib/utils/tavern-mentions";

export { buildTavernNicknameToUserId };

export function renderTavernMessageText(
  text: string,
  nicknameToId: Map<string, string>,
  onMentionClick: (userId: string) => void,
): ReactNode {
  const re = createTavernMentionNickRegex();
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
