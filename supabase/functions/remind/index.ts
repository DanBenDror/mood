// Mood reminders. Runs every 15 minutes (see reminders-setup.sql) and sends a
// notification only if the entry for that part of the day has not been locked in.
// It never reads answers: it only checks whether a row for (day, kind) exists.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = "BESwB4JwJC3Hmh2qSZHfKy_nAloIURTBogp_cXZXVSx9tE8gQ2kMmHVl7a2YjaAnyYAZUE9ZwfWvxFbsDnx0q-o";
const APP_URL = "https://danbendror.github.io/mood/";
const DAY_STARTS_AT = 4; // must match js/app.js
const WINDOW_MIN = 15;   // must match the cron schedule

webpush.setVapidDetails(APP_URL, VAPID_PUBLIC, Deno.env.get("VAPID_PRIVATE_KEY")!);
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Date and minutes-since-midnight for a moment, as seen in a time zone.
function local(at: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(at).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string; tz: string; morning_time: string | null; night_time: string | null };

async function push(sub: Sub, payload: Record<string, string>) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
    return "sent";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) { // the phone dropped this subscription
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      return "expired";
    }
    return `failed (${status ?? (e as Error).message})`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // A signed-in user pressing "Send a test" in the app: notify only their own devices.
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data } = await admin.auth.getUser(token);
    if (!data?.user) return reply({ error: "forbidden" }, 403);
    const { data: mine } = await admin.from("push_subscriptions").select("*").eq("user_id", data.user.id);
    const results = [];
    for (const sub of (mine ?? []) as Sub[]) {
      results.push(await push(sub, { title: "Mood", body: "Test: reminders are working.", tag: "mood-test" }));
    }
    return reply({ test: results });
  }

  // The scheduled run.
  const now = new Date();
  const { data: subs, error } = await admin.from("push_subscriptions").select("*");
  if (error) return reply({ error: error.message }, 500);
  const results = [];
  for (const sub of (subs ?? []) as Sub[]) {
    const here = local(now, sub.tz);
    const day = local(new Date(now.getTime() - DAY_STARTS_AT * 3600e3), sub.tz).date;
    for (const kind of ["morning", "night"] as const) {
      const at = sub[`${kind}_time`];
      if (!at) continue;
      const late = (here.minutes - toMinutes(at) + 1440) % 1440;
      if (late >= WINDOW_MIN) continue; // not this reminder's 15-minute slot
      const { count } = await admin.from("entries").select("id", { count: "exact", head: true })
        .eq("user_id", sub.user_id).eq("day", day).eq("kind", kind);
      if (count) continue; // already filled in: stay quiet
      results.push(await push(sub, {
        title: "Mood",
        body: kind === "morning" ? "You haven't filled in this morning yet." : "You haven't filled in tonight yet.",
        tag: `mood-${kind}`,
      }));
    }
  }
  return reply({ checked: subs?.length ?? 0, results });
});
