import { redirect } from "next/navigation";

/** 舊網址相容：金幣／商城後台已改為 `/admin/shop` */
export default function AdminCoinsRedirectPage() {
  redirect("/admin/shop");
}
