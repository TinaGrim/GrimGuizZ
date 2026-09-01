import type { CSSProperties, ReactNode, MouseEvent, ElementType } from "react";

interface HoverableProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /**
   * Element type. Defaults to "div". Use "li" when wrapping list items.
   */
  as?: ElementType;
  /**
   * When true, hover effect is suppressed and cursor stays default.
   * Use for informational cards that aren't actually clickable.
   */
  disabled?: boolean;
  /**
   * Override the rest border-color restored on mouseleave. Defaults to
   * "var(--color-cream-dark)".
   */
  restBorderColor?: string;
  /**
   * Override the rest box-shadow restored on mouseleave.
   * Defaults to "2px 2px 0 var(--color-cream-dark)".
   */
  restShadow?: string;
  /**
   * When true, the hover draws a FULL border around all four sides
   * (2px solid ink). Use for rows that by default only show a `borderLeft`
   * tier bar — on hover the whole frame appears instead of just the left edge.
   */
  fullBorder?: boolean;
}

/**
 * Wraps a card/row in the established "lift on hover" treatment used by the
 * QuizCard on the student quizzes page: border darkens to ink, hard shadow
 * doubles, and the whole thing translates -2px,-2px with a 0.15s transition.
 *
 * Mirrors the proven QuizCard implementation exactly: only the border-color,
 * box-shadow, and transform are mutated on mouseenter/mouseleave. The border
 * WIDTH and STYLE are expected to come from the caller's `style.border`
 * shorthand (e.g. "2px solid var(--color-cream-dark)"), so we never touch
 * them — which also means the caller's `borderLeft` tier bar is preserved.
 */
export function Hoverable({
  children,
  className,
  style,
  onClick,
  as,
  disabled = false,
  restBorderColor = "var(--color-cream-dark)",
  restShadow = "2px 2px 0 var(--color-cream-dark)",
  fullBorder = false,
}: HoverableProps) {
  const Tag = (as ?? "div") as ElementType;

  const onEnter = (e: MouseEvent<HTMLElement>) => {
    if (disabled) return;
    const el = e.currentTarget as HTMLElement;
    if (fullBorder) {
      // Draw a complete 2px ink frame around all four sides. We set the
      // full `border` shorthand via DOM so React (which only manages the
      // caller's `borderLeft`) won't override it on re-render.
      el.style.border = "2px solid var(--color-ink)";
    } else {
      el.style.borderColor = "var(--color-ink)";
    }
    el.style.boxShadow = "4px 4px 0 var(--color-ink)";
    el.style.transform = "translate(-2px, -2px)";
  };

  const onLeave = (e: MouseEvent<HTMLElement>) => {
    if (disabled) return;
    const el = e.currentTarget as HTMLElement;
    if (fullBorder) {
      // Clear the full frame. React will re-apply the caller's `borderLeft`
      // tier bar from its `style` prop on the next render.
      el.style.border = "";
    } else {
      el.style.borderColor = restBorderColor;
    }
    el.style.boxShadow = restShadow;
    el.style.transform = "none";
  };

  return (
    <Tag
      className={className}
      style={{
        ...style,
        cursor: disabled ? style?.cursor ?? "default" : "pointer",
        transition: "all 0.15s",
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </Tag>
  );
}

export default Hoverable;