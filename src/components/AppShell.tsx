"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/clearance", label: "Reel Clearance Desk" },
  { href: "/playbooks", label: "Fanvue playbooks" },
  { href: "/prompts", label: "SFW Reel prompts" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#0b0f0c] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f0c]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-[#49f264]">
            Creator ops
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 ${
                    active ? "bg-[#49f264] text-black" : "text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
