"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import TermsModal from "@/components/auth/TermsModal";
import { RegistrationStepIndicator } from "@/components/auth/registration-step-indicator";
import { guildAuthPrimaryButtonClass } from "@/components/auth/auth-styles";
import LoadingButton from "@/components/ui/LoadingButton";
import {
  Eye,
  EyeOff,
  Hash,
  Instagram,
  Lock,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerStep1Schema } from "@/lib/validation/register-step1";
import { friendlyAuthErrorMessage } from "@/lib/utils/auth-errors";
import { validateInvitationCodeAction } from "@/services/invitation.action";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)/;

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  /** onBlur 驗證：通過時 true、失敗時 false、尚未檢查 null */
  const [inviteFieldValid, setInviteFieldValid] = useState<boolean | null>(
    null,
  );
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  const runInviteValidation = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setInviteFieldValid(null);
      setInviteFieldError(null);
      return;
    }
    setInviteChecking(true);
    const upper = trimmed.toUpperCase();
    const res = await validateInvitationCodeAction(upper);
    setInviteChecking(false);
    if (res.valid) {
      setInviteFieldValid(true);
      setInviteFieldError(null);
    } else {
      setInviteFieldValid(false);
      setInviteFieldError(res.error ?? "邀請碼無效");
    }
  }, []);

  async function handleRegisterClick() {
    setFieldErrors({});

    if (password !== confirmPassword) {
      toast.error("兩次密碼不一致");
      return;
    }
    if (password.length < 6) {
      toast.error("密碼至少 6 字元");
      return;
    }
    if (!PASSWORD_PATTERN.test(password)) {
      toast.error("密碼需同時包含英文與數字");
      return;
    }

    const parsed = registerStep1Schema.safeParse({
      email,
      password,
      instagram: igHandle,
      inviteCode: inviteCode.trim(),
      termsAccepted,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      const first = parsed.error.issues[0]?.message;
      if (first) toast.error(first);
      return;
    }

    const trimmedCode = parsed.data.inviteCode.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error("請輸入邀請碼");
      return;
    }

    const codeCheck = await validateInvitationCodeAction(trimmedCode);
    if (!codeCheck.valid) {
      toast.error(codeCheck.error ?? "邀請碼無效");
      setInviteFieldValid(false);
      setInviteFieldError(codeCheck.error ?? "邀請碼無效");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          instagram_handle: parsed.data.instagram,
          invite_code: trimmedCode,
        },
      },
    });

    if (error) {
      toast.error(
        friendlyAuthErrorMessage(
          error.message,
          "❌ 操作失敗，請稍後再試",
        ),
      );
      return;
    }

    if (data.session) {
      toast.success("註冊成功，請補上冒險者檔案");
      router.push("/register/profile");
      router.refresh();
      return;
    }

    toast.message("請至信箱完成驗證後再登入", {
      description:
        "若專案已關閉信箱驗證，請改由管理員檢查 Supabase Auth 設定。",
    });
    router.push("/login");
  }

  return (
    <>
    <GuildAuthShell
      title="加入傳奇公會"
      subtitle="建立你的冒險者帳號"
    >
      <RegistrationStepIndicator activeStep={1} />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Email */}
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-4 pl-11 pr-4 text-base text-white placeholder:text-zinc-600 transition-colors focus:border-white/30 focus:outline-none"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="mt-1.5 px-2 text-xs text-red-300">{fieldErrors.email}</p>
          ) : null}
        </div>

        {/* 密碼 */}
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="reg-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密碼（至少6字元，含英文與數字）"
            className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-4 pl-11 pr-12 text-base text-white placeholder:text-zinc-600 transition-colors focus:border-white/30 focus:outline-none"
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
          {fieldErrors.password ? (
            <p className="mt-1.5 px-2 text-xs text-red-300">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        {/* 密碼確認 */}
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="reg-confirm-password"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次輸入密碼"
            className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-4 pl-11 pr-12 text-base text-white placeholder:text-zinc-600 transition-colors focus:border-white/30 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            aria-label={showConfirm ? "隱藏確認密碼" : "顯示確認密碼"}
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {confirmPassword && password !== confirmPassword ? (
          <p className="px-2 text-xs text-rose-400">兩次密碼不一致</p>
        ) : null}

        {/* IG 帳號 */}
        <div className="relative">
          <Instagram
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="reg-ig"
            name="instagram"
            type="text"
            autoComplete="username"
            required
            value={igHandle}
            onChange={(e) => setIgHandle(e.target.value.replace(/\s/g, ""))}
            placeholder="Instagram 帳號"
            className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-4 pl-11 pr-4 text-base text-white placeholder:text-zinc-600 transition-colors focus:border-white/30 focus:outline-none"
            aria-invalid={Boolean(fieldErrors.instagram)}
          />
          {fieldErrors.instagram ? (
            <p className="mt-1.5 px-2 text-xs text-red-300">
              {fieldErrors.instagram}
            </p>
          ) : null}
        </div>

        {/* 邀請碼（必填） */}
        <div className="relative">
          <Hash
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="reg-invite"
            name="inviteCode"
            type="text"
            required
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value);
              setInviteFieldValid(null);
              setInviteFieldError(null);
            }}
            onBlur={(e) => {
              void runInviteValidation(e.target.value);
            }}
            placeholder="請輸入邀請碼（必填）"
            className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-4 pl-11 pr-4 text-base text-white placeholder:text-zinc-600 transition-colors focus:border-white/30 focus:outline-none"
            aria-invalid={Boolean(fieldErrors.inviteCode) || inviteFieldValid === false}
          />
          {fieldErrors.inviteCode ? (
            <p className="mt-1.5 px-2 text-xs text-red-300">
              {fieldErrors.inviteCode}
            </p>
          ) : inviteChecking ? (
            <p className="mt-1.5 px-2 text-xs text-zinc-400">驗證中…</p>
          ) : inviteFieldValid === false && inviteFieldError ? (
            <p className="mt-1.5 px-2 text-xs text-red-300">{inviteFieldError}</p>
          ) : inviteFieldValid === true ? (
            <p className="mt-1.5 px-2 text-xs text-emerald-400">
              ✓ 邀請碼有效
            </p>
          ) : null}
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-950/25 px-3 py-2.5 transition-colors hover:border-violet-400/40 hover:bg-violet-950/35">
          <input
            id="reg-terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-500/60 bg-background accent-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            aria-invalid={Boolean(fieldErrors.termsAccepted)}
          />
          <div className="min-w-0 text-sm">
            <span className="text-zinc-300">
              <label htmlFor="reg-terms" className="cursor-pointer">
                我同意
              </label>{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-violet-400 underline transition-colors hover:text-violet-300"
              >
                冒險者公會使用者條款
              </button>
            </span>
            <span className="mt-0.5 block text-xs text-zinc-400">
              必須勾選才能建立誓約帳號
            </span>
          </div>
        </div>
        {fieldErrors.termsAccepted ? (
          <p className="px-2 text-xs text-red-300">{fieldErrors.termsAccepted}</p>
        ) : null}

        <LoadingButton
          className={guildAuthPrimaryButtonClass}
          loadingText="處理中…"
          onClick={handleRegisterClick}
        >
          建立帳號
        </LoadingButton>
      </form>

      <p className="border-t border-white/10 pt-6 text-center text-sm text-zinc-300">
        已有帳號？{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-100 underline decoration-violet-400/80 underline-offset-4 hover:decoration-violet-300"
        >
          回到登入
        </Link>
      </p>
    </GuildAuthShell>
    <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}
