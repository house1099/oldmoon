import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPendingIgRequests } from "@/lib/repositories/server/ig-request.repository";
import { PendingIgRequestsList } from "./pending-list";

export default async function AdminIgRequestsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin/ig-requests");
  }

  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (meErr) {
    redirect("/");
  }

  const role = me?.role ?? "member";
  if (role !== "admin" && role !== "leader") {
    redirect("/");
  }

  let list: Awaited<ReturnType<typeof getPendingIgRequests>> = [];
  try {
    list = await getPendingIgRequests();
  } catch {
    list = [];
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom,0px)))] pt-[max(3rem,env(safe-area-inset-top,0px))]">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 transition hover:text-zinc-200"
      >
        <ChevronLeft className="size-4" aria-hidden />
        返回首頁
      </Link>

      <header className="space-y-1">
        <h1 className="font-serif text-xl tracking-wide text-zinc-100">
          IG 變更審核
        </h1>
        <p className="text-xs text-zinc-500">
          僅 admin／leader 可見。審核通過後會寫入申請者的 Instagram 帳號。
        </p>
      </header>

      <PendingIgRequestsList initial={list} />
    </div>
  );
}
