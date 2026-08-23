"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexConfigured } from "@/app/providers";
import { RoleGate, useAuraSession } from "@/components/useAuraSession";
import type { Role } from "@/lib/auth/access";

export default function AdminPage() {
  if (!convexConfigured()) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="tl-overline">Cadence</p>
        <h1 className="mt-2 text-2xl">Admin</h1>
        <p className="mt-4 text-body">Connect Convex for admin tools.</p>
      </main>
    );
  }
  return (
    <RoleGate allow={["admin"]} label="Admin">
      <AdminApp />
    </RoleGate>
  );
}

function AdminApp() {
  const session = useAuraSession();
  const sessionUserId = session?.userId as Id<"users"> | undefined;
  const stats = useQuery(api.visits.analytics);
  const sys = useQuery(api.adminOps.systemAnalytics, sessionUserId ? { sessionUserId } : "skip");
  const users = useQuery(api.auth.listUsers, sessionUserId ? { sessionUserId } : "skip");
  const kb = useQuery(api.adminOps.listKnowledge, sessionUserId ? { sessionUserId } : "skip");
  const issues = useQuery(api.adminOps.listIssues, sessionUserId ? { sessionUserId } : "skip");
  const audit = useQuery(api.adminOps.listAudit, sessionUserId ? { sessionUserId } : "skip");
  const appointments = useQuery(api.clinical.listAppointments, sessionUserId ? { sessionUserId } : "skip");
  const setStatus = useMutation(api.clinical.setAppointmentStatus);
  const setRole = useMutation(api.auth.setUserRole);
  const saveKb = useMutation(api.adminOps.saveKnowledge);
  const deleteKb = useMutation(api.adminOps.deleteKnowledge);
  const [kbTitle, setKbTitle] = useState("");
  const [kbBody, setKbBody] = useState("");
  const [kbKind, setKbKind] = useState<"article" | "prompt">("article");

  if (!sessionUserId) return null;

  const whatsappCount = appointments?.filter((a) => a.channel === "whatsapp").length ?? 0;
  const webCount = appointments?.filter((a) => a.channel !== "whatsapp").length ?? 0;

  return (
    <main className="mx-auto max-w-[1300px] space-y-8 pb-16">
      <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90">
        <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Operations Desk</p>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">Admin & Governance Station</h1>
        <p className="text-xs text-slate-500 mt-1">
          Knowledge base governance, user access management, and clinical audit integrity.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">System Metrics</p>
          <h2 className="text-xl font-bold text-slate-900">Platform Analytics</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Total Users" value={sys?.users ?? 0} />
          <Stat label="Practitioners" value={sys?.practitioners ?? 0} />
          <Stat label="Dietitians" value={sys?.dietitians ?? 0} />
          <Stat label="Documents OCR" value={sys?.documents ?? 0} />
          <Stat label="Total Visits" value={stats?.total ?? sys?.visits ?? 0} />
          <Stat label="Appointments" value={appointments?.length ?? 0} />
          <Stat label="WhatsApp Bookings" value={whatsappCount} />
          <Stat label="Web Bookings" value={webCount} />
          <Stat label="Open Issues" value={sys?.openIssues ?? 0} />
          <Stat label="ABHA Consent" value={`${Math.round((stats?.abhaConsentRate ?? 0) * 100)}%`} />
        </div>
      </section>

      {/* Real-time Appointments & WhatsApp Consultation Desk */}
      <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Appointments & Inbound Consultations</h2>
            <p className="text-xs text-slate-500">
              Live queue of appointments booked via Web Portal and Twilio WhatsApp Bot.
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-[10px] font-bold text-emerald-800">
            {appointments?.length ?? 0} Total Scheduled
          </span>
        </div>

        {appointments && appointments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No appointments scheduled yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {appointments?.map((a) => (
              <li
                key={a._id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {a.patientName || "Patient"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                        a.channel === "whatsapp"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {a.channel === "whatsapp" ? "📲 WhatsApp" : "🌐 Web Portal"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        a.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.status === "completed"
                            ? "bg-slate-200 text-slate-700"
                            : a.status === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs">
                    📅{" "}
                    <strong>
                      {new Date(a.scheduledAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </strong>{" "}
                    · Doctor: <strong>{a.practitionerName}</strong>
                    {a.patientPhone ? ` · Phone: ${a.patientPhone}` : ""}
                  </p>
                  {a.notes && <p className="text-[11px] text-slate-400 italic font-mono">{a.notes}</p>}
                </div>

                <div className="flex items-center gap-1.5 self-start md:self-auto">
                  {a.status === "requested" && (
                    <button
                      className="rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800"
                      onClick={() => void setStatus({ sessionUserId, appointmentId: a._id, status: "confirmed" })}
                    >
                      ✓ Confirm
                    </button>
                  )}
                  {a.status !== "completed" && a.status !== "cancelled" && (
                    <button
                      className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
                      onClick={() => void setStatus({ sessionUserId, appointmentId: a._id, status: "completed" })}
                    >
                      Mark Completed
                    </button>
                  )}
                  {a.status !== "cancelled" && (
                    <button
                      className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                      onClick={() => void setStatus({ sessionUserId, appointmentId: a._id, status: "cancelled" })}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>


      <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Users, Roles & Access Control</h2>
        <ul className="space-y-2">
          {users?.map((u) => (
            <li key={u._id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <span className="font-mono font-medium text-slate-800">
                {u.email} · <span className="font-bold text-sky-800 uppercase">{u.role}</span> · {u.active ? "✓ active" : "off"}
              </span>
              <div className="flex gap-1.5">
                {(["patient", "practitioner", "dietitian", "admin"] as Role[]).map((role) => (
                  <button
                    key={role}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-all ${
                      u.role === role ? "bg-[#1b343f] text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                    onClick={() => void setRole({ sessionUserId, targetUserId: u._id, role })}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ayurveda Knowledge Base</h2>
          <p className="text-xs text-slate-500">Articles and prompts. Never applied as autonomous diagnosis.</p>
        </div>
        <select
          className="tl-input"
          value={kbKind}
          onChange={(e) => setKbKind(e.target.value as "article" | "prompt")}
        >
          <option value="article">article</option>
          <option value="prompt">prompt</option>
        </select>
        <input className="tl-input" placeholder="Title" value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} />
        <textarea className="tl-input" rows={3} value={kbBody} onChange={(e) => setKbBody(e.target.value)} placeholder="Content / guidelines..." />
        <button
          className="btn-pulse px-4 py-2 text-xs font-semibold"
          onClick={async () => {
            if (!kbTitle.trim()) return;
            await saveKb({ sessionUserId, kind: kbKind, title: kbTitle, body: kbBody });
            setKbTitle("");
            setKbBody("");
          }}
        >
          Save Knowledge Entry
        </button>
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          {kb?.map((row) => (
            <article key={row._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 uppercase">
                {row.kind}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{row.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-3">{row.body}</p>
              <button
                className="btn-ghost px-3 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                onClick={() => void deleteKb({ sessionUserId, entryId: row._id })}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Audit Trail (Immutable Ledger Log)</h2>
        <ul className="max-h-72 space-y-2 overflow-auto">
          {audit?.map((row, i) => (
            <li key={`${row.createdAt}-${i}`} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{row.action}</span>
                <span className="text-slate-400 text-[10px]">{new Date(row.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Target: {row.target}</p>
              <pre className="mt-1 max-h-24 overflow-auto rounded-xl bg-white p-2 text-[10px] text-slate-600 border border-slate-200 whitespace-pre-wrap">
                {row.payloadJson}
              </pre>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Reported Issues & Feedback</h2>
        <IssueBox sessionUserId={sessionUserId} />
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          {issues?.map((issue) => (
            <article key={issue._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 uppercase">
                {issue.status}
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{issue.title}</h3>
              <p className="text-xs text-slate-600">{issue.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function IssueBox({ sessionUserId }: { sessionUserId: Id<"users"> }) {
  const reportIssue = useMutation(api.adminOps.reportIssue);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
      <input className="tl-input" placeholder="Issue title..." value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="tl-input" rows={2} placeholder="Describe the problem or clinical anomaly..." value={body} onChange={(e) => setBody(e.target.value)} />
      <button
        className="btn-pulse px-4 py-1.5 text-xs font-semibold"
        onClick={async () => {
          if (!title.trim()) return;
          await reportIssue({ sessionUserId, title, body });
          setTitle("");
          setBody("");
        }}
      >
        File Issue
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100/90">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

