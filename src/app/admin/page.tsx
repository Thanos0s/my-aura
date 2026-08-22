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
  const queue = useQuery(api.visits.listQueue);
  const setRole = useMutation(api.auth.setUserRole);
  const saveKb = useMutation(api.adminOps.saveKnowledge);
  const deleteKb = useMutation(api.adminOps.deleteKnowledge);
  const [kbTitle, setKbTitle] = useState("");
  const [kbBody, setKbBody] = useState("");
  const [kbKind, setKbKind] = useState<"article" | "prompt">("article");

  if (!sessionUserId) return null;

  return (
    <main className="mx-auto max-w-[1100px] space-y-10 px-4 py-8 md:px-8">
      <div>
        <p className="tl-overline">Cadence</p>
        <h1 className="mt-2 text-3xl">Admin</h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ash">
          Knowledge base is not auto-diagnosis. Practitioner remains clinical authority.
        </p>
      </div>

      <section>
        <h2 className="text-xl">System analytics</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Users" value={sys?.users ?? 0} />
          <Stat label="Practitioners" value={sys?.practitioners ?? 0} />
          <Stat label="Dietitians" value={sys?.dietitians ?? 0} />
          <Stat label="Documents" value={sys?.documents ?? 0} />
          <Stat label="Visits" value={stats?.total ?? sys?.visits ?? 0} />
          <Stat label="Awaiting doctor" value={stats?.awaitingDoctor ?? 0} />
          <Stat label="Approved" value={stats?.approved ?? 0} />
          <Stat label="Open issues" value={sys?.openIssues ?? 0} />
          <Stat label="ABHA consent" value={`${Math.round((stats?.abhaConsentRate ?? 0) * 100)}%`} />
        </div>
      </section>

      <section>
        <h2 className="text-xl">Users / roles / permissions</h2>
        <ul className="mt-3 space-y-2">
          {users?.map((u) => (
            <li key={u._id} className="tl-card flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="flex-1 font-mono text-sm">
                {u.email} · {u.role} · {u.active ? "active" : "off"}
              </span>
              {(["patient", "practitioner", "dietitian", "admin"] as Role[]).map((role) => (
                <button
                  key={role}
                  className="btn-ghost px-2 py-1 text-[10px]"
                  onClick={() => void setRole({ sessionUserId, targetUserId: u._id, role })}
                >
                  {role}
                </button>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl">Ayurveda knowledge base</h2>
        <p className="text-sm text-mist">Articles and prompts. Never applied as a diagnosis.</p>
        <select
          className="tl-input mt-2"
          value={kbKind}
          onChange={(e) => setKbKind(e.target.value as "article" | "prompt")}
        >
          <option value="article">article</option>
          <option value="prompt">prompt</option>
        </select>
        <input className="tl-input mt-2" placeholder="Title" value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} />
        <textarea className="tl-input mt-2" rows={4} value={kbBody} onChange={(e) => setKbBody(e.target.value)} />
        <button
          className="btn-pulse mt-2 px-4 py-2"
          onClick={async () => {
            if (!kbTitle.trim()) return;
            await saveKb({ sessionUserId, kind: kbKind, title: kbTitle, body: kbBody });
            setKbTitle("");
            setKbBody("");
          }}
        >
          Save entry
        </button>
        {kb?.map((row) => (
          <article key={row._id} className="tl-card mt-3 p-3">
            <p className="tl-tag">{row.kind}</p>
            <h3 className="text-lg">{row.title}</h3>
            <p className="whitespace-pre-wrap text-mist">{row.body}</p>
            <button
              className="btn-ghost mt-2 px-3 py-1 text-xs"
              onClick={() => void deleteKb({ sessionUserId, entryId: row._id })}
            >
              Delete
            </button>
          </article>
        ))}
      </section>

      <section>
        <h2 className="text-xl">Documents (queue extracts)</h2>
        <ol className="mt-2 space-y-1 font-mono text-sm">
          {queue?.map((v) => (
            <li key={v._id} className="tl-surface px-3 py-2">
              {v.status} · {v.pathway} · kiosk {v.kioskId}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl">Audit (doctorEdits + admin actions)</h2>
        <ul className="mt-2 max-h-80 space-y-2 overflow-auto">
          {audit?.map((row, i) => (
            <li key={`${row.createdAt}-${i}`} className="tl-card px-3 py-2 font-mono text-xs">
              {new Date(row.createdAt).toLocaleString()} · {row.action} · {row.target}
              <pre className="mt-1 whitespace-pre-wrap text-ash">{row.payloadJson}</pre>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl">Reported issues</h2>
        <IssueBox sessionUserId={sessionUserId} />
        {issues?.map((issue) => (
          <article key={issue._id} className="tl-card mt-2 p-3">
            <p className="tl-tag">{issue.status}</p>
            <h3>{issue.title}</h3>
            <p className="text-mist">{issue.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function IssueBox({ sessionUserId }: { sessionUserId: Id<"users"> }) {
  const reportIssue = useMutation(api.adminOps.reportIssue);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="tl-surface mb-3 space-y-2 p-3">
      <input className="tl-input" placeholder="Issue title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="tl-input" rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
      <button
        className="btn-ghost px-3 py-1 text-sm"
        onClick={async () => {
          if (!title.trim()) return;
          await reportIssue({ sessionUserId, title, body });
          setTitle("");
          setBody("");
        }}
      >
        File issue
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tl-surface p-4">
      <p className="tl-overline">{label}</p>
      <p className="mt-2 font-mono text-3xl text-display">{value}</p>
    </div>
  );
}
