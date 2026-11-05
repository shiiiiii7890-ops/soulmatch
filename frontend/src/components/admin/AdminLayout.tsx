import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { HeartHandshake, Loader2, LogOut, Settings, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAdminMe } from "@/lib/hooks";
import { endSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Entries", icon: Users, end: true },
  { to: "/admin/matching", label: "Matching", icon: HeartHandshake },
  { to: "/admin/settings", label: "Form & settings", icon: Settings },
];

export default function AdminLayout() {
  const me = useAdminMe();
  const loc = useLocation();
  if (me.isLoading) return <div className="flex min-h-screen items-center justify-center bg-ivory"><Loader2 className="size-6 animate-spin text-wine" /></div>;
  if (me.isError || !me.data) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;

  return (
    <div className="min-h-screen bg-ivory">
      <header className="sticky top-0 z-30 bg-wine-night text-ivory">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo light className="text-xl" />
          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to} to={n.to} end={n.end}
                data-testid={`admin-nav-${n.label.toLowerCase().split(" ")[0]}`}
                className={({ isActive }) => cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-[background-color,color] duration-150",
                  isActive ? "bg-ivory font-semibold text-wine-deep" : "text-[#C2AAB4] hover:bg-white/10 hover:text-ivory",
                )}
              >
                <n.icon className="size-4" /> {n.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => endSession("/admin/login")} className="flex items-center gap-2 text-sm text-[#C2AAB4] hover:text-ivory" data-testid="admin-logout-button">
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-3xl tracking-tight text-wine-deep" data-testid="admin-page-title">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
