"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageEntrance({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
