"use client";

import { useMemo, useState } from "react";

type Camera = "handheld" | "tripod";
type TimeOfDay = "day" | "golden_hour" | "night";
type Company = "alone" | "friend" | "public";

const SCENES = [
  "coffee shop window seat",
  "neighborhood walk",
  "hotel balcony",
  "kitchen morning",
  "gym locker-room mirror (clothed, no lingerie)",
  "beach boardwalk",
  "grocery run",
  "car parked at a lookout",
];

export default function PromptsPage() {
  const [camera, setCamera] = useState<Camera>("handheld");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [company, setCompany] = useState<Company>("alone");
  const [scene, setScene] = useState(SCENES[0]);
  const [action, setAction] = useState("checking her phone, then talking to camera");
  const [outfit, setOutfit] = useState("fitted white tank, high-waist denim shorts, sandals");
  const [duration, setDuration] = useState(12);

  const prompt = useMemo(
    () =>
      buildPrompt({ camera, timeOfDay, company, scene, action, outfit, duration }),
    [camera, timeOfDay, company, scene, action, outfit, duration]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#49f264]">Instagram-safe</p>
        <h1 className="mt-1 text-3xl font-semibold">SFW Reel prompt builder</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Outputs a timestamped prompt only. Looks come from your reference images — the prompt never describes hair,
          face, or body type. Camera is either a one-hand selfie hold or a locked tripod. Outfit stays at bikini-or-more;
          lingerie is blocked. Realism comes from named physical detail, not adjectives like beautiful or flawless.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Camera</span>
            <select className={field} value={camera} onChange={(e) => setCamera(e.target.value as Camera)}>
              <option value="handheld">Handheld selfie (one hand)</option>
              <option value="tripod">Tripod / static</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Time</span>
            <select className={field} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
              <option value="day">Day</option>
              <option value="golden_hour">Golden hour</option>
              <option value="night">Night</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Who is around</span>
            <select className={field} value={company} onChange={(e) => setCompany(e.target.value as Company)}>
              <option value="alone">Alone in frame</option>
              <option value="friend">With a friend</option>
              <option value="public">Public place, extras in background</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Scene</span>
            <select className={field} value={scene} onChange={(e) => setScene(e.target.value)}>
              {SCENES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">What she is doing</span>
            <input className={field} value={action} onChange={(e) => setAction(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Outfit (bikini allowed, lingerie blocked)</span>
            <input className={field} value={outfit} onChange={(e) => setOutfit(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Length {duration}s</span>
            <input
              type="range"
              min={6}
              max={30}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </form>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Prompt</p>
            <button
              type="button"
              className="rounded-full bg-[#49f264] px-3 py-1 text-xs text-black"
              onClick={() => navigator.clipboard.writeText(prompt)}
            >
              Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{prompt}</pre>
        </div>
      </div>
    </div>
  );
}

function buildPrompt({
  camera,
  timeOfDay,
  company,
  scene,
  action,
  outfit,
  duration,
}: {
  camera: Camera;
  timeOfDay: TimeOfDay;
  company: Company;
  scene: string;
  action: string;
  outfit: string;
  duration: number;
}) {
  const blocked = /lingerie|thong|nipple|sheer bodysuit|open robe/i.test(outfit);
  const safeOutfit = blocked
    ? "solid two-piece bikini or covered street clothes (lingerie requested and rejected as off-policy)"
    : outfit;

  const light =
    timeOfDay === "night"
      ? "practical night lighting: mixed sodium street lamps and phone screen spill, crushed shadows, mild noise in the darks, not evenly lit"
      : timeOfDay === "golden_hour"
        ? "late sun from one side, long shadows, muted warm color, highlights rolling off rather than glowing"
        : "overcast-to-soft daylight, uneven, real shadows under the chin and collarbone, true-to-life color not oversaturated";

  const people =
    company === "friend"
      ? "A friend is with her: mid-20s woman in a faded band tee and jeans, scuffed white sneakers, phone in one hand, talking off-mic. They occupy the same frame but the influencer is recording."
      : company === "public"
        ? "Other people exist in the background only: a couple crossing behind her, a barista, traffic. Nobody looks at the camera. Depth is messy and real."
        : "She is the only person in frame. Background life still exists (passing cars, a TV, street noise) so the space does not look staged empty.";

  const cameraLine =
    camera === "handheld"
      ? "Camera: one-hand handheld front-camera selfie. Arm slightly extended, mild roll and micro-shake, occasional thumb at the bottom edge of frame. She is recording herself. No film crew, no slider, no orbit."
      : "Camera: phone locked on a cheap tripod she set herself. Static frame, cannot pan or dolly. She walks in and out of the locked composition. No film crew.";

  const stamps = timestamps(duration, action, camera);

  return `Use the reference images provided to create a photorealistic short vertical video of this influencer. Match identity, face, hair, and body only from the references — do not invent or describe those features in this prompt.

Scene: ${scene}. ${people} Time of day: ${timeOfDay.replace("_", " ")}. ${light}

She is wearing ${safeOutfit}. Fabric has visible weave, seams, pilling, and creases from sitting. Skin has visible pores, faint redness around the nose, a small healing blemish, peach fuzz catching the light, dry texture on the lower lip. Hair has flyaways. No beauty filter, no smoothing, no airbrush, no CGI skin, no plastic skin, not a cartoon, not an illustration. Looks like a real phone video a person actually recorded.

${cameraLine}
Format: 9:16, 1080x1920, handheld phone compression, slight rolling shutter, natural focus breathing. RAW phone footage energy. Keep it SFW for Instagram: bikini-level coverage maximum, no lingerie, no nudity, no sexual simulation, no crotch or breast close-ups as the point of the shot.

Action: ${action}

${stamps}

End on a still beat she could actually post. Audio is ambient location sound plus her voice if she talks; no licensed chart music in the generation.`;
}

function timestamps(duration: number, action: string, camera: Camera) {
  const lines: string[] = [];
  let t = 0;
  const step = duration <= 10 ? 3 : 4;
  const beats = [
    `opens on the location, ${camera === "handheld" ? "arm adjusting the angle" : "she steps into the locked frame"}`,
    `settles, ${action}`,
    "a small real interruption: wind, a passing person, a laugh, she fixes a strap or hair flyaway",
    "continues the action, glances at the lens the way people do when they check the recording",
    "wraps the thought, lowers the phone or steps closer, holds a last look",
  ];
  let i = 0;
  while (t < duration && i < beats.length) {
    const next = Math.min(duration, t + step);
    lines.push(`${format(t)}-${format(next)} — ${beats[i]}`);
    t = next;
    i += 1;
  }
  if (t < duration) {
    lines.push(`${format(t)}-${format(duration)} — holds, ambient noise, she stops recording`);
  }
  return lines.join("\n");
}

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const field = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm";
