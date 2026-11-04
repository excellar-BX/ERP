import { dailySummary, getSettings } from "@/lib/queries";
import { summaryMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// GET /api/summary?date=YYYY-MM-DD
// The daily summary as JSON plus a ready-to-send message. A scheduler (cron, or the
// WhatsApp Business API later) can call this every evening to push the summary out.
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  const summary = await dailySummary(date);
  return Response.json({ summary, message: summaryMessage(await getSettings(), summary) });
}
