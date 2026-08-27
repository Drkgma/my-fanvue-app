import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/fanvue";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/clearance",
    title: "Reel Clearance Desk",
    body: "Run a Reel against the Instagram policy pack. Removal, downrank, or clear — with source IDs.",
  },
  {
    href: "/playbooks",
    title: "Fanvue playbooks",
    body: "Lists, first impression, vault labels, and the voice-note bank for chatters.",
  },
  {
    href: "/prompts",
    title: "SFW Reel prompts",
    body: "Timestamped, reference-image prompts that stay inside Instagram-safe clothing and camera rules.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let me = null;
  try {
    me = await getCurrentUser();
  } catch {
    me = null;
  }
  const isAuthed = !!me;
  const params = await searchParams;
  const errorParam = typeof params?.error === "string" ? params.error : undefined;
  const errorDescriptionParam =
    typeof params?.error_description === "string" ? params.error_description : undefined;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Image src="/fanvue.svg" alt="Fanvue" width={120} height={28} priority />
          <h1 className="mt-4 text-3xl font-semibold">Creator ops</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Clear Instagram Reels against current Meta policy, then run the Fanvue page the way chatters need it.
          </p>
        </div>
        {isAuthed ? (
          <form action="/api/oauth/logout" method="post">
            <button className="rounded-full bg-[#49f264] px-4 py-2 text-sm text-black">Logout</button>
          </form>
        ) : (
          <a className="rounded-full bg-[#49f264] px-4 py-2 text-sm text-black" href="/api/oauth/login">
            Login with Fanvue
          </a>
        )}
      </div>

      {!isAuthed && (errorParam || errorDescriptionParam) ? (
        <p className="text-sm text-red-400">{errorDescriptionParam || errorParam}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-[#49f264]/50"
          >
            <h2 className="font-semibold">{tool.title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{tool.body}</p>
          </Link>
        ))}
      </div>

      {isAuthed ? (
        <pre className="overflow-auto rounded-xl bg-black/40 p-4 text-xs text-zinc-400">
          {JSON.stringify(me, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-zinc-500">
          Fanvue login is optional for the desk and playbooks. It is required only if you want live /users/me data.
        </p>
      )}
    </div>
  );
}
