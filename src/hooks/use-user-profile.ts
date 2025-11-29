/**
 * TanStack Query hooks for User Profiles
 *
 * Extracted from AuthContext to leverage modern server state management
 * for profile and squad data fetching.
 *
 * Features:
 * - Automatic caching of user profiles
 * - Squad list caching and background refetch
 * - Optimistic updates for profile mutations
 * - Loading and error states
 *
 * Note: Auth state (user, session) remains in AuthContext using
 * supabase.auth.onAuthStateChange() - this is ONLY for data fetching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// =====================================================
// QUERY KEYS
// =====================================================

export const userProfileKeys = {
    all: ["userProfile"] as const,
    details: () => [...userProfileKeys.all, "detail"] as const,
    detail: (userId: string) => [...userProfileKeys.details(), userId] as const,
};

export const squadKeys = {
    all: ["squads"] as const,
    lists: () => [...squadKeys.all, "list"] as const,
    list: () => [...squadKeys.lists()] as const,
};

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface UserProfile {
    id: string;
    user_id: string;
    squad_id: string | null;
    associated_player_id: string | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface Squad {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface UpdateProfileParams {
    userId: string;
    updates: Partial<UserProfile>;
}

interface VerifySquadParams {
    userId: string;
    squadId: string;
}

interface AssignPlayerParams {
    userId: string;
    playerId: string | null;
    squadId: string;
}

// =====================================================
// QUERY FUNCTIONS
// =====================================================

/**
 * Fetch user profile by user ID
 */
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) {
        console.log("USER_PROFILE: No Supabase client available");
        return null;
    }

    console.log("USER_PROFILE: Fetching profile for user:", userId);

    const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error) {
        // Profile doesn't exist yet (PGRST116 = not found)
        if (error.code === "PGRST116") {
            console.log("USER_PROFILE: Profile not found, will create on mutation");
            return null;
        }
        console.error("USER_PROFILE: Error fetching profile:", error);
        throw error;
    }

    console.log("USER_PROFILE: Profile fetched successfully");
    return data;
}

/**
 * Fetch all available squads
 */
async function fetchSquads(): Promise<Squad[]> {
    if (!supabase) {
        console.log("SQUADS: No Supabase client available");
        return [];
    }

    console.log("SQUADS: Fetching available squads...");

    const { data, error } = await supabase
        .from("squads")
        .select("*")
        .order("name");

    if (error) {
        console.error("SQUADS: Error fetching squads:", error);
        throw error;
    }

    console.log(`SQUADS: Fetched ${data?.length || 0} squads successfully`);
    return data || [];
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook to fetch user profile
 *
 * @param userId - The user ID to fetch profile for
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with profile data, loading, and error states
 *
 * @example
 * const { data: profile, isLoading } = useUserProfile(user.id);
 * if (isLoading) return <Loading />;
 * return <ProfileCard profile={profile} />;
 */
export function useUserProfile(userId: string | null | undefined, enabled = true) {
    return useQuery({
        queryKey: userProfileKeys.detail(userId || ""),
        queryFn: () => fetchUserProfile(userId!),
        enabled: enabled && !!userId,
        staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 1, // Only retry once for profile fetches
    });
}

/**
 * Hook to fetch available squads
 *
 * @returns Query result with squads data, loading, and error states
 *
 * @example
 * const { data: squads, isLoading } = useSquads();
 * if (isLoading) return <Loading />;
 * return <SquadSelector squads={squads} />;
 */
export function useSquads() {
    return useQuery({
        queryKey: squadKeys.list(),
        queryFn: fetchSquads,
        staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes (squads don't change often)
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook to update user profile
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * const updateProfileMutation = useUpdateProfile();
 *
 * updateProfileMutation.mutate({
 *   userId: user.id,
 *   updates: { associated_player_id: "player-123" }
 * });
 */
export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            updates,
        }: UpdateProfileParams): Promise<UserProfile> => {
            if (!supabase) {
                throw new Error("Supabase client not available");
            }

            console.log("USER_PROFILE: Updating profile for user:", userId);

            const { data, error } = await supabase
                .from("user_profiles")
                .upsert(
                    {
                        user_id: userId,
                        ...updates,
                        updated_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "user_id",
                    }
                )
                .select()
                .single();

            if (error) {
                console.error("USER_PROFILE: Error updating profile:", error);
                throw error;
            }

            console.log("✅ USER_PROFILE: Profile updated successfully");
            return data;
        },
        onSuccess: (data) => {
            // Update cache with new profile data
            queryClient.setQueryData(
                userProfileKeys.detail(data.user_id),
                data
            );
            console.log("USER_PROFILE: Cache updated with new profile");
        },
        onError: (error) => {
            console.error("USER_PROFILE: Update mutation failed:", error);
        },
    });
}

/**
 * Hook to verify squad (Step 1 of verification)
 *
 * Sets the squad_id but keeps is_verified = false until player assignment
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * const verifySquadMutation = useVerifySquad();
 *
 * verifySquadMutation.mutate({
 *   userId: user.id,
 *   squadId: "squad-123"
 * });
 */
export function useVerifySquad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            squadId,
        }: VerifySquadParams): Promise<UserProfile> => {
            if (!supabase) {
                throw new Error("Supabase client not available");
            }

            console.log("USER_PROFILE: Verifying squad:", squadId);

            // First validate the squad exists
            const { error: squadError } = await supabase
                .from("squads")
                .select("id")
                .eq("id", squadId)
                .single();

            if (squadError) {
                if (squadError.code === "PGRST116") {
                    throw new Error("Squad not found");
                }
                throw squadError;
            }

            // Update user profile with squad_id
            const { data, error } = await supabase
                .from("user_profiles")
                .upsert(
                    {
                        user_id: userId,
                        squad_id: squadId,
                        is_verified: false, // Will be set to true after player assignment
                        updated_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "user_id",
                    }
                )
                .select()
                .single();

            if (error) {
                console.error("USER_PROFILE: Error verifying squad:", error);
                throw error;
            }

            console.log("✅ USER_PROFILE: Squad verified successfully");
            return data;
        },
        onSuccess: (data) => {
            // Update cache
            queryClient.setQueryData(
                userProfileKeys.detail(data.user_id),
                data
            );
            console.log("USER_PROFILE: Cache updated after squad verification");
        },
        onError: (error) => {
            console.error("USER_PROFILE: Squad verification failed:", error);
        },
    });
}

/**
 * Hook to assign player (Step 2 of verification)
 *
 * Sets the associated_player_id and is_verified = true
 *
 * @returns Mutation object with mutate function and state
 *
 * @example
 * const assignPlayerMutation = useAssignPlayer();
 *
 * assignPlayerMutation.mutate({
 *   userId: user.id,
 *   squadId: "squad-123",
 *   playerId: "player-456"
 * });
 */
export function useAssignPlayer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            playerId,
            squadId,
        }: AssignPlayerParams): Promise<UserProfile> => {
            if (!supabase) {
                throw new Error("Supabase client not available");
            }

            console.log("USER_PROFILE: Assigning player:", playerId);

            const { data, error } = await supabase
                .from("user_profiles")
                .upsert(
                    {
                        user_id: userId,
                        squad_id: squadId,
                        associated_player_id: playerId,
                        is_verified: true, // Now fully verified
                        updated_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "user_id",
                    }
                )
                .select()
                .single();

            if (error) {
                console.error("USER_PROFILE: Error assigning player:", error);
                throw error;
            }

            console.log("✅ USER_PROFILE: Player assigned successfully");
            return data;
        },
        onSuccess: (data) => {
            // Update cache
            queryClient.setQueryData(
                userProfileKeys.detail(data.user_id),
                data
            );
            console.log("USER_PROFILE: Cache updated after player assignment");
        },
        onError: (error) => {
            console.error("USER_PROFILE: Player assignment failed:", error);
        },
    });
}
