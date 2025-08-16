/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as calls from "../calls.js";
import type * as callsHandler from "../callsHandler.js";
import type * as consent from "../consent.js";
import type * as conversations from "../conversations.js";
import type * as identity from "../identity.js";
import type * as intro from "../intro.js";
import type * as match from "../match.js";
import type * as memory from "../memory.js";
import type * as migrations_migrateCallSummary from "../migrations/migrateCallSummary.js";
import type * as profile from "../profile.js";
import type * as vapiSync from "../vapiSync.js";
import type * as whatsapp from "../whatsapp.js";
import type * as whatsappMemory from "../whatsappMemory.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  calls: typeof calls;
  callsHandler: typeof callsHandler;
  consent: typeof consent;
  conversations: typeof conversations;
  identity: typeof identity;
  intro: typeof intro;
  match: typeof match;
  memory: typeof memory;
  "migrations/migrateCallSummary": typeof migrations_migrateCallSummary;
  profile: typeof profile;
  vapiSync: typeof vapiSync;
  whatsapp: typeof whatsapp;
  whatsappMemory: typeof whatsappMemory;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
