import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://confident-caterpillar-849.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

function startOfDayMs(dateStr: string | null): number {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const practitionerUserId = searchParams.get("practitionerUserId");
  const date = searchParams.get("date");

  if (!practitionerUserId) {
    return NextResponse.json({ error: "practitionerUserId is required" }, { status: 400 });
  }

  try {
    const result = await convex.action(api.consultations.getDoctorQueue, {
      practitionerUserId: practitionerUserId as Id<"users">,
      dayStart: startOfDayMs(date),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load doctor queue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
