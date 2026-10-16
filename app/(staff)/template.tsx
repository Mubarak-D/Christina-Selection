"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { motionTokens } from "@/lib/motion-tokens";

// Each staff page settles in after navigating. The first page load is not animated,
// so server-rendered HTML is never hidden while JavaScript loads.
const session = { mounted: false };

export default function StaffTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [animate] = useState(() => session.mounted);
  useEffect(() => {
    session.mounted = true;
  }, []);
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: reduce ? 0 : motionTokens.distance.sm } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.15 : motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      {children}
    </motion.div>
  );
}
