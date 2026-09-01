import { useEffect, useState } from "react";

// True when viewport is below the Tailwind `md` breakpoint (768px). Used to
// bump up sizes / trim content on the compact (mobile) layout without adding
// different branches of markup per screen size.
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return compact;
}