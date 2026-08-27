const LISTS = [
  { name: "NEW SUBSCRIBERS ($0 - $49)", use: "Fresh subs. Chatters open with the welcome path, not a hard close." },
  { name: "RELATIONSHIP BUILDERS ($50 - $499)", use: "Warm spenders. Voice notes and bundles before customs." },
  { name: "BIG SPENDER ($500 AND UP)", use: "Priority inbox. Senior chatter only." },
  { name: "TIME WASTERS", use: "Free-chat loops, no spend. Short replies, no custom work." },
  { name: "USA AND CANADA", use: "Timezone and slang routing." },
  { name: "EUROPE", use: "Timezone routing." },
  { name: "REST OF THE WORLD", use: "Timezone routing." },
  { name: "INNER CIRCLE", use: "Named whales. Put the amount in the list name." },
  { name: "BF", use: "Boyfriend / exclusivity buyers. Do not pitch the same drops as the floor." },
];

const VAULT = [
  "SFW",
  "Selfies",
  "Bundle 1 – named look",
  "Bundle 2 – named look",
  "Solo",
  "Sextapes",
  "Voice notes – check-ins",
  "Voice notes – flirty",
  "Voice notes – re-engage",
];

const VOICE = {
  "General check-ins": [
    "Hey you! Just checking in — how have you been?",
    "It’s been a minute… everything okay over there?",
    "Missing our chats… don’t keep me waiting too long.",
    "Hey, haven’t seen you around lately — all good?",
    "Felt like saying hi… hope your week’s been kind to you.",
  ],
  "Sweet & caring": [
    "Hey love, just wanted to see how you’re holding up.",
    "I miss your messages — you always make my day brighter.",
    "You crossed my mind today… wanted to check in.",
    "I’m here when you’re ready to talk again. No pressure.",
  ],
  "Clever / witty": [
    "Is this the part where I pretend not to notice you ghosted me?",
    "Blink twice if you’re still alive.",
    "Sending out a search party… you went MIA.",
    "If this is a test of patience, you win.",
  ],
  "Invitational": [
    "Hey, wanna come chat with me for a sec?",
    "Got time for a little 1-on-1? I’d love that.",
    "I’m online now… would love to see your name pop up.",
    "Drop me a quick message — I want to hear from you.",
  ],
  "Re-engaging": [
    "Noticed we haven’t talked in a while… let’s fix that?",
    "Life got a bit hectic, but I’ve missed our chats.",
    "Wanna hit reset and start over?",
    "I’m back. And missing you more than ever.",
  ],
};

export default function PlaybooksPage() {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#49f264]">Fanvue</p>
        <h1 className="mt-1 text-3xl font-semibold">Page setup playbooks</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Internal ops for lists, first impression, vault, and voice notes. Chatters should live in lists; the vault
          should be boringly labeled. Instagram clearance stays on the Clearance Desk — do not mix those rules into
          Fanvue chat copy.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Lists</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
          <li>Open the Lists tab in Fanvue.</li>
          <li>Create a custom list.</li>
          <li>Name it for chatters, not for you.</li>
          <li>On a fan profile, use the three-dot menu to add them.</li>
          <li>Before chatters go live, sort the current top spenders into every list that applies.</li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          {LISTS.map((list) => (
            <article key={list.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium">{list.name}</p>
              <p className="mt-1 text-sm text-zinc-400">{list.use}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">First impression</h2>
        <p className="text-sm text-zinc-300">
          The promo offer does more work than the bio. Keep the bio short so curiosity does the rest. Default promo
          unless the page is already flooding with free subs: 14 days free for new subscribers. That window is long
          enough for chat to convert.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Bio pattern</p>
            <p className="mt-2">One line of voice. One line of what they get. No essay. No price argument in the bio.</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Promo pattern</p>
            <p className="mt-2">14-day free trial for new subs. Paid price stays on the page for returning people.</p>
          </article>
        </div>
        <p className="text-sm text-zinc-500">
          Synthetic personas still need honest labeling where a platform requires it. Instagram photorealistic AI video
          needs the native AI Info disclosure — see the Clearance Desk. Do not use a copyright block to bury required
          AI labels.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Vault</h2>
        <p className="text-sm text-zinc-300">
          Chatters sell what they can find in three seconds. Name bundles by the look, not by a number alone. Record or
          generate a bank of general voice notes, then categorize them the same way as media.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {VAULT.map((item) => (
            <li key={item} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Voice note bank</h2>
        <p className="text-sm text-zinc-400">
          Guides, not scripts to clone forever. Load these into the vault under their category. Keep a separate custom
          bank for named whales.
        </p>
        {Object.entries(VOICE).map(([group, lines]) => (
          <article key={group} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="font-medium">{group}</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
