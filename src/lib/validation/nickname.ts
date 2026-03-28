import { z } from "zod";
import { FORBIDDEN_WORDS } from "@/lib/utils/forbidden-words";

/** Step 2 暱稱與 Layer 3 建檔共用（含不雅字過濾） */
export const adventurerNicknameSchema = z
  .string()
  .trim()
  .min(1, "請填寫暱稱")
  .max(32, "暱稱最多 32 字")
  .refine(
    (v) =>
      !FORBIDDEN_WORDS.some((w) =>
        v.toLowerCase().includes(w.toLowerCase()),
      ),
    { message: "暱稱含有不當用語，請換一個稱呼" },
  );

/** 與 adventurerNicknameSchema 相同，供改名卡等情境語意化引用 */
export const nicknameSchema = adventurerNicknameSchema;
