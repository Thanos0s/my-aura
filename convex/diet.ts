import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserSafely, openReferralFor, requireRole, requireUser, writeAudit } from "./lib/rbac";

const session = { sessionUserId: v.union(v.id("users"), v.string()) };

export const addFoodItems = mutation({
  args: {
    items: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert("foods", item);
    }
    return true;
  },
});

export const referToDietitian = mutation({
  args: {
    ...session,
    patientId: v.id("patients"),
    dietitianUserId: v.id("users"),
    visitId: v.optional(v.id("visits")),
  },
  returns: v.id("referrals"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const dietitian = await ctx.db.get(args.dietitianUserId);
    if (!dietitian || dietitian.role !== "dietitian" || !dietitian.active) {
      throw new Error("Dietitian not found");
    }
    const existing = await openReferralFor(ctx, args.patientId, args.dietitianUserId);
    if (existing) return existing._id;
    const id = await ctx.db.insert("referrals", {
      patientId: args.patientId,
      visitId: args.visitId,
      practitionerUserId: user._id,
      dietitianUserId: args.dietitianUserId,
      status: "open",
      createdAt: Date.now(),
    });
    await writeAudit(ctx, user._id, "refer_dietitian", id, { patientId: args.patientId });
    return id;
  },
});

export const listReferredPatients = query({
  args: session,
  returns: v.array(
    v.object({
      referralId: v.id("referrals"),
      patientId: v.id("patients"),
      displayName: v.string(),
      visitApproved: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["dietitian"]);
    const refs = await ctx.db
      .query("referrals")
      .withIndex("by_dietitian", (q) => q.eq("dietitianUserId", user._id))
      .take(80);
    const out = [];
    for (const ref of refs) {
      if (ref.status !== "open") continue;
      const patient = await ctx.db.get(ref.patientId);
      const visits = await ctx.db
        .query("visits")
        .withIndex("by_patient", (q) => q.eq("patientId", ref.patientId))
        .take(20);
      const visitApproved = visits.some((v) => v.status === "approved");
      out.push({
        referralId: ref._id,
        patientId: ref.patientId,
        displayName: patient?.displayName ?? "Unknown",
        visitApproved,
        createdAt: ref.createdAt,
      });
    }
    return out;
  },
});

export const approvedSummaryForDietitian = query({
  args: { ...session, patientId: v.id("patients") },
  returns: v.union(
    v.object({
      recapText: v.string(),
      visitId: v.id("visits"),
      approved: v.literal(true),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["dietitian"]);
    const ref = await openReferralFor(ctx, args.patientId, user._id);
    if (!ref) throw new Error("Unauthorized: no referral");
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .take(40);
    const approved = visits.find((v) => v.status === "approved");
    if (!approved) return null;
    return {
      recapText: approved.recapText,
      visitId: approved._id,
      approved: true as const,
    };
  },
});

export const saveDietPlan = mutation({
  args: {
    ...session,
    patientId: v.id("patients"),
    title: v.string(),
    notes: v.string(),
    shareable: v.boolean(),
    planId: v.optional(v.id("dietPlans")),
    structuredPlan: v.optional(v.string()),
  },
  returns: v.id("dietPlans"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["dietitian"]);
    const ref = await openReferralFor(ctx, args.patientId, user._id);
    if (!ref) throw new Error("Unauthorized: no referral");
    const now = Date.now();
    if (args.planId) {
      const existing = await ctx.db.get(args.planId);
      if (!existing || existing.dietitianUserId !== user._id) {
        throw new Error("Diet plan not found");
      }
      await ctx.db.patch(args.planId, {
        title: args.title,
        notes: args.notes,
        shareable: args.shareable,
        updatedAt: now,
        ...(args.structuredPlan !== undefined ? { structuredPlan: args.structuredPlan } : {}),
      });
      return args.planId;
    }
    return await ctx.db.insert("dietPlans", {
      patientId: args.patientId,
      dietitianUserId: user._id,
      referralId: ref._id,
      title: args.title,
      notes: args.notes,
      structuredPlan: args.structuredPlan,
      practitionerApproved: false,
      shareable: args.shareable,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const approveDietPlan = mutation({
  args: { ...session, planId: v.id("dietPlans"), approved: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Diet plan not found");
    await ctx.db.patch(args.planId, {
      practitionerApproved: args.approved,
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, user._id, "diet_plan_approve", args.planId, {
      approved: String(args.approved),
    });
    return null;
  },
});

export const addMeal = mutation({
  args: {
    ...session,
    dietPlanId: v.id("dietPlans"),
    label: v.string(),
    itemsText: v.string(),
  },
  returns: v.id("meals"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["dietitian"]);
    const plan = await ctx.db.get(args.dietPlanId);
    if (!plan || plan.dietitianUserId !== user._id) throw new Error("Diet plan not found");
    return await ctx.db.insert("meals", {
      dietPlanId: args.dietPlanId,
      label: args.label,
      itemsText: args.itemsText,
      createdAt: Date.now(),
    });
  },
});

export const listDietPlans = query({
  args: { ...session, patientId: v.optional(v.id("patients")) },
  returns: v.array(
    v.object({
      _id: v.id("dietPlans"),
      title: v.string(),
      notes: v.string(),
      structuredPlan: v.optional(v.string()),
      practitionerApproved: v.boolean(),
      shareable: v.boolean(),
      createdAt: v.number(),
      meals: v.array(
        v.object({
          _id: v.id("meals"),
          label: v.string(),
          itemsText: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return [];

    let patientId = args.patientId;
    if (user.role === "patient") {
      patientId = user.patientId;
      if (!patientId) {
        const p = await ctx.db
          .query("patients")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        patientId = p?._id;
      }
      if (!patientId) return [];
    } else if (!patientId) {
      return [];
    } else if (user.role === "dietitian") {
      const ref = await openReferralFor(ctx, patientId, user._id);
      if (!ref) return [];
    } else if (user.role !== "practitioner" && user.role !== "admin") {
      return [];
    }
    const plans = await ctx.db
      .query("dietPlans")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId!))
      .take(20);

    const visible = plans.filter((p) => {
      if (user.role === "patient") return p.practitionerApproved || p.shareable;
      return true;
    });
    const out = [];
    for (const p of visible) {
      const meals = await ctx.db
        .query("meals")
        .withIndex("by_plan", (q) => q.eq("dietPlanId", p._id))
        .take(20);
      out.push({
        _id: p._id,
        title: p.title,
        notes: p.notes,
        structuredPlan: p.structuredPlan,
        practitionerApproved: p.practitionerApproved,
        shareable: p.shareable,
        createdAt: p.createdAt,
        meals: meals.map((m) => ({ _id: m._id, label: m.label, itemsText: m.itemsText })),
      });
    }
    return out;
  },
});

export const reportProgress = mutation({
  args: { ...session, patientId: v.id("patients"), body: v.string() },
  returns: v.id("dietitianProgressNotes"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["dietitian"]);
    const ref = await openReferralFor(ctx, args.patientId, user._id);
    if (!ref) throw new Error("Unauthorized: no referral");
    return await ctx.db.insert("dietitianProgressNotes", {
      patientId: args.patientId,
      dietitianUserId: user._id,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

export const listProgressNotes = query({
  args: { ...session, patientId: v.id("patients") },
  returns: v.array(
    v.object({
      _id: v.id("dietitianProgressNotes"),
      body: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionUserId);
    if (user.role === "dietitian") {
      const ref = await openReferralFor(ctx, args.patientId, user._id);
      if (!ref) throw new Error("Unauthorized: no referral");
    } else if (user.role !== "practitioner" && user.role !== "admin") {
      throw new Error("Unauthorized");
    }
    const rows = await ctx.db
      .query("dietitianProgressNotes")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .take(40);
    return rows.map((r) => ({ _id: r._id, body: r.body, createdAt: r.createdAt }));
  },
});