// ─── 性向匹配判斷 ───
// 回傳 true = 這個人應該出現在我的列表
export function isOrientationMatch(
  myGender: string,
  myOrientation: string,
  theirGender: string,
  theirOrientation: string,
): boolean {
  const iCanSeeThem = canSee(myGender, myOrientation, theirGender);
  const theyCanSeeMe = canSee(theirGender, theirOrientation, myGender);
  return iCanSeeThem && theyCanSeeMe;
}

function canSee(
  myGender: string,
  myOrientation: string,
  theirGender: string,
): boolean {
  if (myOrientation === "pansexual") return true;
  if (myOrientation === "heterosexual") {
    return myGender === "male"
      ? theirGender === "female"
      : theirGender === "male";
  }
  if (myOrientation === "homosexual") {
    return myGender === theirGender;
  }
  return true;
}

// ─── 興趣重合分數 ───
export function calcInterestScore(
  myInterests: string[],
  theirInterests: string[],
): number {
  if (!myInterests?.length || !theirInterests?.length) return 0;
  const mySet = new Set(myInterests);
  return theirInterests.filter((t) => mySet.has(t)).length;
}

// ─── 技能互補分數 ───
export function calcSkillScore(
  myWant: string[],
  myOffer: string[],
  theirOffer: string[],
  theirWant: string[],
): { complementScore: number; similarScore: number } {
  const myWantSet = new Set(myWant ?? []);
  const myOfferSet = new Set(myOffer ?? []);
  const theirOfferSet = new Set(theirOffer ?? []);
  const theirWantSet = new Set(theirWant ?? []);

  const complementScore =
    Array.from(myWantSet).filter((t) => theirOfferSet.has(t)).length +
    Array.from(theirWantSet).filter((t) => myOfferSet.has(t)).length;

  const similarScore = Array.from(myOfferSet).filter((t) =>
    theirOfferSet.has(t),
  ).length;

  return { complementScore, similarScore };
}

/** 雙向互補技能總數（同 {@link calcSkillScore} 的 `complementScore`）。 */
export function countComplementarySkills(
  myWant: string[],
  myOffer: string[],
  theirOffer: string[],
  theirWant: string[],
): number {
  return calcSkillScore(myWant, myOffer, theirOffer, theirWant).complementScore;
}
