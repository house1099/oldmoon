/** 收件者信件：同批次多件（商城贈禮／背包批次／血盟批次）共用文案。 */
export function formatGiftBatchMailboxMessage(
  senderNickname: string,
  itemLabels: string[],
): string {
  const n = itemLabels.length;
  const normalized = itemLabels.map((l) => l.trim() || "道具");
  const labelList = Array.from(new Set(normalized));
  const singleLabel = labelList[0] ?? "道具";
  if (labelList.length === 1) {
    return n === 1
      ? `🎁 ${senderNickname} 送給你一個「${singleLabel}」！已放入你的背包。`
      : `🎁 ${senderNickname} 送給你 ${n} 個「${singleLabel}」！已放入你的背包。`;
  }
  return `🎁 ${senderNickname} 送給你 ${n} 件道具！已放入你的背包。`;
}
