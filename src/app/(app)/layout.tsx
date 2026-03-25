import { AppShellMotion } from "@/components/layout/app-shell-motion";
import SWRProvider from "@/lib/swr/provider";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SWRProvider>
      <AppShellMotion>{children}</AppShellMotion>
    </SWRProvider>
  );
}
