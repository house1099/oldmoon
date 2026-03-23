import { z } from "zod";
import { instagramHandleSchema } from "@/lib/validation/instagram-handle";

/** 註冊 Step 1：Email／密碼／IG／邀請碼／條款（Layer 5 與表單對齊） */
export const registerStep1Schema = z.object({
  email: z.string().trim().email({ message: "請輸入有效的 Email" }),
  password: z
    .string()
    .min(6, "密碼至少 6 字元")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)/,
      "密碼需同時包含英文與數字",
    ),
  instagram: instagramHandleSchema,
  inviteCode: z.string().trim().optional(),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: "請同意冒險者公會使用條款",
  }),
});

export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;
