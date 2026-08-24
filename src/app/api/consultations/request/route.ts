import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://confident-caterpillar-849.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

const CONSULTATION_TYPES = new Set(["HOME_VISIT", "CLINIC_OPD", "TELECONSULT"]);
const URGENCY_LEVELS = new Set(["ROUTINE", "PRIORITY", "EMERGENCY"]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const {
    sessionUserId,
    practitionerUserId,
    lat,
    lng,
    address,
    pinCode,
    consultationType,
    urgency,
    preferredWindowStart,
    preferredWindowEnd,
    estimatedConsultMinutes,
    notes,
    patientPhone,
  } = body as Record<string, unknown>;

  if (typeof sessionUserId !== "string" || !sessionUserId) {
    return NextResponse.json({ error: "sessionUserId is required" }, { status: 400 });
  }
  if (typeof practitionerUserId !== "string" || !practitionerUserId) {
    return NextResponse.json({ error: "practitionerUserId is required" }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat and lng must be numbers" }, { status: 400 });
  }
  if (typeof address !== "string" || !address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }
  if (typeof pinCode !== "string" || !pinCode) {
    return NextResponse.json({ error: "pinCode is required" }, { status: 400 });
  }
  if (typeof consultationType !== "string" || !CONSULTATION_TYPES.has(consultationType)) {
    return NextResponse.json(
      { error: "consultationType must be one of HOME_VISIT, CLINIC_OPD, TELECONSULT" },
      { status: 400 }
    );
  }
  if (typeof urgency !== "string" || !URGENCY_LEVELS.has(urgency)) {
    return NextResponse.json(
      { error: "urgency must be one of ROUTINE, PRIORITY, EMERGENCY" },
      { status: 400 }
    );
  }
  if (typeof preferredWindowStart !== "number" || typeof preferredWindowEnd !== "number") {
    return NextResponse.json(
      { error: "preferredWindowStart and preferredWindowEnd must be epoch-ms numbers" },
      { status: 400 }
    );
  }

  try {
    const appointmentId = await convex.mutation(api.consultations.requestConsultation, {
      sessionUserId,
      practitionerUserId: practitionerUserId as Id<"users">,
      geo: { lat, lng },
      address,
      pinCode,
      consultationType: consultationType as "HOME_VISIT" | "CLINIC_OPD" | "TELECONSULT",
      urgency: urgency as "ROUTINE" | "PRIORITY" | "EMERGENCY",
      preferredWindowStart,
      preferredWindowEnd,
      estimatedConsultMinutes:
        typeof estimatedConsultMinutes === "number" ? estimatedConsultMinutes : undefined,
      notes: typeof notes === "string" ? notes : undefined,
      patientPhone: typeof patientPhone === "string" ? patientPhone : undefined,
    });
    return NextResponse.json({ appointmentId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create consultation request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
