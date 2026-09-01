import { useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import { useApp } from "../../store/AppContext";
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

export default function AdminLayout() {
  const { teacherToken, teacherLogout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!teacherToken) navigate("/admin");
  }, [teacherToken, navigate]);

  if (!teacherToken) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-cream)" }}>
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
              style={{ fontFamily: "var(--font-display)", color: "var(--color-amber)" }}
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

        <div className="mx-5 my-1" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

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
          <div className="mx-0 mb-3" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
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
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}