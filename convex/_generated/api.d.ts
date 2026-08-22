/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminOps from "../adminOps.js";
import type * as auth from "../auth.js";
import type * as clinical from "../clinical.js";
import type * as diet from "../diet.js";
import type * as documents from "../documents.js";
import type * as lib_hash from "../lib/hash.js";
import type * as lib_pin from "../lib/pin.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as messaging from "../messaging.js";
import type * as visits from "../visits.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminOps: typeof adminOps;
  auth: typeof auth;
  clinical: typeof clinical;
  diet: typeof diet;
  documents: typeof documents;
  "lib/hash": typeof lib_hash;
  "lib/pin": typeof lib_pin;
  "lib/rbac": typeof lib_rbac;
  messaging: typeof messaging;
  visits: typeof visits;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
