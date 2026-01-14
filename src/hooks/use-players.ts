/**
 * TanStack Query hooks for Players
 *
 * Features:
 * - Automatic caching and background refetch
 * - Pre-mutation session validation
 * - Optimistic updates for mutations
 * - Loading and error states
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { ensureValidSession, categorizeError } from "@/lib/session-manager";
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
// STAT CONVERSION UTILITIES
// =====================================================

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

function convertPlayerStatsToColumns(stats: PlayerStats): Record<string, number> {
    const columns: Record<string, number> = {};
    for (const [dbColumn, statKey] of Object.entries(statMapping)) {
        columns[dbColumn] = Math.round(stats[statKey] / 10);
    }
    return columns;
}

function convertColumnsToPlayerStats(player: Record<string, unknown>): PlayerStats {
    const stats = { ...defaultStatScores };
    for (const [dbColumn, statKey] of Object.entries(statMapping)) {
        const value = player[dbColumn];
        if (typeof value === "number" && value > 0) {
            stats[statKey] = value * 10;
        } else if (typeof value === "string") {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > 0) {
                stats[statKey] = numValue * 10;
            }
        }
    }
    return stats;
}

// =====================================================
// QUERY FUNCTIONS
// =====================================================

async function fetchPlayers(): Promise<Record<string, Player>> {
    const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("name", { ascending: false });

    if (error) {
        const categorized = categorizeError(error);
        if (categorized.isAuthError) {
            throw new Error("Session expired");
        }
        throw error;
    }

    if (!data || data.length === 0) {
        return {};
    }

    const playerRecord: Record<string, Player> = {};
    for (const player of data) {
        playerRecord[player.id] = {
            id: player.id,
            name: player.name,
            vote_count: player.vote_count || 0,
            created_at: player.created_at,
            stats: convertColumnsToPlayerStats(player as Record<string, unknown>),
        };
    }

    return playerRecord;
}

// =====================================================
// QUERIES
// =====================================================

export function usePlayers(options?: {
    refetchInterval?: number | false;
    refetchIntervalInBackground?: boolean;
}) {
    return useQuery({
        queryKey: playersKeys.all,
        queryFn: fetchPlayers,
        staleTime: 10 * 60 * 1000,        // 10 min - players change rarely
        gcTime: 30 * 60 * 1000,            // 30 min - keep in cache longer
        refetchOnWindowFocus: 'always',    // Always check when returning
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
            if (error instanceof Error && error.message === "Session expired") {
                return false;
            }
            return failureCount < 3;
        },
        ...options,
    });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useAddPlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ player }: AddPlayerParams): Promise<Player> => {
            const sessionValid = await ensureValidSession();
            if (!sessionValid) {
                throw new Error("Session expired - please sign in again");
            }

            const playerStats = player.stats || defaultStatScores;
            const newPlayer: Player = {
                id: player.id || uuidv4(),
                name: player.name || "Player Name",
                vote_count: 0,
                stats: playerStats,
            };

            const { error } = await supabase
                .from("players")
                .insert([{
                    id: newPlayer.id,
                    name: newPlayer.name,
                    vote_count: 0,
                    ...convertPlayerStatsToColumns(playerStats),
                }]);

            if (error) {
                const categorized = categorizeError(error);
                if (categorized.isAuthError) {
                    throw new Error("Session expired - please sign in again");
                }
                throw error;
            }

            return newPlayer;
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
            if (!sessionValid) {
                throw new Error("Session expired - please sign in again");
            }

            const trimmedName = name.trim();
            if (trimmedName.length < 2) {
                throw new Error("Player name must be at least 2 characters");
            }
            if (trimmedName.length > 50) {
                throw new Error("Player name must be less than 50 characters");
            }

            const { error } = await supabase
                .from("players")
                .update({ name: trimmedName })
                .eq("id", id);

            if (error) {
                const categorized = categorizeError(error);
                if (categorized.isAuthError) {
                    throw new Error("Session expired - please sign in again");
                }
                throw error;
            }
        },
        onMutate: async ({ id, name }) => {
            await queryClient.cancelQueries({ queryKey: playersKeys.all });

            const previousPlayers = queryClient.getQueryData<Record<string, Player>>(playersKeys.all);

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
            if (!sessionValid) {
                throw new Error("Session expired - please sign in again");
            }

            const { error, count } = await supabase
                .from("players")
                .delete({ count: 'exact' })
                .eq("id", id);

            if (error) {
                const categorized = categorizeError(error);
                if (categorized.isAuthError) {
                    throw new Error("Session expired - please sign in again");
                }
                throw error;
            }

            if (count === 0) {
                throw new Error("Player could not be deleted - check permissions or if player has votes");
            }
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: playersKeys.all });

            const previousPlayers = queryClient.getQueryData<Record<string, Player>>(playersKeys.all);

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
