/**
 * TanStack Query hooks for Voting (V2 — 11 traits, 1-100 scale)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { playersKeys, usePlayers } from "@/hooks/use-players";
import { categorizeError, ensureValidSession } from "@/lib/session-manager";
import { supabase } from "@/lib/supabase";
import { TRAIT_TO_DB } from "@/types/traits";

interface VoteData {
    playerId: string;
    votes: Record<string, number>; // traitKey (camelCase) → rating (1-100)
}

export interface UserVoteEntry {
    player_id: string;
    votes: Record<string, number>;
    created_at: string;
    isPending?: boolean;
    optimisticTimestamp?: number;
}

// In-flight mutation tracker for deduplication
const inFlightVotes = new Set<string>();

interface VotingStats {
    totalPlayers: number;
    playersVoted: number;
    totalVoters: number;
}

// Query Keys
export const votingKeys = {
    all: ["voting"] as const,
    stats: () => [...votingKeys.all, "stats"] as const,
    userVotes: (userId: string | undefined) => [...votingKeys.all, "userVotes", userId] as const,
    playersWithVotes: () => [...votingKeys.all, "playersWithVotes"] as const,
};

async function fetchVotingStats(): Promise<VotingStats> {
    const [playersCountResponse, playersWithVotesResponse, totalVotersResponse] = await Promise.all([
        supabase.from("players").select("id", { count: "exact", head: true }),
        supabase.from("players").select("id", { count: "exact", head: true }).gt("vote_count", 0),
        supabase.from("user_profiles").select("user_id", { count: "exact", head: true }).eq("is_verified", true),
    ]);

    return {
        totalPlayers: playersCountResponse.count || 0,
        playersVoted: playersWithVotesResponse.count || 0,
        totalVoters: totalVotersResponse.count || 0,
    };
}

async function fetchPlayersWithVotes(): Promise<Set<string>> {
    const { data } = await supabase.from("players").select("id").gt("vote_count", 0);
    return new Set(data?.map((p) => p.id) || []);
}

/** Fetch user's votes — 11 traits per player */
async function fetchUserVotes(userId: string | undefined): Promise<Map<string, UserVoteEntry>> {
    if (!userId) return new Map();

    const { data: userProfile } = await supabase.from("user_profiles").select("id").eq("user_id", userId).single();
    if (!userProfile) return new Map();

    const { data } = await supabase
        .from("player_votes")
        .select(
            "player_id, created_at, speed, stamina, strength, tackling, passing, dribbling, shooting, game_sense, flair, att_intent, def_intent"
        )
        .eq("voter_id", userProfile.id);

    const votesMap = new Map<string, UserVoteEntry>();
    for (const row of data ?? []) {
        if (!row.player_id) continue;

        const votes: Record<string, number> = {
            speed: row.speed || 50,
            stamina: row.stamina || 50,
            strength: row.strength || 50,
            tackling: row.tackling || 50,
            passing: row.passing || 50,
            dribbling: row.dribbling || 50,
            shooting: row.shooting || 50,
            gameSense: row.game_sense || 50,
            flair: row.flair || 50,
            attIntent: row.att_intent || 50,
            defIntent: row.def_intent || 50,
        };

        votesMap.set(row.player_id, {
            player_id: row.player_id,
            votes,
            created_at: row.created_at,
        });
    }

    return votesMap;
}

/** Submit vote — upserts 11 trait columns on player_votes */
async function submitVoteToDatabase(voteData: VoteData, userProfileId: string) {
    const dbVoteData: Record<string, string | number> = {
        voter_id: userProfileId,
        player_id: voteData.playerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    for (const [frontendKey, dbColumn] of Object.entries(TRAIT_TO_DB)) {
        const voteValue = voteData.votes[frontendKey];
        if (typeof voteValue === "number") {
            dbVoteData[dbColumn] = voteValue;
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const { error } = await supabase
            .from("player_votes")
            .upsert(dbVoteData, { onConflict: "player_id,voter_id" })
            .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
            const categorized = categorizeError(error);
            if (categorized.isAuthError) throw new Error("Session expired - please sign in again");
            throw error;
        }
    } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof Error && (err.name === "AbortError" || err.message?.includes("aborted"))) {
            throw new Error("Request timed out - please try again");
        }
        throw err;
    }
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useVotingStats() {
    return useQuery({
        queryKey: votingKeys.stats(),
        queryFn: fetchVotingStats,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: true,
    });
}

export function usePlayersWithVotes() {
    return useQuery({
        queryKey: votingKeys.playersWithVotes(),
        queryFn: fetchPlayersWithVotes,
        staleTime: 1000 * 30,
    });
}

export function useUserVotes() {
    const { user } = useAuth();

    return useQuery({
        queryKey: votingKeys.userVotes(user?.id),
        queryFn: () => fetchUserVotes(user?.id),
        enabled: !!user,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
    });
}

export function useSubmitVote() {
    const { user } = useAuth();
    const { data: players = {} } = usePlayers();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (voteData: VoteData) => {
            const sessionValid = await ensureValidSession();
            if (!sessionValid) throw new Error("Session expired - please sign in again");
            if (!user?.profile?.id) throw new Error("User not authenticated");

            const dedupeKey = `${voteData.playerId}_${user.profile.id}`;
            if (inFlightVotes.has(dedupeKey)) {
                throw new Error("Vote submission already in progress for this player");
            }

            inFlightVotes.add(dedupeKey);
            try {
                return await submitVoteToDatabase(voteData, user.profile.id);
            } finally {
                inFlightVotes.delete(dedupeKey);
            }
        },
        onMutate: async (voteData) => {
            await queryClient.cancelQueries({ queryKey: votingKeys.userVotes(user?.id) });
            const previousVotes = queryClient.getQueryData<Map<string, UserVoteEntry>>(votingKeys.userVotes(user?.id));

            const optimisticTimestamp = Date.now();
            queryClient.setQueryData<Map<string, UserVoteEntry>>(votingKeys.userVotes(user?.id), (old) => {
                const updated = new Map(old || new Map());
                updated.set(voteData.playerId, {
                    player_id: voteData.playerId,
                    votes: voteData.votes,
                    created_at: new Date().toISOString(),
                    isPending: true,
                    optimisticTimestamp,
                });
                return updated;
            });

            const player = players[voteData.playerId];
            const toastId = toast.loading(`Submitting vote for ${player?.name || "player"}...`, {
                duration: Infinity,
            });

            return { previousVotes, toastId, playerName: player?.name || "player", optimisticTimestamp };
        },
        onError: (err, _voteData, context) => {
            if (context?.previousVotes) {
                queryClient.setQueryData(votingKeys.userVotes(user?.id), context.previousVotes);
            }
            const errorMessage = err instanceof Error ? err.message : String(err);
            toast.error(`Failed to submit vote for ${context?.playerName || "player"}`, {
                description: errorMessage,
                duration: 4000,
            });
        },
        onSuccess: (_, _voteData, context) => {
            toast.success(`Vote submitted for ${context?.playerName || "player"}`, { duration: 2000 });
            queryClient.invalidateQueries({ queryKey: votingKeys.userVotes(user?.id) });
            queryClient.invalidateQueries({ queryKey: votingKeys.playersWithVotes() });
            queryClient.invalidateQueries({ queryKey: votingKeys.stats() });
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
        onSettled: (_data, _error, _voteData, context) => {
            if (context?.toastId) toast.dismiss(context.toastId);
        },
        retry: (failureCount, error: Error) => {
            if (error.message?.includes("Session expired") || error.message?.includes("not authenticated"))
                return false;
            return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}
