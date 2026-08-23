import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      to?: string;
      patientName?: string;
      practitionerName?: string;
      scheduledAt?: number;
      status?: string;
      notes?: string;
    };

    const { to, patientName, practitionerName, scheduledAt, status, notes } = body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    // Clean destination phone number
    const rawPhone = to || process.env.PATIENT_WHATSAPP_NUMBER || "";
    if (!rawPhone) {
      return NextResponse.json({
        success: false,
        message: "No phone number provided for WhatsApp alert",
      });
    }

    const cleanedDigits = rawPhone.replace(/\D/g, "");
    const targetWhatsApp = rawPhone.startsWith("whatsapp:")
      ? rawPhone
      : `whatsapp:${rawPhone.startsWith("+") ? rawPhone : cleanedDigits.length === 10 ? `+91${cleanedDigits}` : `+${cleanedDigits}`}`;

    const formattedDate = new Date(scheduledAt || Date.now()).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const messageText = `🏥 *My-Aura Health Clinic* 🏥\n\nHello *${patientName || "Patient"}*,\nYour appointment request has been confirmed:\n\n📅 *Date & Time*: ${formattedDate}\n👨‍⚕️ *Practitioner*: ${practitionerName || "Assigned Doctor"}\n📌 *Status*: ${(status || "Requested").toUpperCase()}\n💬 *Notes*: ${notes || "Follow-up consultation"}\n\n_Thank you for choosing My-Aura. Reply to this chat anytime to reschedule or view your plan!_`;

    if (!accountSid || !authToken) {
      console.log("[Twilio Mock] WhatsApp message dispatched:", {
        to: targetWhatsApp,
        body: messageText,
      });
      return NextResponse.json({
        success: true,
        mode: "mock",
        message: "Twilio credentials pending. Mock WhatsApp alert logged.",
        detail: { to: targetWhatsApp, preview: messageText },
      });
    }

    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
    const params = new URLSearchParams();
    params.set("From", fromWhatsApp);
    params.set("To", targetWhatsApp);
    params.set("Body", messageText);

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const twilioData = (await twilioRes.json()) as { sid?: string; status?: string; message?: string };
    if (!twilioRes.ok) {
      console.error("Twilio send error:", twilioData);
      return NextResponse.json(
        { success: false, error: twilioData.message || "Twilio send error", detail: twilioData },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: twilioData.sid,
      status: twilioData.status,
    });
  } catch (err) {
    console.error("Twilio send route exception:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
