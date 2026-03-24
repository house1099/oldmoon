import Link from "next/link";

export default function MatchmakingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="glass-panel max-w-sm space-y-4 p-8 text-center">
        <p className="text-4xl">💕</p>
        <h2 className="text-lg font-bold text-white">月老配對</h2>
        <p className="text-sm text-zinc-400">
          月老系統即將開放，敬請期待！
        </p>
        <Link
          href="/"
          className="block w-full rounded-full bg-violet-600 py-4 text-center text-sm font-medium text-white transition-all hover:bg-violet-500"
        >
          先進入公會
        </Link>
      </div>
    </div>
  );
}
