/**
 * Auth Context
 *
 * IMPORTANT: Per Supabase docs, onAuthStateChange callbacks must NOT call
 * other Supabase methods as this causes deadlocks. Profile loading is
 * deferred outside the callback using setTimeout(..., 0).
 *
 * See: https://github.com/supabase/gotrue-js/issues/762
 */

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { clearVoteData } from "@/lib/session-manager";
import { useQueryClient } from "@tanstack/react-query";
import { userProfileKeys, squadKeys } from "@/hooks/use-user-profile";

// =====================================================
// TYPES
// =====================================================

interface Squad {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface UserProfile {
    id: string;
    user_id: string;
    squad_id: string | null;
    associated_player_id: string | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

interface AuthUser {
    id: string;
    email: string | null;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
    profile?: UserProfile;
}

interface AuthContextProps {
    user: AuthUser | null;
    session: Session | null;
    urlState: string | null;
    canVote: boolean;
    isVerified: boolean;
    needsVerification: boolean;
    loading: boolean;
    signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithFacebook: () => Promise<{ error: AuthError | null }>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    forceSignOut: () => Promise<void>;
    clearUrlState: () => void;
    updateAssociatedPlayer: (playerId: string | null) => Promise<{ error: AuthError | null }>;
    validateSquad: (squadId: string) => Promise<{ valid: boolean; error?: string }>;
    verifySquad: (squadId: string) => Promise<{ error: AuthError | null }>;
    assignPlayer: (playerId: string | null) => Promise<{ error: AuthError | null }>;
    verifySquadAndPlayer: (squadId: string, playerId: string | null, createNew?: boolean, newPlayerName?: string) => Promise<{ error: AuthError | null }>;
    getAvailableSquads: () => Promise<Squad[]>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// =====================================================
// PROVIDER
// =====================================================

interface AuthProviderProps {
    children: ReactNode;
    url: string | null;
}

export const AuthProvider = ({ children, url }: AuthProviderProps) => {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [urlState, setUrlState] = useState<string | null>(url);
    const [canVote, setCanVote] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [loading, setLoading] = useState(true);

    // Ref to track current user for callbacks (prevents stale closure)
    const userRef = useRef<AuthUser | null>(null);
    useEffect(() => { userRef.current = user; }, [user]);

    // =====================================================
    // PROFILE LOADING (called OUTSIDE of onAuthStateChange)
    // =====================================================

    const loadUserProfile = useCallback(async (supabaseUser: User): Promise<void> => {
        try {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', supabaseUser.id)
                .single();

            // Profile doesn't exist - create it
            if (error?.code === 'PGRST116') {
                const { data: newProfile, error: createError } = await supabase
                    .from('user_profiles')
                    .insert({ user_id: supabaseUser.id, is_verified: false })
                    .select()
                    .single();

                if (createError && createError.code !== '23505') {
                    console.error('Failed to create user profile:', createError);
                }

                setUser({
                    id: supabaseUser.id,
                    email: supabaseUser.email || null,
                    user_metadata: supabaseUser.user_metadata,
                    app_metadata: supabaseUser.app_metadata,
                    profile: newProfile || undefined,
                });
                return;
            }

            if (error) {
                console.error('Error loading profile:', error);
            }

            setUser({
                id: supabaseUser.id,
                email: supabaseUser.email || null,
                user_metadata: supabaseUser.user_metadata,
                app_metadata: supabaseUser.app_metadata,
                profile: profile || undefined,
            });
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Set user without profile on error
            setUser({
                id: supabaseUser.id,
                email: supabaseUser.email || null,
                user_metadata: supabaseUser.user_metadata,
                app_metadata: supabaseUser.app_metadata,
            });
        }
    }, []);

    // =====================================================
    // INITIALIZATION & AUTH STATE LISTENER
    // =====================================================

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                // Use getUser() for initial load - makes network request to verify session
                const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

                if (error) {
                    // Not authenticated or session invalid - this is fine
                    if (error.message !== 'Auth session missing!') {
                        console.error('Error getting user:', error);
                    }
                } else if (supabaseUser && mounted) {
                    // Get session for storage (non-blocking)
                    const { data: { session } } = await supabase.auth.getSession();
                    setSession(session);
                    await loadUserProfile(supabaseUser);
                }
            } catch (error) {
                console.error('Failed to initialize auth:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initialize();

        // Listen for auth state changes
        // CRITICAL: Do NOT call any Supabase methods inside this callback!
        // This causes deadlocks. Instead, defer work using setTimeout.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                if (!mounted) return;

                // Update session state immediately (no Supabase calls)
                setSession(newSession);

                if (newSession?.user) {
                    // DEFER profile loading outside the callback to prevent deadlock
                    setTimeout(() => {
                        if (mounted) {
                            loadUserProfile(newSession.user);
                        }
                    }, 0);
                } else {
                    setUser(null);
                    if (event === 'SIGNED_OUT') {
                        setCanVote(false);
                        setIsVerified(false);
                        setNeedsVerification(false);
                    }
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadUserProfile]);

    // =====================================================
    // PERMISSION TRACKING
    // =====================================================

    useEffect(() => {
        if (!user || loading) {
            setCanVote(false);
            setIsVerified(false);
            setNeedsVerification(false);
            return;
        }

        const profile = user.profile;
        const hasSquad = !!profile?.squad_id;
        const hasPlayerAssignment = profile?.associated_player_id !== undefined;
        const isFullyVerified = !!(profile?.is_verified && hasSquad && hasPlayerAssignment);

        setIsVerified(isFullyVerified);
        setNeedsVerification(!isFullyVerified);
        setCanVote(isFullyVerified);
    }, [user, loading]);

    // =====================================================
    // LOADING TIMEOUT
    // =====================================================

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('Auth initialization timeout');
                setLoading(false);
            }
        }, 10000);

        return () => clearTimeout(timeout);
    }, [loading]);

    // =====================================================
    // AUTH METHODS
    // =====================================================

    const signUpWithEmail = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signInWithFacebook = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    scopes: 'email',
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const updatePassword = async (newPassword: string) => {
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const handleSignOut = async () => {
        // Clear local state
        setUser(null);
        setSession(null);
        setCanVote(false);
        setIsVerified(false);
        setNeedsVerification(false);

        // Clear vote data
        clearVoteData(userRef.current?.id);

        // Sign out from Supabase
        try {
            await supabase.auth.signOut();
        } catch {
            // Ignore errors - local state is already cleared
        }
    };

    const signOut = async () => {
        try {
            await handleSignOut();
            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const forceSignOut = async () => {
        await handleSignOut();
    };

    const clearUrlState = () => {
        setUrlState(null);
    };

    // =====================================================
    // PROFILE METHODS
    // =====================================================

    const updateAssociatedPlayer = async (playerId: string | null) => {
        if (!user) {
            return { error: { message: 'User not authenticated' } as AuthError };
        }

        try {
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    associated_player_id: playerId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            setUser(prev => prev ? {
                ...prev,
                profile: { ...prev.profile!, associated_player_id: playerId, updated_at: new Date().toISOString() }
            } : null);

            queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(user.id) });
            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const getAvailableSquads = async (): Promise<Squad[]> => {
        try {
            const cached = queryClient.getQueryData<Squad[]>(squadKeys.list());
            if (cached) return cached;

            const { data, error } = await supabase
                .from('squads')
                .select('*')
                .order('name');

            if (error) throw error;

            queryClient.setQueryData(squadKeys.list(), data || []);
            return data || [];
        } catch {
            return [];
        }
    };

    const validateSquad = async (squadId: string): Promise<{ valid: boolean; error?: string }> => {
        try {
            const { error } = await supabase
                .from('squads')
                .select('id')
                .eq('id', squadId)
                .single();

            if (error?.code === 'PGRST116') {
                return { valid: false, error: 'Squad not found' };
            }
            if (error) throw error;

            return { valid: true };
        } catch {
            return { valid: false, error: 'Failed to validate squad' };
        }
    };

    const verifySquad = async (squadId: string) => {
        if (!user) {
            return { error: { message: 'User not authenticated' } as AuthError };
        }

        try {
            const validation = await validateSquad(squadId);
            if (!validation.valid) {
                return { error: { message: validation.error || 'Invalid squad' } as AuthError };
            }

            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    squad_id: squadId,
                    is_verified: false,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            setUser(prev => prev ? {
                ...prev,
                profile: { ...prev.profile!, squad_id: squadId, is_verified: false, updated_at: new Date().toISOString() }
            } : null);

            queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(user.id) });
            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const assignPlayer = async (playerId: string | null) => {
        if (!user) {
            return { error: { message: 'User not authenticated' } as AuthError };
        }

        if (!user.profile?.squad_id) {
            return { error: { message: 'Squad verification required first' } as AuthError };
        }

        try {
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    squad_id: user.profile.squad_id,
                    associated_player_id: playerId,
                    is_verified: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            setUser(prev => prev ? {
                ...prev,
                profile: {
                    ...prev.profile!,
                    associated_player_id: playerId,
                    is_verified: true,
                    updated_at: new Date().toISOString()
                }
            } : null);

            queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(user.id) });
            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const verifySquadAndPlayer = async (
        squadId: string,
        playerId: string | null,
        createNew: boolean = false,
        newPlayerName?: string
    ) => {
        if (!user) {
            return { error: { message: 'User not authenticated' } as AuthError };
        }

        try {
            let finalPlayerId = playerId;

            if (createNew && newPlayerName) {
                const { data: newPlayer, error: playerError } = await supabase
                    .from('players')
                    .insert({ name: newPlayerName.trim(), vote_count: 0 })
                    .select()
                    .single();

                if (playerError) throw playerError;
                finalPlayerId = newPlayer.id;
            }

            if (!finalPlayerId) {
                return { error: { message: 'Player ID is required' } as AuthError };
            }

            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    squad_id: squadId,
                    associated_player_id: finalPlayerId,
                    is_verified: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            setUser(prev => prev ? {
                ...prev,
                profile: {
                    ...prev.profile!,
                    squad_id: squadId,
                    associated_player_id: finalPlayerId,
                    is_verified: true,
                    updated_at: new Date().toISOString()
                }
            } : null);

            queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(user.id) });
            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    // =====================================================
    // RENDER
    // =====================================================

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground">Initializing...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            user,
            session,
            urlState,
            canVote,
            isVerified,
            needsVerification,
            loading,
            signUpWithEmail,
            signInWithEmail,
            signInWithFacebook,
            resetPassword,
            updatePassword,
            signOut,
            forceSignOut,
            clearUrlState,
            updateAssociatedPlayer,
            validateSquad,
            verifySquad,
            assignPlayer,
            verifySquadAndPlayer,
            getAvailableSquads
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
