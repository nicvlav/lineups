/**
 * TanStack Query hooks for Players
 *
 * Migrated from PlayersProvider context to modern server state management
 *
 * Features:
 * - Automatic caching and background refetch
 * - Real-time subscriptions via Supabase
 * - Optimistic updates for mutations
 * - Loading and error states
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { handleDatabaseError } from "@/lib/session-manager";
import { defaultStatScores, PlayerStats } from "@/types/stats";
import { Player } from "@/types/players";

// =====================================================
// QUERY KEYS
// =====================================================

export const playersKeys = {
    all: ["players"] as const,
    lists: () => [...playersKeys.all, "list"] as const,
    list: (filters?: string) => [...playersKeys.lists(), { filters }] as const,
    details: () => [...playersKeys.all, "detail"] as const,
    detail: (id: string) => [...playersKeys.details(), id] as const,
};

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface AddPlayerParams {
    player: Partial<Player>;
}

interface DeletePlayerParams {
    id: string;
}

interface UpdatePlayerParams {
    id: string;
    name: string;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Convert PlayerStats (0-100) to individual stat columns (0-10) for database insert
 */
const convertPlayerStatsToIndividualColumns = (stats: PlayerStats) => {
    return {
        anticipation_avg: Math.round(stats.anticipation / 10),
        def_workrate_avg: Math.round(stats.defWorkrate / 10),
        composure_avg: Math.round(stats.composure / 10),
        off_the_ball_avg: Math.round(stats.offTheBall / 10),
        vision_avg: Math.round(stats.vision / 10),
        first_touch_avg: Math.round(stats.firstTouch / 10),
        passing_avg: Math.round(stats.passing / 10),
        tackling_avg: Math.round(stats.tackling / 10),
        finishing_avg: Math.round(stats.finishing / 10),
        speed_avg: Math.round(stats.speed / 10),
        strength_avg: Math.round(stats.strength / 10),
        agility_avg: Math.round(stats.agility / 10),
        att_workrate_avg: Math.round(stats.attWorkrate / 10),
        crossing_avg: Math.round(stats.crossing / 10),
        positioning_avg: Math.round(stats.positioning / 10),
        technique_avg: Math.round(stats.technique / 10),
        dribbling_avg: Math.round(stats.dribbling / 10),
        decisions_avg: Math.round(stats.decisions / 10),
        marking_avg: Math.round(stats.marking / 10),
        heading_avg: Math.round(stats.heading / 10),
        aggression_avg: Math.round(stats.aggression / 10),
        flair_avg: Math.round(stats.flair / 10),
        long_shots_avg: Math.round(stats.longShots / 10),
        stamina_avg: Math.round(stats.stamina / 10),
        teamwork_avg: Math.round(stats.teamwork / 10),
        determination_avg: Math.round(stats.determination / 10),
        leadership_avg: Math.round(stats.leadership / 10),
        concentration_avg: Math.round(stats.concentration / 10),
    };
};

/**
 * Convert individual player stat columns (0-10) to PlayerStats (0-100)
 */
const convertIndividualStatsToPlayerStats = (player: any): PlayerStats => {
    const stats = { ...defaultStatScores };

    // Map database AGGREGATE column names to stat keys and convert 0-10 to 0-100 scale
    const statMapping: Record<string, keyof PlayerStats> = {
        anticipation_avg: "anticipation",
        def_workrate_avg: "defWorkrate",
        composure_avg: "composure",
        off_the_ball_avg: "offTheBall",
        vision_avg: "vision",
        first_touch_avg: "firstTouch",
        passing_avg: "passing",
        tackling_avg: "tackling",
        finishing_avg: "finishing",
        speed_avg: "speed",
        strength_avg: "strength",
        agility_avg: "agility",
        att_workrate_avg: "attWorkrate",
        crossing_avg: "crossing",
        positioning_avg: "positioning",
        technique_avg: "technique",
        dribbling_avg: "dribbling",
        decisions_avg: "decisions",
        marking_avg: "marking",
        heading_avg: "heading",
        aggression_avg: "aggression",
        flair_avg: "flair",
        long_shots_avg: "longShots",
        stamina_avg: "stamina",
        teamwork_avg: "teamwork",
        determination_avg: "determination",
        leadership_avg: "leadership",
        concentration_avg: "concentration",
    };

    for (const [dbColumn, statKey] of Object.entries(statMapping)) {
        const value = player[dbColumn];
        if (typeof value === "number" && value > 0) {
            // Convert 0-10 to 0-100 scale, only if value > 0 (has votes)
            stats[statKey] = value * 10;
        } else if (typeof value === "string") {
            // Handle string numbers from database
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > 0) {
                stats[statKey] = numValue * 10;
            }
        }
    }

    return stats;
};

// =====================================================
// QUERY FUNCTIONS
// =====================================================

/**
 * Fetch all players from database
 */
async function fetchPlayers(): Promise<Record<string, Player>> {
    if (!supabase) {
        console.log("PLAYERS: No Supabase client available");
        return {};
    }

    console.log("PLAYERS: Starting player fetch...");

    const { data, error } = await supabase
        .from("players")
        .select(
            `
            id,
            name,
            vote_count,
            anticipation_avg,
            def_workrate_avg,
            composure_avg,
            off_the_ball_avg,
            vision_avg,
            first_touch_avg,
            passing_avg,
            tackling_avg,
            finishing_avg,
            speed_avg,
            strength_avg,
            agility_avg,
            att_workrate_avg,
            crossing_avg,
            positioning_avg,
            technique_avg,
            dribbling_avg,
            decisions_avg,
            marking_avg,
            heading_avg,
            aggression_avg,
            flair_avg,
            long_shots_avg,
            stamina_avg,
            teamwork_avg,
            determination_avg,
            leadership_avg,
            concentration_avg,
            created_at,
            updated_at
        `
        )
        .order("name", { ascending: false });

    if (error) {
        console.error("PLAYERS: Error fetching players:", error);
        await handleDatabaseError(error, "fetch players");
        throw error;
    }

    if (!data || data.length === 0) {
        console.warn("PLAYERS: No players found in database");
        return {};
    }

    console.log(`PLAYERS: Fetched ${data.length} players successfully`);

    const playerRecord: Record<string, Player> = {};
    data.forEach((player) => {
        try {
            const effectiveStats = convertIndividualStatsToPlayerStats(player);

            playerRecord[player.id] = {
                ...player,
                stats: effectiveStats,
                vote_count: player.vote_count || 0,
            };
        } catch (statError) {
            console.error(
                `PLAYERS: Error processing player ${player.name}:`,
                statError
            );
        }
    });

    console.log(
        `PLAYERS: Player fetch complete, ${Object.keys(playerRecord).length} players processed`
    );

    return playerRecord;
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook to fetch all players
 *
 * @param options - Optional TanStack Query options (e.g., refetchInterval for background refresh)
 * @returns Query result with players data, loading, and error states
 *
 * @example
 * // Basic usage:
 * const { data: players, isLoading, error } = usePlayers();
 *
 * // With background refresh (voting page):
 * const { data: players } = usePlayers({
 *   refetchInterval: 30000, // 30s background refresh
 *   refetchIntervalInBackground: false
 * });
 */
export function usePlayers(options?: {
    refetchInterval?: number | false;
    refetchIntervalInBackground?: boolean;
}) {
    return useQuery({
        queryKey: playersKeys.all,
        queryFn: fetchPlayers,
        staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true, // Refetch when internet reconnects
        ...options, // Allow override with custom options
    });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook to add a new player
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * const addPlayerMutation = useAddPlayer();
 *
 * function handleAddPlayer() {
 *   addPlayerMutation.mutate(
 *     { player: { name: "John Doe" } },
 *     {
 *       onSuccess: (newPlayer) => {
 *         console.log("Player added:", newPlayer);
 *       }
 *     }
 *   );
 * }
 */
export function useAddPlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ player }: AddPlayerParams): Promise<Player> => {
            if (!supabase) {
                throw new Error("Supabase client not available");
            }

            const startTime = performance.now();
            const playerStats = player.stats ? player.stats : defaultStatScores;
            const newPlayer: Player = {
                id: player.id ? player.id : uuidv4(),
                name: player.name ? player.name : "Player Name",
                vote_count: 0,
                stats: playerStats,
            };

            // Convert stats to individual columns for database
            const individualColumns =
                convertPlayerStatsToIndividualColumns(playerStats);

            console.log("PLAYERS: Adding new player:", newPlayer.name);

            // Create AbortController for timeout handling (same pattern as voting)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                const elapsed = performance.now() - startTime;
                console.error("❌ PLAYERS: Insert timed out after 30 seconds");
                console.error("⏱️ PLAYERS: Elapsed time:", elapsed.toFixed(2), "ms");
                controller.abort();
            }, 30000);

            try {
                const requestStart = performance.now();
                console.log("📡 PLAYERS: Sending INSERT request to Supabase...");

                const { error } = await supabase
                    .from("players")
                    .insert([
                        {
                            id: newPlayer.id,
                            name: newPlayer.name,
                            vote_count: 0,
                            ...individualColumns,
                        },
                    ])
                    .abortSignal(controller.signal);

                const requestEnd = performance.now();
                const requestTime = requestEnd - requestStart;
                console.log("📡 PLAYERS: Supabase request completed in", requestTime.toFixed(2), "ms");

                clearTimeout(timeoutId);

                if (error) {
                    console.error("❌ PLAYERS: Error adding player:", error);
                    console.error("❌ PLAYERS: Error code:", error.code);
                    console.error("❌ PLAYERS: Error message:", error.message);
                    throw error;
                }

                const totalTime = performance.now() - startTime;
                console.log("✅ PLAYERS: Player added successfully");
                console.log("⏱️ PLAYERS: Total operation time:", totalTime.toFixed(2), "ms");

                if (totalTime > 5000) {
                    console.warn("⚠️ PLAYERS: Slow insert detected (>5s) - check database performance");
                }

                return newPlayer;
            } catch (err: any) {
                clearTimeout(timeoutId);
                const totalTime = performance.now() - startTime;
                console.error("❌ PLAYERS: Insert failed after", totalTime.toFixed(2), "ms");
                console.error("❌ PLAYERS: Error name:", err?.name);
                console.error("❌ PLAYERS: Error message:", err?.message);

                if (err.name === "AbortError" || err?.message?.includes("aborted")) {
                    throw new Error("Request timed out - please try again");
                }

                throw err;
            }
        },
        onSuccess: () => {
            console.log("PLAYERS: Invalidating queries after add");
            // Invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
        onError: (error) => {
            console.error("PLAYERS: Add player mutation failed:", error);
        },
    });
}

/**
 * Hook to update a player's name
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * const updatePlayerMutation = useUpdatePlayer();
 *
 * function handleUpdatePlayer(playerId: string, newName: string) {
 *   updatePlayerMutation.mutate(
 *     { id: playerId, name: newName },
 *     {
 *       onSuccess: () => {
 *         console.log("Player name updated");
 *       }
 *     }
 *   );
 * }
 */
export function useUpdatePlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, name }: UpdatePlayerParams): Promise<void> => {
            if (!supabase) {
                throw new Error("Supabase client not available");
            }

            // Validate name
            const trimmedName = name.trim();
            if (trimmedName.length < 2) {
                throw new Error("Player name must be at least 2 characters");
            }
            if (trimmedName.length > 50) {
                throw new Error("Player name must be less than 50 characters");
            }

            console.log("PLAYERS: Updating player:", id, "to", trimmedName);

            const { error } = await supabase
                .from("players")
                .update({
                    name: trimmedName,
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) {
                console.error("PLAYERS: Error updating player:", error);
                throw error;
            }

            console.log("✅ PLAYERS: Player updated successfully");
        },
        onMutate: async ({ id, name }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: playersKeys.all });

            // Snapshot previous value
            const previousPlayers = queryClient.getQueryData<Record<string, Player>>(
                playersKeys.all
            );

            // Optimistically update player name
            if (previousPlayers && previousPlayers[id]) {
                const updated = {
                    ...previousPlayers,
                    [id]: {
                        ...previousPlayers[id],
                        name: name.trim(),
                    },
                };
                queryClient.setQueryData(playersKeys.all, updated);
                console.log("PLAYERS: Optimistic update applied for", id);
            }

            // Return context with previous value
            return { previousPlayers };
        },
        onError: (error, _variables, context) => {
            // Rollback on error
            if (context?.previousPlayers) {
                queryClient.setQueryData(playersKeys.all, context.previousPlayers);
                console.log("PLAYERS: Rollback optimistic update");
            }
            console.error("PLAYERS: Update player mutation failed:", error);
        },
        onSuccess: () => {
            console.log("PLAYERS: Invalidating queries after update");
            // Invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
    });
}

/**
 * Hook to delete a player
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * const deletePlayerMutation = useDeletePlayer();
 *
 * function handleDeletePlayer(playerId: string) {
 *   deletePlayerMutation.mutate(
 *     { id: playerId },
 *     {
 *       onSuccess: () => {
 *         console.log("Player deleted");
 *       }
 *     }
 *   );
 * }
 */
export function useDeletePlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id }: DeletePlayerParams): Promise<void> => {
            if (!supabase) {
                throw new Error("Supabase client not available");
            }

            const startTime = performance.now();
            console.log("PLAYERS: Deleting player:", id);

            // Create AbortController for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                const elapsed = performance.now() - startTime;
                console.error("❌ PLAYERS: Delete timed out after 30 seconds");
                console.error("⏱️ PLAYERS: Elapsed time:", elapsed.toFixed(2), "ms");
                controller.abort();
            }, 30000);

            try {
                const requestStart = performance.now();
                console.log("📡 PLAYERS: Sending DELETE request to Supabase...");

                const { error, status, statusText, count } = await supabase
                    .from("players")
                    .delete({ count: 'exact' })
                    .eq("id", id)
                    .abortSignal(controller.signal);

                const requestEnd = performance.now();
                const requestTime = requestEnd - requestStart;
                console.log("📡 PLAYERS: Supabase request completed in", requestTime.toFixed(2), "ms");
                console.log("📡 PLAYERS: HTTP Status:", status, statusText);
                console.log("📡 PLAYERS: Rows affected:", count);

                clearTimeout(timeoutId);

                if (error) {
                    console.error("❌ PLAYERS: Error deleting player:", error);
                    console.error("❌ PLAYERS: Error code:", error.code);
                    console.error("❌ PLAYERS: Error message:", error.message);
                    console.error("❌ PLAYERS: Error details:", error.details);
                    console.error("❌ PLAYERS: Error hint:", error.hint);
                    throw error;
                }

                if (count === 0) {
                    console.warn("⚠️ PLAYERS: Delete succeeded but no rows affected - check RLS policies");
                    throw new Error("Player could not be deleted - check permissions or if player has votes");
                }

                const totalTime = performance.now() - startTime;
                console.log("✅ PLAYERS: Player deleted successfully");
                console.log("⏱️ PLAYERS: Total operation time:", totalTime.toFixed(2), "ms");

                if (totalTime > 5000) {
                    console.warn("⚠️ PLAYERS: Slow delete detected (>5s) - check database performance");
                }
            } catch (err: any) {
                clearTimeout(timeoutId);
                const totalTime = performance.now() - startTime;
                console.error("❌ PLAYERS: Delete failed after", totalTime.toFixed(2), "ms");
                console.error("❌ PLAYERS: Error name:", err?.name);
                console.error("❌ PLAYERS: Error message:", err?.message);

                if (err.name === "AbortError" || err?.message?.includes("aborted")) {
                    throw new Error("Request timed out - please try again");
                }

                throw err;
            }
        },
        onMutate: async ({ id }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: playersKeys.all });

            // Snapshot previous value
            const previousPlayers = queryClient.getQueryData<Record<string, Player>>(
                playersKeys.all
            );

            // Optimistically update to remove player
            if (previousPlayers) {
                const { [id]: removed, ...remaining } = previousPlayers;
                queryClient.setQueryData(playersKeys.all, remaining);
                console.log("PLAYERS: Optimistic delete applied");
            }

            // Return context with previous value
            return { previousPlayers };
        },
        onError: (error, _variables, context) => {
            // Rollback on error
            if (context?.previousPlayers) {
                queryClient.setQueryData(playersKeys.all, context.previousPlayers);
                console.log("PLAYERS: Rollback optimistic delete");
            }
            console.error("PLAYERS: Delete player mutation failed:", error);
        },
        onSuccess: () => {
            console.log("PLAYERS: Invalidating queries after delete");
            // Invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
    });
}
