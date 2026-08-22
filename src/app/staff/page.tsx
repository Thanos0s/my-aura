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
    <main className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      <p className="tl-overline">Cadence · floor</p>
      <h1 className="mt-2 text-3xl">Staff — red flags</h1>
      {escalated.length === 0 ? <p className="mt-4 text-mist">No open escalations.</p> : null}
      <ul className="mt-4 space-y-3">
        {escalated.map((v) => (
          <li key={v._id} className="tl-card border-pulse p-4">
            <p className="font-mono text-sm text-display">{v.kioskId}</p>
            <StaffFlags visitId={v._id} acknowledgeRedFlag={acknowledgeRedFlag} />
          </li>
        ))}
      </ul>
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
    <div className="mt-3 flex flex-wrap gap-2">
      {detail.flags.map((f) => (
        <button
          key={f._id}
          className="btn-pulse px-4 py-1.5 text-sm"
          onClick={() => void acknowledgeRedFlag({ eventId: f._id })}
        >
          Ack {f.questionId}
        </button>
      ))}
    </div>
  );
}
