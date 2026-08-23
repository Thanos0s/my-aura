"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexConfigured } from "@/app/providers";

export default function StaffPage() {
  if (!convexConfigured()) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="tl-overline">Alerts</p>
        <h1 className="mt-2 text-2xl">Staff</h1>
        <p className="mt-4 text-body">Connect Convex to see red-flag escalations.</p>
      </main>
    );
  }
  return <StaffApp />;
}

function StaffApp() {
  const queue = useQuery(api.visits.listQueue);
  const acknowledgeRedFlag = useMutation(api.visits.acknowledgeRedFlag);
  const escalated = queue?.filter((v) => v.status === "escalated") ?? [];
  return (
    <main className="mx-auto max-w-[1000px] space-y-6 pb-16">
      <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90">
        <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Triage Desk</p>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">Floor Staff & Emergency Escalations</h1>
        <p className="text-xs text-slate-500 mt-1">Real-time red-flag clinical alerts from walk-up kiosks.</p>
      </div>

      {escalated.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm border border-slate-100/90">
          <span className="text-3xl">✅</span>
          <p className="mt-2 text-sm font-bold text-slate-800">All Clear</p>
          <p className="text-xs text-slate-500 mt-0.5">No open red-flag escalations on the clinic floor.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {escalated.map((v) => (
            <li key={v._id} className="rounded-3xl bg-white p-6 shadow-sm border border-rose-200 ring-2 ring-rose-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 uppercase">
                  ⚠️ Escalation Active
                </span>
                <span className="font-mono text-xs text-slate-400">Kiosk: {v.kioskId}</span>
              </div>
              <StaffFlags visitId={v._id} acknowledgeRedFlag={acknowledgeRedFlag} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StaffFlags({
  visitId,
  acknowledgeRedFlag,
}: {
  visitId: Id<"visits">;
  acknowledgeRedFlag: (args: { eventId: Id<"redFlagEvents"> }) => Promise<null>;
}) {
  const detail = useQuery(api.visits.visitDetail, { visitId });
  if (!detail) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {detail.flags.map((f) => (
        <button
          key={f._id}
          className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-bold transition-all shadow-xs"
          onClick={() => void acknowledgeRedFlag({ eventId: f._id })}
        >
          ✓ Acknowledge {f.questionId}
        </button>
      ))}
    </div>
  );
}

