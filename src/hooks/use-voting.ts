import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { playersKeys } from "@/hooks/use-players";
import { categorizeError, ensureValidSession } from "@/lib/session-manager";
import { supabase } from "@/lib/supabase";

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

    const { data: userProfile } = await supabase.from("user_profiles").select("id").eq("user_id", userId).single();

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const { error } = await supabase
            .from("player_votes")
            .upsert(dbVoteData, {
                onConflict: "player_id,voter_user_profile_id",
            })
            .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
            const categorized = categorizeError(error);
            if (categorized.isAuthError) {
                throw new Error("Session expired - please sign in again");
            }
            throw error;
        }
    } catch (err: any) {
        clearTimeout(timeoutId);

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
        staleTime: 2 * 60 * 1000, // 2 min - more dynamic
        refetchOnWindowFocus: true, // Check when user returns
    });
}

// Hook: Players with Votes
export function usePlayersWithVotes() {
    return useQuery({
        queryKey: votingKeys.playersWithVotes(),
        queryFn: fetchPlayersWithVotes,
        staleTime: 1000 * 30,
    });
}

// Hook: User Votes
export function useUserVotes() {
    const { user } = useAuth();

    return useQuery({
        queryKey: votingKeys.userVotes(user?.id),
        queryFn: () => fetchUserVotes(user?.id),
        enabled: !!user,
        staleTime: 30 * 1000, // 30 sec - very fresh (user's own data)
        refetchOnWindowFocus: true, // Always fresh when they return
    });
}

// Hook: Submit Vote Mutation
export function useSubmitVote() {
    const { user } = useAuth();
    const { players } = usePlayers();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (voteData: VoteData) => {
            const sessionValid = await ensureValidSession();
            if (!sessionValid) {
                throw new Error("Session expired - please sign in again");
            }

            if (!user?.profile?.id) {
                throw new Error("User not authenticated");
            }

            // Request deduplication
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

            const previousVotes = queryClient.getQueryData<Map<string, any>>(votingKeys.userVotes(user?.id));

            const optimisticTimestamp = Date.now();
            queryClient.setQueryData<Map<string, any>>(votingKeys.userVotes(user?.id), (old) => {
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

            return {
                previousVotes,
                toastId,
                playerName: player?.name || "player",
                optimisticTimestamp,
            };
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
            toast.success(`Vote submitted for ${context?.playerName || "player"}`, {
                duration: 2000,
            });

            queryClient.invalidateQueries({ queryKey: votingKeys.userVotes(user?.id) });
            queryClient.invalidateQueries({ queryKey: votingKeys.playersWithVotes() });
            queryClient.invalidateQueries({ queryKey: votingKeys.stats() });
            queryClient.invalidateQueries({ queryKey: playersKeys.all });
        },
        onSettled: (_data, _error, _voteData, context) => {
            if (context?.toastId) {
                toast.dismiss(context.toastId);
            }
        },
        retry: (failureCount, error: any) => {
            if (error?.message?.includes("Session expired") || error?.message?.includes("not authenticated")) {
                return false;
            }
            return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}
