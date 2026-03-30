"use client";

import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ServiceWorkerRegister />
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
