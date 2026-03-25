"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";

export function AppShellMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="dark min-h-screen bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(88,28,135,0.38),#020617_52%)] text-foreground">
      <div className="min-h-screen pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
        <AnimatePresence mode="sync">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <Navbar />
    </div>
  );
}
