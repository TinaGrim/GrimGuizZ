import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { useApp } from "../../store/AppContext";
import { useIsCompact } from "../../data/useIsCompact";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart2,
  LogOut,
  BookMarked,
  ImageIcon,
  FolderTree,
  MessageSquareQuote,
  Shield,
  X,
  MoreHorizontal,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin/panel/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/admin/panel/students", label: "Students", Icon: Users },
  { to: "/admin/panel/chapters", label: "Chapters", Icon: FolderTree },
  { to: "/admin/panel/lessons", label: "Lessons", Icon: BookOpen },
  { to: "/admin/panel/quizzes", label: "Quizzes", Icon: BookMarked },
  { to: "/admin/panel/questions", label: "Questions", Icon: BookOpen },
  { to: "/admin/panel/assets", label: "Asset Library", Icon: ImageIcon },
  { to: "/admin/panel/quotes", label: "Quotes", Icon: MessageSquareQuote },
  { to: "/admin/panel/reports", label: "Reports", Icon: BarChart2 },
  { to: "/admin/panel/security", label: "Security", Icon: Shield },
];

// Bottom tab bar shows the 4 most-used items + a "More" tab that opens a
// sheet for the rest. Order matches typical teacher workflow.
const BOTTOM_TABS = [
  "/admin/panel/dashboard",
  "/admin/panel/students",
  "/admin/panel/questions",
  "/admin/panel/reports",
];
const MORE_TO = "__more__";

export default function AdminLayout() {
  const { teacherToken, teacherLogout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isCompact = useIsCompact();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!teacherToken) navigate("/admin");
  }, [teacherToken, navigate]);

  // Close the "More" sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  if (!teacherToken) return null;

  const currentLabel =
    NAV_ITEMS.find((n) => n.to === location.pathname)?.label ?? "QuizZ";

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--color-cream)" }}
    >
      {/* Desktop sidebar — hidden on compact. */}
      {!isCompact && (
        <nav
          className="w-60 shrink-0 flex flex-col"
          style={{
            background: "var(--color-ink)",
            borderRight: "2px solid var(--color-ember)",
            position: "sticky",
            top: 0,
            height: "100vh",
          }}
        >
          <div
            className="h-2 w-full"
            style={{
              background:
                "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 20px, #F0A500 20px, #F0A500 40px, #0D6E6E 40px, #0D6E6E 60px)",
            }}
          />

          <div className="px-5 py-5 flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, background: "var(--color-ember)" }}
            >
              <BookMarked size={18} color="#fff" />
            </div>
            <div>
              <p
                className="text-base font-900 leading-none"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-amber)",
                }}
              >
                Quiz<span style={{ fontSize: "1.2em", lineHeight: 1 }}>Z</span>
              </p>
              <p
                className="text-xs mt-0.5"
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Teacher
              </p>
            </div>
          </div>

          <div
            className="mx-5 my-1"
            style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
          />

          <div className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-500 transition-all ${isActive ? "active-nav" : ""}`
                }
                style={({ isActive }) => ({
                  color: isActive ? "var(--color-ink)" : "rgba(255,255,255,0.45)",
                  background: isActive ? "var(--color-amber)" : "transparent",
                  fontFamily: "var(--font-body)",
                  borderRadius: 0,
                  boxShadow: isActive ? "2px 2px 0 var(--color-amber-dark)" : "none",
                })}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          <div className="px-3 pb-5">
            <div
              className="mx-0 mb-3"
              style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
            />
            <button
              onClick={() => {
                teacherLogout();
                navigate("/admin");
              }}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-500"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-body)",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.15s",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.65)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.3)";
              }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </nav>
      )}

      {/* Mobile top bar — only on compact. */}
      {isCompact && (
        <div
          className="fixed top-0 left-0 right-0 z-30 flex items-center gap-2 px-3"
          style={{
            height: 52,
            background: "var(--color-ink)",
            borderBottom: "2px solid var(--color-ember)",
            paddingTop: "env(safe-area-inset-top)",
            minHeight: "calc(52px + env(safe-area-inset-top))",
          }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 32,
              height: 32,
              background: "var(--color-ember)",
            }}
          >
            <BookMarked size={16} color="#fff" />
          </div>
          <p
            className="flex-1 text-base font-900 leading-none truncate"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-amber)",
            }}
          >
            {currentLabel}
          </p>
          <button
            onClick={() => {
              teacherLogout();
              navigate("/admin");
            }}
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
            }}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}

      {/* Content area. On compact, leave room for the bottom tab bar. */}
      <main
        className="flex-1 overflow-auto"
        style={
          isCompact
            ? { paddingTop: "calc(52px + env(safe-area-inset-top))", paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }
            : undefined
        }
      >
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — only on compact. */}
      {isCompact && (
        <div
          className="fixed left-0 right-0 z-30 grid"
          style={{
            bottom: 0,
            gridTemplateColumns: `repeat(${BOTTOM_TABS.length + 1}, 1fr)`,
            background: "var(--color-ink)",
            borderTop: "2px solid var(--color-ember)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {BOTTOM_TABS.map((to) => {
            const item = NAV_ITEMS.find((n) => n.to === to)!;
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center justify-center gap-0.5"
                style={{
                  minHeight: 56,
                  paddingTop: 6,
                  paddingBottom: 6,
                  color: isActive ? "var(--color-amber)" : "rgba(255,255,255,0.45)",
                  fontFamily: "var(--font-body)",
                  textDecoration: "none",
                }}
              >
                <item.Icon size={20} />
                <span className="text-[10px] font-600 leading-none">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5"
            style={{
              minHeight: 56,
              paddingTop: 6,
              paddingBottom: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: moreOpen ? "var(--color-amber)" : "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-body)",
            }}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-600 leading-none">More</span>
          </button>
        </div>
      )}

      {/* "More" sheet — lists the items not in the bottom tab bar. */}
      {isCompact && moreOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
          />
          <div
            className="relative w-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-cream)",
              borderTop: "2px solid var(--color-ember)",
              maxHeight: "85vh",
              paddingBottom: "env(safe-area-inset-bottom)",
              animation: "slide-up 0.2s ease-out",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-cream-dark)" }}
            >
              <p
                className="text-sm font-700 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                More
              </p>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-muted)",
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 overflow-y-auto">
              {NAV_ITEMS.filter((n) => !BOTTOM_TABS.includes(n.to)).map(
                ({ to, label, Icon }) => {
                  const isActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className="flex flex-col items-center justify-center gap-1.5"
                      style={{
                        background: isActive ? "var(--color-amber)" : "white",
                        border: `2px solid ${isActive ? "var(--color-ink)" : "var(--color-cream-dark)"}`,
                        boxShadow: isActive
                          ? "2px 2px 0 var(--color-ink)"
                          : "none",
                        minHeight: 76,
                        padding: 8,
                        color: "var(--color-ink)",
                        fontFamily: "var(--font-body)",
                        textDecoration: "none",
                      }}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-600">{label}</span>
                    </NavLink>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}