/**
 * Zod schemas for runtime validation at system boundaries.
 *
 * Every piece of external data — Supabase responses, IndexedDB reads,
 * URL state — passes through one of these schemas before entering the app.
 */

import { z } from "zod";
import { STAT_TO_DB } from "@/lib/stat-mapping";

// =====================================================
// POSITION ENUM (shared across schemas)
// =====================================================

const positionEnum = z.enum(["GK", "CB", "FB", "DM", "CM", "WM", "AM", "ST", "WR"]);

// =====================================================
// SUPABASE: players TABLE
// =====================================================

/** Stat columns generated from STAT_TO_DB — no second list to maintain */
const statColumnSchemas = Object.fromEntries(
    Object.values(STAT_TO_DB).map((dbCol) => [`${dbCol}_avg`, z.number().nullable().optional()])
);

/** Raw row from `supabase.from("players").select("*")` */
export const playerRowSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        vote_count: z.number().nullable().optional(),
        created_at: z.string().nullable().optional(),
        avatar_url: z.string().nullable().optional(),
        ...statColumnSchemas,
    })
    .passthrough();

// =====================================================
// SUPABASE: user_profiles TABLE
// =====================================================

/** Raw row from `supabase.from("user_profiles").select("*")` */
export const userProfileRowSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    squad_id: z.string().nullable(),
    associated_player_id: z.string().nullable(),
    is_verified: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
});

// =====================================================
// SUPABASE: squads TABLE
// =====================================================

/** Raw row from `supabase.from("squads").select("*")` */
export const squadRowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
});

// =====================================================
// GAME STATE (IndexedDB + URL)
// =====================================================

const pointSchema = z.object({
    x: z.number(),
    y: z.number(),
});

/** Minimum shape for a persisted GamePlayer. `.passthrough()` preserves zoneFit, stats, etc. */
const gamePlayerSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        isGuest: z.boolean(),
        team: z.string(),
        position: pointSchema,
        exactPosition: positionEnum,
    })
    .passthrough();

const formationPositionsSchema = z.object({
    GK: z.number(),
    CB: z.number(),
    FB: z.number(),
    DM: z.number(),
    CM: z.number(),
    WM: z.number(),
    AM: z.number(),
    ST: z.number(),
    WR: z.number(),
});

const formationSchema = z.object({
    name: z.string(),
    positions: formationPositionsSchema,
});

/** Persisted game state from IndexedDB or URL-decoded LZ-string */
export const gameStateSchema = z.object({
    gamePlayers: z.record(z.string(), gamePlayerSchema),
    currentFormation: formationSchema.nullable().optional(),
});
