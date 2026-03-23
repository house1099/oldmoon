/**
 * Layer 5：認證表單共用樣式（與 GuildAuthShell 搭配）。
 */
export const guildAuthInputClass =
  "h-11 w-full rounded-xl border border-zinc-800/60 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 shadow-none transition-[box-shadow,border-color] focus-visible:border-zinc-800 focus-visible:ring-1 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 focus-visible:outline-none";

export const guildAuthPrimaryButtonClass =
  "min-h-[3.5rem] w-full rounded-full border border-zinc-700/90 bg-gradient-to-r from-zinc-800 to-zinc-700 py-6 text-base font-medium text-white shadow-lg transition hover:from-zinc-700 hover:to-zinc-600";

export const guildAuthOAuthButtonClass =
  "min-h-[3.5rem] w-full rounded-full border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-sm transition hover:bg-zinc-800/90";

/** SelectTrigger：與 Input 同級深色邊框與紫色 focus ring */
export const guildAuthSelectTriggerClass =
  "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900 px-3 text-sm text-zinc-100 shadow-none outline-none transition-[box-shadow,border-color] focus-visible:border-zinc-800 focus-visible:ring-1 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 data-placeholder:text-zinc-500 data-[size=default]:h-11 dark:bg-zinc-900 dark:hover:bg-zinc-800/90 [&_svg]:text-zinc-400";

/** Select 下拉面板（與註冊／登入深色殼一致） */
export const guildAuthSelectContentClass =
  "border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl ring-1 ring-white/10";

export const guildAuthFieldErrorClass = "text-xs text-red-300";
