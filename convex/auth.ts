import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashPin } from "./lib/pin";
import { requireRole, requireUser, writeAudit } from "./lib/rbac";
import type { Id } from "./_generated/dataModel";

const roleValidator = v.union(
  v.literal("patient"),
  v.literal("practitioner"),
  v.literal("dietitian"),
  v.literal("admin")
);

const userReturn = v.object({
  _id: v.id("users"),
  email: v.string(),
  role: roleValidator,
  displayName: v.string(),
  patientId: v.optional(v.id("patients")),
  active: v.boolean(),
});

type PublicUser = {
  _id: Id<"users">;
  email: string;
  role: "patient" | "practitioner" | "dietitian" | "admin";
  displayName: string;
  patientId?: Id<"patients">;
  active: boolean;
};

function toPublicUser(user: {
  _id: Id<"users">;
  email: string;
  role: PublicUser["role"];
  displayName: string;
  patientId?: Id<"patients">;
  active: boolean;
}): PublicUser {
  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    patientId: user.patientId,
    active: user.active,
  };
}

const DEMO = [
  { email: "patient@aura.local", role: "patient" as const, displayName: "Demo Patient" },
  { email: "practitioner@aura.local", role: "practitioner" as const, displayName: "Demo Practitioner" },
  { email: "dietitian@aura.local", role: "dietitian" as const, displayName: "Demo Dietitian" },
  { email: "admin@aura.local", role: "admin" as const, displayName: "Demo Admin" },
];

export const seedDemoUsers = mutation({
  args: {},
  returns: v.array(v.object({ email: v.string(), role: roleValidator, userId: v.id("users") })),
  handler: async (ctx) => {
    const pinHash = await hashPin("1234");
    const now = Date.now();
    const out: Array<{ email: string; role: (typeof DEMO)[number]["role"]; userId: Id<"users"> }> = [];
    for (const spec of DEMO) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", spec.email))
        .unique();
      if (existing) {
        out.push({ email: spec.email, role: existing.role, userId: existing._id });
        continue;
      }
      let patientId: Id<"patients"> | undefined;
      if (spec.role === "patient") {
        patientId = await ctx.db.insert("patients", {
          displayName: spec.displayName,
          languageCode: "en-IN",
          createdAt: now,
        });
      }
      const userId = await ctx.db.insert("users", {
        email: spec.email,
        pinHash,
        role: spec.role,
        displayName: spec.displayName,
        patientId,
        active: true,
        createdAt: now,
      });
      if (patientId) {
        await ctx.db.patch(patientId, { userId });
      }
      out.push({ email: spec.email, role: spec.role, userId });
    }
    return out;
  },
});

export const register = mutation({
  args: {
    email: v.string(),
    pin: v.string(),
    displayName: v.string(),
    role: v.optional(roleValidator),
  },
  returns: userReturn,
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Invalid email address");
    if (args.pin.length < 4) throw new Error("PIN must be at least 4 digits");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("Email already registered");
    const role = args.role ?? "patient";
    if (role !== "patient") {
      throw new Error("Public registration is patient-only");
    }
    const now = Date.now();
    const patientId = await ctx.db.insert("patients", {
      displayName: args.displayName.trim() || "Patient",
      languageCode: "en-IN",
      createdAt: now,
    });
    const userId = await ctx.db.insert("users", {
      email,
      pinHash: await hashPin(args.pin),
      role,
      displayName: args.displayName.trim() || "Patient",
      patientId,
      active: true,
      createdAt: now,
    });
    await ctx.db.patch(patientId, { userId });
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    return {
      _id: user._id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      patientId: user.patientId,
      active: user.active,
    };
  },
});

export const login = mutation({
  args: { email: v.string(), pin: v.string() },
  returns: userReturn,
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user || !user.active) throw new Error("Invalid email or PIN");
    if (!user.pinHash) {
      throw new Error("This account uses Firebase. Sign in with email and password.");
    }
    const pinHash = await hashPin(args.pin);
    if (pinHash !== user.pinHash) throw new Error("Invalid email or PIN");
    return toPublicUser(user);
  },
});

export const ensureFromFirebase = mutation({
  args: {
    intendedRole: v.union(
      v.literal("patient"),
      v.literal("practitioner"),
      v.literal("dietitian")
    ),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    firebaseUid: v.optional(v.string()),
  },
  returns: userReturn,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? args.email)?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Firebase account has no valid email");
    }
    const firebaseUid = identity?.subject ?? args.firebaseUid ?? `fb_${Date.now()}`;
    const tokenIdentifier = identity?.tokenIdentifier ?? `token_${firebaseUid}`;

    const byToken = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
    const byFirebase = await ctx.db
      .query("users")
      .withIndex("by_firebase", (q) => q.eq("firebaseUid", firebaseUid))
      .unique();
    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const existing = byToken ?? byFirebase ?? byEmail;
    if (existing) {
      if (!existing.active) throw new Error("Account is inactive");
      await ctx.db.patch(existing._id, {
        firebaseUid,
        tokenIdentifier,
        email,
      });
      const updated = await ctx.db.get(existing._id);
      if (!updated) throw new Error("User not found");
      return toPublicUser(updated);
    }

    const now = Date.now();
    const displayName =
      args.displayName?.trim() || identity?.name?.trim() || email.split("@")[0] || "User";
    let patientId: Id<"patients"> | undefined;
    if (args.intendedRole === "patient") {
      patientId = await ctx.db.insert("patients", {
        displayName,
        languageCode: "en-IN",
        createdAt: now,
      });
    }
    const userId = await ctx.db.insert("users", {
      email,
      firebaseUid,
      tokenIdentifier,
      role: args.intendedRole,
      displayName,
      patientId,
      active: true,
      createdAt: now,
    });
    if (patientId) {
      await ctx.db.patch(patientId, { userId });
    }
    const created = await ctx.db.get(userId);
    if (!created) throw new Error("User not found");
    return toPublicUser(created);
  },
});


export const getMe = query({
  args: { sessionUserId: v.id("users") },
  returns: v.union(userReturn, v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.sessionUserId);
    if (!user || !user.active) return null;
    return {
      _id: user._id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      patientId: user.patientId,
      active: user.active,
    };
  },
});

export const listUsers = query({
  args: { sessionUserId: v.id("users") },
  returns: v.array(userReturn),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["admin"]);
    const rows = await ctx.db.query("users").take(200);
    return rows.map((user) => ({
      _id: user._id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      patientId: user.patientId,
      active: user.active,
    }));
  },
});

export const setUserRole = mutation({
  args: {
    sessionUserId: v.id("users"),
    targetUserId: v.id("users"),
    role: roleValidator,
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionUserId, ["admin"]);
    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("User not found");
    await ctx.db.patch(args.targetUserId, {
      role: args.role,
      active: args.active ?? target.active,
    });
    await writeAudit(ctx, admin._id, "set_user_role", args.targetUserId, {
      role: args.role,
    });
    return null;
  },
});

export const listPractitioners = query({
  args: { sessionUserId: v.id("users") },
  returns: v.array(userReturn),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.sessionUserId);
    const rows = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "practitioner"))
      .take(50);
    return rows
      .filter((u) => u.active)
      .map((user) => ({
        _id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        patientId: user.patientId,
        active: user.active,
      }));
  },
});

export const listDietitians = query({
  args: { sessionUserId: v.id("users") },
  returns: v.array(userReturn),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const rows = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "dietitian"))
      .take(50);
    return rows
      .filter((u) => u.active)
      .map((user) => ({
        _id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        patientId: user.patientId,
        active: user.active,
      }));
  },
});
