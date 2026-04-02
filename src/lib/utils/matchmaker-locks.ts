export interface MatchmakerProfile {
  gender: string | null;
  orientation: string | null;
  birth_year: number | null;
  region: string | null;
  matchmaker_age_mode: string;
  matchmaker_age_older: number;
  matchmaker_age_younger: number;
  matchmaker_region_pref: string;

  diet_type: string | null;
  smoking_habit: string | null;
  accept_smoking: string | null;
  my_pets: string | null;
  accept_pets: string | null;
  has_children: string | null;
  accept_single_parent: string | null;
  fertility_self: string | null;
  fertility_pref: string | null;
  marriage_view: string | null;
  zodiac: string | null;
  exclude_zodiac: string | null;

  v1_money: number | null;
  v3_clingy: number | null;
  v4_conflict: number | null;
}

export interface MatchmakerLockSettings {
  lock_diet: boolean;
  lock_smoking: boolean;
  lock_pets: boolean;
  lock_single_parent: boolean;
  lock_fertility: boolean;
  lock_marriage: boolean;
  lock_zodiac: boolean;
  lock_v1: boolean;
  lock_v3: boolean;
  lock_v4: boolean;
  v_max_diff: number;
}

/** 回傳 true = 可以配對，false = 硬鎖擋下 */
export function checkAllMatchmakerLocks(
  fisher: MatchmakerProfile,
  candidate: MatchmakerProfile,
  settings: MatchmakerLockSettings,
): boolean {
  if (!checkGenderOrientation(fisher, candidate)) return false;
  if (settings.lock_diet && !checkDietLock(fisher, candidate)) return false;
  if (settings.lock_smoking && !checkSmokingLock(fisher, candidate))
    return false;
  if (settings.lock_pets && !checkPetLock(fisher, candidate)) return false;
  if (settings.lock_single_parent && !checkSingleParentLock(fisher, candidate))
    return false;
  if (settings.lock_fertility && !checkFertilityLock(fisher, candidate))
    return false;
  if (settings.lock_marriage && !checkMarriageLock(fisher, candidate))
    return false;
  if (settings.lock_zodiac && !checkZodiacLock(fisher, candidate)) return false;

  const vChecks = [
    { enabled: settings.lock_v1, a: fisher.v1_money, b: candidate.v1_money },
    { enabled: settings.lock_v3, a: fisher.v3_clingy, b: candidate.v3_clingy },
    {
      enabled: settings.lock_v4,
      a: fisher.v4_conflict,
      b: candidate.v4_conflict,
    },
  ];
  for (const v of vChecks) {
    if (v.enabled && v.a !== null && v.b !== null) {
      if (Math.abs(v.a - v.b) > settings.v_max_diff) return false;
    }
  }

  return true;
}

// ── 性別 × 性向（V500 checkGenderOrientation） ──

function checkGenderOrientation(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  const gA = a.gender ?? "",
    gB = b.gender ?? "";
  const oA = a.orientation ?? "",
    oB = b.orientation ?? "";

  if (oA === "雙性戀" || oB === "雙性戀") {
    if (oA === "異性戀") return gA !== gB;
    if (oB === "異性戀") return gA !== gB;
    if (oA === "同性戀") return gA === gB;
    if (oB === "同性戀") return gA === gB;
    return true;
  }
  if (oA === "異性戀") return gA !== gB && oB !== "同性戀";
  return gA === gB && oB !== "異性戀";
}

// ── 飲食習慣（V500 checkDietHardLock） ──

function checkDietLock(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  if (!a.diet_type || !b.diet_type) return true;
  if (a.diet_type === b.diet_type) return true;

  const validate = (me: string, target: string): boolean => {
    if (me === "葷食(無禁忌)")
      return [
        "葷食(無禁忌)",
        "不吃牛",
        "不吃海鮮",
        "葷不排斥素",
      ].includes(target);
    if (me === "不吃牛" || me === "不吃海鮮")
      return [
        "葷食(無禁忌)",
        "葷不排斥素",
        "不吃牛",
        "不吃海鮮",
      ].includes(target);
    if (me === "嚴格素食(蛋奶素/全素)")
      return [
        "嚴格素食(蛋奶素/全素)",
        "方便素/鍋邊素",
        "素不排斥葷",
      ].includes(target);
    if (me === "方便素/鍋邊素")
      return [
        "方便素/鍋邊素",
        "素不排斥葷",
        "嚴格素食(蛋奶素/全素)",
      ].includes(target);
    return true;
  };
  return validate(a.diet_type, b.diet_type) &&
    validate(b.diet_type, a.diet_type);
}

// ── 抽菸習慣（V500 checkSmokingHardLock） ──

function checkSmokingLock(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  if (!a.smoking_habit || !b.smoking_habit) return true;

  const getSTag = (s: string) => {
    if (s === "我不抽菸") return "NONE";
    if (s.includes("電子菸") || s.includes("加熱菸")) return "ELEC";
    if (s.includes("傳統")) return "PAPER";
    return "UNKNOWN";
  };
  const getATag = (acc: string | null) => {
    if (!acc) return "ANY";
    if (acc.includes("絕對無法接受")) return "REJ_ALL";
    if (acc.includes("只要不是傳統")) return "REJ_PAPER";
    return "ANY";
  };
  const validate = (me: MatchmakerProfile, target: MatchmakerProfile) => {
    const ma = getATag(me.accept_smoking);
    const ts = getSTag(target.smoking_habit ?? "");
    if (ma === "REJ_ALL" && ts !== "NONE") return false;
    if (ma === "REJ_PAPER" && ts === "PAPER") return false;
    return true;
  };
  return validate(a, b) && validate(b, a);
}

// ── 寵物（V500 checkPetHardLock） ──

function checkPetLock(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  if (!a.my_pets || !b.my_pets) return true;

  const validate = (me: MatchmakerProfile, target: MatchmakerProfile) => {
    const acc = me.accept_pets ?? "";
    const has = target.my_pets ?? "";
    if (has === "無" || acc.includes("都可以")) return true;
    if (has.includes("貓") && !acc.includes("貓")) return false;
    if (has.includes("狗") && !acc.includes("狗")) return false;
    if (
      (has.includes("爬蟲") || has.includes("蛇") || has.includes("蜥蜴")) &&
      !acc.includes("爬蟲")
    )
      return false;
    if (
      (has.includes("兔") ||
        has.includes("鼠") ||
        has.includes("鳥") ||
        has.includes("魚")) &&
      !acc.includes("小動物")
    )
      return false;
    return true;
  };
  return validate(a, b) && validate(b, a);
}

// ── 單親（V500 checkSingleParentHardLock） ──

function checkSingleParentLock(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  const isAP = (p: MatchmakerProfile) =>
    (p.has_children ?? "").includes("單親");
  const accepts = (p: MatchmakerProfile) =>
    !(p.accept_single_parent ?? "").includes("暫不考慮");

  const aIsP = isAP(a),
    bIsP = isAP(b);
  if (aIsP && bIsP) return accepts(a) && accepts(b);
  if (aIsP) return accepts(b);
  if (bIsP) return accepts(a);
  return true;
}

// ── 生育意願（V500 checkFertilityHardLock） ──

function checkFertilityLock(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  const aOwn = a.fertility_self ?? "",
    bOwn = b.fertility_self ?? "";
  const aPref = a.fertility_pref ?? "",
    bPref = b.fertility_pref ?? "";

  if (aOwn === "不想要小孩" && bPref === "一定要想要小孩") return false;
  if (bOwn === "不想要小孩" && aPref === "一定要想要小孩") return false;
  if (aPref === "一定要不想要小孩" && bOwn === "希望有小孩") return false;
  if (bPref === "一定要不想要小孩" && aOwn === "希望有小孩") return false;
  return true;
}

// ── 婚姻觀念（V500 checkMarriageHardLock） ──

function checkMarriageLock(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  const aNo = (a.marriage_view ?? "").includes("不婚");
  const bNo = (b.marriage_view ?? "").includes("不婚");
  const aYes = (a.marriage_view ?? "").includes("不排斥結婚");
  const bYes = (b.marriage_view ?? "").includes("不排斥結婚");
  if (aNo && bYes) return false;
  if (bNo && aYes) return false;
  return true;
}

// ── 星座排除（V500 checkZodiacHardLock） ──

function checkZodiacLock(
  a: MatchmakerProfile,
  b: MatchmakerProfile,
): boolean {
  const rejects = (me: MatchmakerProfile, target: MatchmakerProfile) => {
    const exc = me.exclude_zodiac ?? "";
    const z = target.zodiac ?? "";
    return exc.includes(z) && !exc.includes("不介意");
  };
  return !rejects(a, b) && !rejects(b, a);
}
