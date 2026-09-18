import { motion } from "motion/react";
import type { CSSProperties, PropsWithChildren } from "react";

type FadeUpProps = PropsWithChildren<{
  delay?: number;
  className?: string;
  style?: CSSProperties;
}>;

export default function FadeUp({ children, delay = 0, className, style }: FadeUpProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}