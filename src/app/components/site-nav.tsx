import Link from "next/link";

export function SiteNav({ current }: { current: "home" | "ops" }) {
  const item = (href: string, id: "home" | "ops", label: string) => (
    <Link
      href={href}
      className={`text-sm px-3 py-1.5 rounded-full border ${
        current === id
          ? "border-black/20 bg-black/[.04] dark:border-white/20 dark:bg-white/10"
          : "border-transparent hover:bg-black/[.04] dark:hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex items-center gap-2">
      {item("/", "home", "Home")}
      {item("/ops", "ops", "Ops")}
    </nav>
  );
}
