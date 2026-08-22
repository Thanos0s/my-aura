"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexConfigured } from "@/app/providers";
import { KioskWizard, type KioskAdapters } from "@/components/KioskWizard";

export default function KioskPage() {
  if (!convexConfigured()) {
    return <KioskWizard adapters={null} />;
  }
  return <SyncedKiosk />;
}

function SyncedKiosk() {
  const startVisit = useMutation(api.visits.startVisit);
  const saveIntake = useMutation(api.visits.saveIntake);
  const escalate = useMutation(api.visits.escalate);
  const confirmRecap = useMutation(api.visits.confirmRecap);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const attachDocument = useMutation(api.documents.attachDocument);

  const adapters: KioskAdapters = {
    startVisit: async (args) => {
      const { sessionUserId, ...rest } = args;
      return startVisit({
        ...rest,
        ...(sessionUserId ? { sessionUserId: sessionUserId as Id<"users"> } : {}),
      });
    },
    saveIntake: async (args) =>
      saveIntake({
        visitId: args.visitId as Id<"visits">,
        intakeJson: args.intakeJson,
        recapText: args.recapText,
        status: args.status,
      }),
    escalate: async (args) =>
      escalate({
        visitId: args.visitId as Id<"visits">,
        questionId: args.questionId,
        intakeJson: args.intakeJson,
      }),
    confirmRecap: async (args) =>
      confirmRecap({
        visitId: args.visitId as Id<"visits">,
        recapText: args.recapText,
        intakeJson: args.intakeJson,
      }),
    uploadDocument: async (args) => {
      const postUrl = await generateUploadUrl({});
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": args.file.type || "application/octet-stream" },
        body: args.file,
      });
      const json = (await result.json()) as { storageId: Id<"_storage"> };
      await attachDocument({
        visitId: args.visitId as Id<"visits">,
        storageId: json.storageId,
        kind: args.kind,
        rawText: args.rawText,
        structuredJson: args.structuredJson,
        confidence: args.confidence,
        failed: args.failed,
      });
    },
  };

  return <KioskWizard adapters={adapters} />;
}
