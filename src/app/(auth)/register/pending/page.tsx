import { PendingLogoutButton } from "./pending-logout-button";

export default function RegisterPendingPage() {
  return (
    <div className="glass-panel w-full space-y-6 rounded-3xl border border-white/10 px-6 py-10 text-center shadow-xl">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
          帳號審核中
        </p>
        <h1 className="font-serif text-xl font-semibold tracking-wide text-zinc-50">
          請稍候管理員確認
        </h1>
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">
        我們正在確認您填寫的 Instagram 帳號。審核通過後即可登入並使用傳奇公會；若需改用其他帳號，通過後可至帳號設定更新。
      </p>
      <PendingLogoutButton />
    </div>
  );
}
