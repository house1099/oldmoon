import { AppShellMotion } from "@/components/layout/app-shell-motion";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShellMotion>{children}</AppShellMotion>;
}
