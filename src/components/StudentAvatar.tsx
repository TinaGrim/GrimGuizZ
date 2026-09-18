import { motion } from "motion/react";

const PALETTE = ["#D94F1E", "#0D6E6E", "#B73A10", "#C98A00", "#1C0F00"];

type StudentAvatarProps = {
  name: string;
  size?: number;
  title?: string;
};

export default function StudentAvatar({ name, size = 40, title }: StudentAvatarProps) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const color = PALETTE[hash % PALETTE.length];

  return (
    <motion.span
      title={title ?? name}
      role="img"
      aria-label={title ?? name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: "2px solid rgba(28,15,0,0.35)",
        boxShadow: "inset 0 2px 0 rgba(255,255,255,0.18)",
        color: "var(--color-cream)",
        fontFamily: "var(--font-display)",
        fontWeight: 900,
        fontSize: size * 0.46,
        lineHeight: 1,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        cursor: "default",
      }}
      initial={{ scale: 0, rotate: -15, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 17 }}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.94 }}
    >
      <motion.span
        style={{ display: "block" }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.06, type: "spring", stiffness: 400, damping: 16 }}
      >
        {initial}
      </motion.span>
    </motion.span>
  );
}