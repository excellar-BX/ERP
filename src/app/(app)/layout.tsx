import Link from "next/link";
import { Nav } from "@/components/Nav";
import { logout } from "@/lib/auth-actions";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";

// Everything inside (app) requires a login.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-slate-900 p-3 md:sticky md:top-0 md:h-screen md:w-60 md:p-4 print:hidden">
        <Link href="/" className="mb-3 block px-3 md:mb-6">
          <span className="block text-lg font-semibold text-white">Smart ERP</span>
          <span className="block truncate text-xs text-slate-400">{settings.businessName}</span>
        </Link>
        <Nav isOwner={user.role === "owner"} />
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800 px-3 pt-3 md:mt-auto">
          <span className="min-w-0 text-xs text-slate-400">
            <span className="block truncate font-medium text-slate-200">{user.name}</span>
            {user.role === "owner" ? "Owner" : "Staff"}
          </span>
          <form action={logout}>
            <button type="submit" className="rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
    </div>
  );
}
