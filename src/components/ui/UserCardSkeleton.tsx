export default function UserCardSkeleton() {
  return (
    <div className="glass-panel flex animate-pulse items-center gap-3 p-4">
      <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-800" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded-full bg-zinc-800" />
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full bg-zinc-800" />
          <div className="h-5 w-16 rounded-full bg-zinc-800" />
          <div className="h-5 w-12 rounded-full bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
