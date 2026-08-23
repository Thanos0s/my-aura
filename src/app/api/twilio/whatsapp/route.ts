import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";


const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://confident-caterpillar-849.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);

    const fromWhatsApp = params.get("From") || ""; // e.g. "whatsapp:+919876543210"
    const senderName = params.get("ProfileName") || "WhatsApp Patient";
    const bodyText = (params.get("Body") || "").trim();

    const cleanedPhone = fromWhatsApp.replace("whatsapp:", "").trim();

    if (!cleanedPhone) {
      return new Response(
        "<Response><Message>Could not identify sender phone number.</Message></Response>",
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Try parsing date/time from message (e.g. "tomorrow 10am" or ISO date or default 24h)
    let scheduledAt = Date.now() + 24 * 60 * 60 * 1000;
    const lower = bodyText.toLowerCase();

    // Check for days offset
    if (lower.includes("tomorrow")) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      scheduledAt = d.getTime();
    } else if (lower.includes("today")) {
      const d = new Date();
      d.setHours(d.getHours() + 2, 0, 0, 0);
      scheduledAt = d.getTime();
    }

    // Book appointment in Convex
    const result = await convex.mutation(api.clinical.bookAppointmentFromWhatsApp, {
      phone: cleanedPhone,
      senderName,
      messageText: bodyText || "Consultation requested via WhatsApp",
      scheduledAt,
    });

    const dateStr = new Date(result.scheduledAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const replyMsg = `✅ *My-Aura Appointment Confirmed!*\n\nHello ${result.patientName},\nYour appointment with *${result.practitionerName}* has been booked for:\n📅 *${dateStr}*\n📌 Status: *Pending Doctor Review*\n\nYour appointment is now live on your Patient Portal & Doctor OPD Dashboard.\nThank you!`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyMsg}</Message>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("Twilio WhatsApp Webhook Error:", err);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ We received your message, but encountered an error processing your appointment. Please visit our website or try again shortly.</Message>
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
