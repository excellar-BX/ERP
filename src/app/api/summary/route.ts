import { timingSafeEqual } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { dailySummary, getSettings } from "@/lib/queries";
import { summaryMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// A scheduler (no login cookie) can authenticate with "Authorization: Bearer <CRON_SECRET>".
function hasValidSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// GET /api/summary?date=YYYY-MM-DD
// The daily summary as JSON plus a ready-to-send message. A scheduler (cron, or the
// WhatsApp Business API later) can call this every evening to push the summary out.
export async function GET(request: Request) {
  if (!hasValidSecret(request) && !(await getCurrentUser())) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  const summary = await dailySummary(date);
  return Response.json({ summary, message: summaryMessage(await getSettings(), summary) });
}
