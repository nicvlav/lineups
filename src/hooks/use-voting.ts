import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { playersKeys } from "@/hooks/use-players";
interface VoteData {
    playerId: string;
    votes: Record<string, number>;
}

// In-flight mutation tracker for deduplication
const inFlightVotes = new Set<string>();

interface VotingStats {
    totalPlayers: number;
    playersVoted: number;
    totalVoters: number;
}

const STAT_MAPPING: Record<string, string> = {
    anticipation: "anticipation",
    defWorkrate: "def_workrate",
    composure: "composure",
    offTheBall: "off_the_ball",
    vision: "vision",
    firstTouch: "first_touch",
    passing: "passing",
    tackling: "tackling",
    finishing: "finishing",
    speed: "speed",
    strength: "strength",
    agility: "agility",
    attWorkrate: "att_workrate",
    crossing: "crossing",
    positioning: "positioning",
    technique: "technique",
    dribbling: "dribbling",
    decisions: "decisions",
    marking: "marking",
    heading: "heading",
    aggression: "aggression",
    flair: "flair",
    longShots: "long_shots",
    stamina: "stamina",
    teamwork: "teamwork",
    determination: "determination",
    leadership: "leadership",
    concentration: "concentration",
};

// Query Keys
export const votingKeys = {
    all: ["voting"] as const,
    stats: () => [...votingKeys.all, "stats"] as const,
    userVotes: (userId: string | undefined) => [...votingKeys.all, "userVotes", userId] as const,
    playersWithVotes: () => [...votingKeys.all, "playersWithVotes"] as const,
};

// Fetch voting stats
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

// Fetch players with votes
async function fetchPlayersWithVotes(): Promise<Set<string>> {
    const { data } = await supabase.from("players").select("id").gt("vote_count", 0);
    return new Set(data?.map((p) => p.id) || []);
}

// Fetch user votes
async function fetchUserVotes(userId: string | undefined): Promise<Map<string, any>> {
    if (!userId) return new Map();

    const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

    if (!userProfile) return new Map();

    const { data } = await supabase
        .from("player_votes")
        .select(
            "player_id, created_at, anticipation, def_workrate, composure, off_the_ball, vision, first_touch, passing, tackling, finishing, speed, strength, agility, att_workrate, crossing, positioning, technique, dribbling, decisions, marking, heading, aggression, flair, long_shots, stamina, teamwork, determination, leadership, concentration"
        )
        .eq("voter_user_profile_id", userProfile.id);

    const votesMap = new Map();
    data?.forEach((voteRow) => {
        const votes: Record<string, number> = {
            anticipation: voteRow.anticipation || 0,
            defWorkrate: voteRow.def_workrate || 0,
            composure: voteRow.composure || 0,
            offTheBall: voteRow.off_the_ball || 0,
            vision: voteRow.vision || 0,
            firstTouch: voteRow.first_touch || 0,
            passing: voteRow.passing || 0,
            tackling: voteRow.tackling || 0,
            finishing: voteRow.finishing || 0,
            speed: voteRow.speed || 0,
            strength: voteRow.strength || 0,
            agility: voteRow.agility || 0,
            attWorkrate: voteRow.att_workrate || 0,
            crossing: voteRow.crossing || 0,
            positioning: voteRow.positioning || 0,
            technique: voteRow.technique || 0,
            dribbling: voteRow.dribbling || 0,
            decisions: voteRow.decisions || 0,
            marking: voteRow.marking || 0,
            heading: voteRow.heading || 0,
            aggression: voteRow.aggression || 0,
            flair: voteRow.flair || 0,
            longShots: voteRow.long_shots || 0,
            stamina: voteRow.stamina || 0,
            teamwork: voteRow.teamwork || 0,
            determination: voteRow.determination || 0,
            leadership: voteRow.leadership || 0,
            concentration: voteRow.concentration || 0,
        };

        votesMap.set(voteRow.player_id, {
            player_id: voteRow.player_id,
            votes: votes,
            created_at: voteRow.created_at,
        });
    });

    return votesMap;
}

// Submit vote to database
async function submitVoteToDatabase(voteData: VoteData, userProfileId: string) {
    const startTime = performance.now();
    console.log("🗳️ VOTING: Starting vote submission for player:", voteData.playerId);
    console.log("📊 VOTING: User profile ID:", userProfileId);

    const dbVoteData: any = {
        voter_user_profile_id: userProfileId,
        player_id: voteData.playerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    for (const [frontendKey, dbColumn] of Object.entries(STAT_MAPPING)) {
        const voteValue = voteData.votes[frontendKey];
        if (typeof voteValue === "number") {
            dbVoteData[dbColumn] = voteValue;
        }
    }

    console.log("📊 VOTING: Vote data size:", JSON.stringify(dbVoteData).length, "bytes");

    // Create a fresh AbortController for each attempt (important for retries)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        const elapsed = performance.now() - startTime;
        console.error("❌ VOTING: Request timed out after 30 seconds");
        console.error("⏱️ VOTING: Elapsed time:", elapsed.toFixed(2), "ms");
        console.error("⚠️ VOTING: Timeout increased to 30s to allow for RLS policy checks + database triggers");
        controller.abort();
    }, 30000); // Increased from 15s to 30s for better stability with RLS + triggers

    try {
        const requestStart = performance.now();
        console.log("📡 VOTING: Sending UPSERT request to Supabase...");

        const { error, status, statusText } = await supabase
            .from("player_votes")
            .upsert(dbVoteData, {
                onConflict: "player_id,voter_user_profile_id",
            })
            .abortSignal(controller.signal);

        const requestEnd = performance.now();
        const requestTime = requestEnd - requestStart;
        console.log("📡 VOTING: Supabase request completed in", requestTime.toFixed(2), "ms");
        console.log("📡 VOTING: HTTP Status:", status, statusText);

        clearTimeout(timeoutId);

        if (error) {
            console.error("❌ VOTING: Supabase error:", error);
            console.error("❌ VOTING: Error code:", error.code);
            console.error("❌ VOTING: Error message:", error.message);
            console.error("❌ VOTING: Error details:", error.details);
            console.error("❌ VOTING: Error hint:", error.hint);
            throw error;
        }

        const totalTime = performance.now() - startTime;
        console.log("✅ VOTING: Vote successfully submitted");
        console.log("⏱️ VOTING: Total operation time:", totalTime.toFixed(2), "ms");

        if (totalTime > 5000) {
            console.warn("⚠️ VOTING: Slow vote submission detected (>5s) - check database performance");
        }
    } catch (err: any) {
        clearTimeout(timeoutId);

        const totalTime = performance.now() - startTime;
        console.error("❌ VOTING: Submission failed after", totalTime.toFixed(2), "ms");
        console.error("❌ VOTING: Error name:", err?.name);
        console.error("❌ VOTING: Error message:", err?.message);
        console.error("❌ VOTING: Full error:", err);

        // Convert abort errors to more descriptive errors
        if (err.name === "AbortError" || err?.message?.includes("aborted")) {
            throw new Error("Request timed out - please try again");
        }

        throw err;
    }
}

// Hook: Voting Stats
export function useVotingStats() {
    return useQuery({
        queryKey: votingKeys.stats(),
        queryFn: fetchVotingStats,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Hook: Players with Votes
export function usePlayersWithVotes() {
    return useQuery({
        queryKey: votingKeys.playersWithVotes(),
        queryFn: fetchPlayersWithVotes,
        staleTime: 1000 * 30, // 30 seconds (more dynamic than other vote data)
    });
}

// Hook: User Votes
export function useUserVotes() {
    const { user } = useAuth();

    return useQuery({
        queryKey: votingKeys.userVotes(user?.id),
        queryFn: () => fetchUserVotes(user?.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Hook: Submit Vote Mutation
export function useSubmitVote() {
    const { user } = useAuth();
    const { players } = usePlayers();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (voteData: VoteData) => {
            console.log("🗳️ VOTING: Mutation started for player:", voteData.playerId);

            if (!user?.profile?.id) {
                console.error("❌ VOTING: User not authenticated");
                throw new Error("User not authenticated");
            }

            // Request deduplication - prevent double-submit
            const dedupeKey = `${voteData.playerId}_${user.profile.id}`;
            if (inFlightVotes.has(dedupeKey)) {
                console.warn("⚠️ VOTING: Duplicate submission blocked for player:", voteData.playerId);
                throw new Error("Vote submission already in progress for this player");
            }

            // Mark as in-flight
            inFlightVotes.add(dedupeKey);
            console.log("🔒 VOTING: Vote marked as in-flight:", dedupeKey);

            try {
                return await submitVoteToDatabase(voteData, user.profile.id);
            } finally {
                // Always remove from in-flight, even on error
                inFlightVotes.delete(dedupeKey);
                console.log("🔓 VOTING: Vote removed from in-flight:", dedupeKey);
            }
        },
        onMutate: async (voteData) => {
            console.log("🗳️ VOTING: onMutate - Optimistic update for player:", voteData.playerId);

            // Cancel outgoing refetches to prevent race conditions
            await queryClient.cancelQueries({ queryKey: votingKeys.userVotes(user?.id) });

            // Snapshot previous value for rollback
            const previousVotes = queryClient.getQueryData<Map<string, any>>(votingKeys.userVotes(user?.id));

            // Optimistically update with timestamp to prevent stale data override
            const optimisticTimestamp = Date.now();
            queryClient.setQueryData<Map<string, any>>(votingKeys.userVotes(user?.id), (old) => {
                const updated = new Map(old || new Map());
                updated.set(voteData.playerId, {
                    player_id: voteData.playerId,
                    votes: voteData.votes,
                    created_at: new Date().toISOString(),
                    isPending: true,
                    optimisticTimestamp, // Track when optimistic update was applied
                });
                return updated;
            });

            // Show loading toast
            const player = players[voteData.playerId];
            const toastId = toast.loading(`Submitting vote for ${player?.name || "player"}...`, {
                icon: "⏳",
                duration: Infinity, // Prevent auto-dismiss
            });

            return {
                previousVotes,
                toastId,
                playerName: player?.name || "player",
                optimisticTimestamp // Pass timestamp to onSuccess for comparison
            };
        },
        onError: (err, voteData, context) => {
            console.error("❌ VOTING: onError triggered for player:", voteData.playerId, err);

            // Rollback optimistic update
            if (context?.previousVotes) {
                queryClient.setQueryData(votingKeys.userVotes(user?.id), context.previousVotes);
            }

            // Show error toast (onSettled will dismiss loading toast)
            const errorMessage = err instanceof Error ? err.message : String(err);
            toast.error(`Failed to submit vote for ${context?.playerName || "player"}`, {
                description: errorMessage,
                duration: 4000,
                icon: "❌",
            });
        },
        onSuccess: (_, voteData, context) => {
            console.log("✅ VOTING: onSuccess - Vote submitted successfully for player:", voteData.playerId);

            // Show success toast (onSettled will dismiss loading toast)
            toast.success(`Vote submitted for ${context?.playerName || "player"}`, {
                duration: 2000,
                icon: "✅",
            });

            // Invalidate and refetch - including players cache for updated aggregates
            queryClient.invalidateQueries({ queryKey: votingKeys.userVotes(user?.id) });
            queryClient.invalidateQueries({ queryKey: votingKeys.playersWithVotes() });
            queryClient.invalidateQueries({ queryKey: votingKeys.stats() });
            queryClient.invalidateQueries({ queryKey: playersKeys.all }); // ← Refetch players to get updated aggregates from DB trigger
        },
        onSettled: (_data, error, voteData, context) => {
            console.log("🏁 VOTING: onSettled - Mutation completed for player:", voteData.playerId, {
                success: !error,
                error: error?.message,
            });

            // CRITICAL: Always dismiss toast when mutation completes (success or failure)
            if (context?.toastId) {
                toast.dismiss(context.toastId);
            }
        },
        retry: (failureCount, error: any) => {
            console.log(`🔄 VOTING: Retry check - attempt ${failureCount}/3`, error?.message);

            // Don't retry auth errors
            if (error?.message?.includes("not authenticated")) {
                console.log("⏭️ VOTING: Skipping retry for auth error");
                return false;
            }

            // Retry up to 3 times for other errors
            return failureCount < 3;
        },
        retryDelay: (attemptIndex) => {
            const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
            console.log(`⏱️ VOTING: Retry delay: ${delay}ms for attempt ${attemptIndex + 1}`);
            return delay;
        },
    });
}
