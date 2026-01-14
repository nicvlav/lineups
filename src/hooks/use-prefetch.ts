/**
 * Prefetching Utilities
 *
 * Prefetch data the user is likely to need soon.
 * Runs in the background without blocking the UI.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { playersKeys } from "./use-players";
import { votingKeys } from "./use-voting";

/**
 * Prefetch players data in the background
 * Call this on pages where players list will be needed soon
 */
export function usePrefetchPlayers() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Only prefetch if data doesn't exist or is stale
        queryClient.prefetchQuery({
            queryKey: playersKeys.all,
            queryFn: async () => {
                const { data } = await supabase.from("players").select("*").order("name", { ascending: false });
                return data || [];
            },
            staleTime: 10 * 60 * 1000, // Match main query
        });
    }, [queryClient]);
}

/**
 * Prefetch voting stats in the background
 */
export function usePrefetchVotingStats() {
    const queryClient = useQueryClient();

    useEffect(() => {
        queryClient.prefetchQuery({
            queryKey: votingKeys.stats(),
            queryFn: async () => {
                const [playersCount, playersWithVotes, totalVoters] = await Promise.all([
                    supabase.from("players").select("id", { count: "exact", head: true }),
                    supabase.from("players").select("id", { count: "exact", head: true }).gt("vote_count", 0),
                    supabase
                        .from("user_profiles")
                        .select("user_id", { count: "exact", head: true })
                        .eq("is_verified", true),
                ]);
                return {
                    totalPlayers: playersCount.count || 0,
                    playersVoted: playersWithVotes.count || 0,
                    totalVoters: totalVoters.count || 0,
                };
            },
            staleTime: 2 * 60 * 1000,
        });
    }, [queryClient]);
}

/**
 * Prefetch all common data
 * Use on the home page or main layout
 */
export function usePrefetchCommonData() {
    usePrefetchPlayers();
    usePrefetchVotingStats();
}
