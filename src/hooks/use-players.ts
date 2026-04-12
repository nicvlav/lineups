/**
 * TanStack Query hooks for Players (V2 — 11 traits, 6 capabilities)
 *
 * Fetches from the v2 players table with trait averages + computed capabilities.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { type ArchetypeScore, computeArchetypeProfile, type PlayerArchetype } from "@/lib/archetypes";
import { computeCapabilities } from "@/lib/capabilities";
import { logger } from "@/lib/logger";
import { playerRowSchema } from "@/lib/schemas";
import { categorizeError, ensureValidSession } from "@/lib/session-manager";
import { supabase } from "@/lib/supabase";
import type { PlayerCapabilities, PlayerTraits, ZoneEffectiveness } from "@/types/traits";
import { AVG_COL_TO_TRAIT, defaultTraits } from "@/types/traits";

// ─── Player Type (V2) ──────────────────────────────────────────────────────

export interface PlayerV2 {
    id: string;
    name: string;
    avatarUrl?: string;
    voteCount: number;
    createdAt?: string;
    traits: PlayerTraits;
    /** 6 display capabilities — radar chart and capability bars only */
    capabilities: PlayerCapabilities;
    /** Best-fit player type — drives label and position preference */
    archetype: PlayerArchetype;
    /** All archetype scores, sorted by quality descending (top 5 stored) */
    archetypeScores: ArchetypeScore[];
    /** Per-zone effectiveness — best archetype quality per zone (honest cross-zone view) */
    zoneEffectiveness: ZoneEffectiveness;
    /** Overall quality = primary archetype quality score */
    overall: number;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const playersKeys = {
    all: ["players"] as const,
    lists: () => [...playersKeys.all, "list"] as const,
    list: (filters?: string) => [...playersKeys.lists(), { filters }] as const,
    details: () => [...playersKeys.all, "detail"] as const,
    detail: (id: string) => [...playersKeys.details(), id] as const,
};

// ─── Conversion ─────────────────────────────────────────────────────────────

function convertRowToTraits(row: Record<string, unknown>): PlayerTraits {
    const traits = { ...defaultTraits };
    for (const [dbAvgCol, traitKey] of Object.entries(AVG_COL_TO_TRAIT)) {
        const value = row[dbAvgCol];
        if (typeof value === "number" && value > 0) {
            traits[traitKey] = value;
        } else if (typeof value === "string") {
            const num = Number.parseFloat(value);
            if (!Number.isNaN(num) && num > 0) {
                traits[traitKey] = num;
            }
        }
    }
    return traits;
}

// ─── Query ──────────────────────────────────────────────────────────────────

async function fetchPlayers(): Promise<Record<string, PlayerV2>> {
    const { data, error } = await supabase.from("players").select("*").order("name", { ascending: false });

    if (error) {
        const categorized = categorizeError(error);
        if (categorized.isAuthError) throw new Error("Session expired");
        throw error;
    }

    if (!data || data.length === 0) return {};

    const playerRecord: Record<string, PlayerV2> = {};
    for (const row of data) {
        const parsed = playerRowSchema.safeParse(row);
        if (!parsed.success) {
            logger.warn("Skipping invalid player row:", row, parsed.error.issues);
            continue;
        }
        const p = parsed.data;
        const traits = convertRowToTraits(p as Record<string, unknown>);
        // Frontend is the single source of truth. Archetype drives label, zones,
        // and overall. Capabilities are kept for the radar chart only.
        const capabilities = computeCapabilities(traits);
        const profile = computeArchetypeProfile(traits);

        playerRecord[p.id] = {
            id: p.id,
            name: p.name,
            avatarUrl: p.avatar_url ?? undefined,
            voteCount: p.vote_count ?? 0,
            createdAt: p.created_at ?? undefined,
            traits,
            capabilities,
            archetype: profile.primary,
            archetypeScores: profile.allScores.slice(0, 5),
            zoneEffectiveness: profile.zones,
            overall: Math.max(profile.zones.def, profile.zones.mid, profile.zones.att),
        };
    }

    return playerRecord;
}

export function usePlayers(options?: { refetchInterval?: number | false; refetchIntervalInBackground?: boolean }) {
    return useQuery({
        queryKey: playersKeys.all,
        queryFn: fetchPlayers,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
            if (error instanceof Error && error.message === "Session expired") return false;
            return failureCount < 3;
        },
        ...options,
    });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

interface AddPlayerParams {
    player: { id?: string; name?: string };
}

interface UpdatePlayerParams {
    id: string;
    name: string;
}

interface DeletePlayerParams {
    id: string;
}

export function useAddPlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ player }: AddPlayerParams): Promise<PlayerV2> => {
            const sessionValid = await ensureValidSession();
            if (!sessionValid) throw new Error("Session expired - please sign in again");

            const id = player.id || uuidv4();
            const name = player.name || "Player Name";

            const { error } = await supabase.from("players").insert([{ id, name, vote_count: 0 }]);

            if (error) {
                const categorized = categorizeError(error);
                if (categorized.isAuthError) throw new Error("Session expired - please sign in again");
                throw error;
            }

            const traits = { ...defaultTraits };
            const capabilities = computeCapabilities(traits);
            const profile = computeArchetypeProfile(traits);

            return {
                id,
                name,
                voteCount: 0,
                traits,
                capabilities,
                archetype: profile.primary,
                archetypeScores: profile.allScores.slice(0, 5),
                zoneEffectiveness: profile.zones,
                overall: Math.max(profile.zones.def, profile.zones.mid, profile.zones.att),
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
    });
}

export function useUpdatePlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, name }: UpdatePlayerParams): Promise<void> => {
            const sessionValid = await ensureValidSession();
            if (!sessionValid) throw new Error("Session expired - please sign in again");

            const trimmedName = name.trim();
            if (trimmedName.length < 2) throw new Error("Player name must be at least 2 characters");
            if (trimmedName.length > 50) throw new Error("Player name must be less than 50 characters");

            const { error } = await supabase.from("players").update({ name: trimmedName }).eq("id", id);

            if (error) {
                const categorized = categorizeError(error);
                if (categorized.isAuthError) throw new Error("Session expired - please sign in again");
                throw error;
            }
        },
        onMutate: async ({ id, name }) => {
            await queryClient.cancelQueries({ queryKey: playersKeys.all });
            const previousPlayers = queryClient.getQueryData<Record<string, PlayerV2>>(playersKeys.all);
            if (previousPlayers?.[id]) {
                queryClient.setQueryData(playersKeys.all, {
                    ...previousPlayers,
                    [id]: { ...previousPlayers[id], name: name.trim() },
                });
            }
            return { previousPlayers };
        },
        onError: (_error, _variables, context) => {
            if (context?.previousPlayers) {
                queryClient.setQueryData(playersKeys.all, context.previousPlayers);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
    });
}

export function useDeletePlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id }: DeletePlayerParams): Promise<void> => {
            const sessionValid = await ensureValidSession();
            if (!sessionValid) throw new Error("Session expired - please sign in again");

            const { error, count } = await supabase.from("players").delete({ count: "exact" }).eq("id", id);

            if (error) {
                const categorized = categorizeError(error);
                if (categorized.isAuthError) throw new Error("Session expired - please sign in again");
                throw error;
            }

            if (count === 0) throw new Error("Player could not be deleted - check permissions or if player has votes");
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: playersKeys.all });
            const previousPlayers = queryClient.getQueryData<Record<string, PlayerV2>>(playersKeys.all);
            if (previousPlayers) {
                const { [id]: _removed, ...remaining } = previousPlayers;
                queryClient.setQueryData(playersKeys.all, remaining);
            }
            return { previousPlayers };
        },
        onError: (_error, _variables, context) => {
            if (context?.previousPlayers) {
                queryClient.setQueryData(playersKeys.all, context.previousPlayers);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
    });
}
