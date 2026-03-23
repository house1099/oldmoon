import { z } from "zod";

/** 與註冊 Step1／Profile 補填一致：必填、不可含空白 */
export const instagramHandleSchema = z
  .string()
  .trim()
  .min(1, "請填寫 IG 帳號")
  .refine((s) => !/\s/.test(s), { message: "IG 帳號不可含有空白" });
