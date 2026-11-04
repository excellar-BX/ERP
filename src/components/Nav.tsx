"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/billing", label: "New bill" },
  { href: "/invoices", label: "Invoices" },
  { href: "/products", label: "Products" },
  { href: "/customers", label: "Customers & dues" },
  { href: "/settings", label: "Settings", ownerOnly: true },
];

export function Nav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {links.filter((link) => isOwner || !link.ownerOnly).map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
