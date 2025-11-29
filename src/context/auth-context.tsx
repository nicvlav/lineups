import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { refreshSession, checkSessionHealth, clearCorruptedAppData, clearVoteData } from "@/lib/session-manager";
import { useQueryClient } from "@tanstack/react-query";
import { userProfileKeys, squadKeys } from "@/hooks/use-user-profile";

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
    // Email auth methods
    signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    // OAuth methods
    signInWithFacebook: () => Promise<{ error: AuthError | null }>;
    // Password reset
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
    // Session management
    signOut: () => Promise<{ error: AuthError | null }>;
    forceSignOut: () => Promise<void>;
    refreshSessionIfNeeded: () => Promise<boolean>;
    clearUrlState: () => void;
    // Profile management
    updateAssociatedPlayer: (playerId: string | null) => Promise<{ error: AuthError | null }>;
    validateSquad: (squadId: string) => Promise<{ valid: boolean; error?: string }>;
    verifySquad: (squadId: string) => Promise<{ error: AuthError | null }>;
    assignPlayer: (playerId: string | null) => Promise<{ error: AuthError | null }>;
    verifySquadAndPlayer: (squadId: string, playerId: string | null, createNew?: boolean, newPlayerName?: string) => Promise<{ error: AuthError | null }>;
    getAvailableSquads: () => Promise<Squad[]>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    url: string | null;
}

export const AuthProvider = ({ children, url }: AuthProviderProps) => {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [canVote, setCanVote] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [urlState, setUrlState] = useState<string | null>(url);
    const [loading, setLoading] = useState(true);

    // Set up auth state listener
    useEffect(() => {
        let mounted = true;

        // Get initial session
        const getInitialSession = async () => {
            // Check for mobile mode switch scenario
            const fbDebug = localStorage.getItem('fb_auth_debug');
            if (fbDebug) {
                localStorage.removeItem('fb_auth_debug');
            }
            
            try {
                // Since SupabaseProvider ensures Supabase is ready, we can call directly
                const { data: { session }, error } = await supabase.auth.getSession();
                
                // Simple mobile recovery check - don't let this block the main flow
                if (!session && !error) {
                    try {
                        // Quick check for mobile recovery tokens (non-blocking)
                        const mobileRecovery = localStorage.getItem('mobile_session_recovery');
                        if (mobileRecovery) {
                            const recoveryData = JSON.parse(mobileRecovery);
                            if (recoveryData.access_token && Date.now() - recoveryData.timestamp < 3600000) {
                                // Quick session restore attempt
                                const { data: recovered } = await supabase.auth.setSession({
                                    access_token: recoveryData.access_token,
                                    refresh_token: recoveryData.refresh_token || ''
                                });
                                if (recovered.session) {
                                    localStorage.removeItem('mobile_session_recovery');
                                }
                            } else {
                                localStorage.removeItem('mobile_session_recovery');
                            }
                        }
                    } catch (recoveryError) {
                        console.error('AUTH: Mobile recovery failed:', recoveryError);
                        localStorage.removeItem('mobile_session_recovery');
                    }
                }
                
                if (error) {
                    console.error('AUTH: Error getting session:', error);
                } else if (mounted && session?.user) {
                    setSession(session);
                    
                    // Since SupabaseProvider ensures connection is ready, transformUser should work reliably
                    const authUser = await transformUser(session.user);
                    if (authUser === null) {
                        setSession(null);
                        setUser(null);
                    } else {
                        setUser(authUser);
                    }
                } else if (mounted) {
                    setSession(session);
                    setUser(null);
                }
            } catch (error) {
                console.error('AUTH: Failed to get initial session:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                
                if (mounted) {
                    setSession(session);
                    if (session?.user) {
                        try {
                            const authUser = await transformUser(session.user);
                            if (authUser === null) {
                                setSession(null);
                                setUser(null);
                            } else {
                                setUser(authUser);
                            }
                        } catch (error) {
                            console.error('Failed to transform user:', error);
                            setSession(null);
                            setUser(null);
                        }
                    } else {
                        setUser(null);
                    }
                    
                    // Handle different auth events
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
    }, []);

    // Check permissions when user changes
    useEffect(() => {
        if (!user || loading) {
            setCanVote(false);
            setIsVerified(false);
            setNeedsVerification(false);
            return;
        }

        const profile = user.profile;
        
        // Two-step verification process:
        // Step 1: Has squad_id (squad verified)
        // Step 2: Has associated_player_id AND is_verified = true (player assigned)
        
        const hasSquad = !!profile?.squad_id;
        const hasPlayerAssignment = profile?.associated_player_id !== undefined; // null or string, but not undefined
        const isFullyVerified = !!(profile?.is_verified && hasSquad && hasPlayerAssignment);
        
        setIsVerified(isFullyVerified);
        
        // User needs verification if they don't have a squad OR don't have player assignment
        const needsVerif = !isFullyVerified;
        setNeedsVerification(needsVerif);
        
        // Can vote: only fully verified users (squad + player assignment)
        setCanVote(isFullyVerified);
    }, [user, loading]);

    // Transform Supabase User to our AuthUser type
    const transformUser = async (user: User): Promise<AuthUser | null> => {
        try {
            // Since we have a valid session from getSession(), trust it
            // The extra getUser() validation was causing false positives with 403 errors

            // Load user profile with associated player
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            // If profile doesn't exist, try to create it
            if (error && error.code === 'PGRST116') {
                console.log('Creating missing user profile for:', user.id);
                try {
                    const { data: newProfile, error: createError } = await supabase
                        .from('user_profiles')
                        .insert({
                            user_id: user.id,
                            is_verified: false
                        })
                        .select()
                        .single();
                    
                    if (createError) {
                        // If it's a duplicate key error, the profile already exists - that's fine
                        if (createError.code === '23505') {
                            console.log('Profile already exists (created elsewhere), fetching existing profile');
                            const { data: existingProfile } = await supabase
                                .from('user_profiles')
                                .select('*')
                                .eq('user_id', user.id)
                                .single();
                            
                            return {
                                id: user.id,
                                email: user.email || null,
                                user_metadata: user.user_metadata,
                                app_metadata: user.app_metadata,
                                profile: existingProfile || undefined,
                            };
                        }
                        
                        console.error('Failed to create user profile:', createError);
                        // If we can't create profile, create user without profile
                        return {
                            id: user.id,
                            email: user.email || null,
                            user_metadata: user.user_metadata,
                            app_metadata: user.app_metadata,
                            profile: undefined,
                        };
                    }
                    
                    return {
                        id: user.id,
                        email: user.email || null,
                        user_metadata: user.user_metadata,
                        app_metadata: user.app_metadata,
                        profile: newProfile || undefined,
                    };
                } catch (profileError) {
                    console.error('Exception creating profile:', profileError);
                    // Return user without profile instead of signing out
                    return {
                        id: user.id,
                        email: user.email || null,
                        user_metadata: user.user_metadata,
                        app_metadata: user.app_metadata,
                        profile: undefined,
                    };
                }
            }

            if (error && error.code !== 'PGRST116') {
                console.error('Database error loading profile:', error);
                // For other database errors, still create user but without profile
                // Don't force sign out unless it's critical
                return {
                    id: user.id,
                    email: user.email || null,
                    user_metadata: user.user_metadata,
                    app_metadata: user.app_metadata,
                    profile: undefined,
                };
            }

            return {
                id: user.id,
                email: user.email || null,
                user_metadata: user.user_metadata,
                app_metadata: user.app_metadata,
                profile: profile || undefined,
            };
        } catch (error) {
            console.error('Error transforming user:', error);
            // On unexpected errors, create minimal user instead of force sign out
            // This prevents unnecessary sign-outs due to temporary network issues
            return {
                id: user.id,
                email: user.email || null,
                user_metadata: user.user_metadata,
                app_metadata: user.app_metadata,
                profile: undefined,
            };
        }
    };

    // Auth methods
    const signUpWithEmail = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            });

            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signInWithFacebook = async () => {
        try {
            // Store debug info and mobile state to survive redirects
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const currentViewport = window.innerWidth;
            
            localStorage.setItem('fb_auth_debug', JSON.stringify({
                timestamp: new Date().toISOString(),
                step: 'oauth_initiated',
                url: window.location.href,
                isMobileDevice,
                currentViewport,
                userAgent: navigator.userAgent
            }));
            
            console.log('🚀 Starting Facebook OAuth...', { isMobileDevice, currentViewport });
            
            console.log('📞 Calling Supabase signInWithOAuth...');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    scopes: 'email',
                    redirectTo: `${window.location.origin}/auth/callback` // Use callback for better debugging
                }
            });

            console.log('📦 OAuth response:', { data, error });
            
            if (error) {
                console.error('❌ OAuth initiation error:', error);
                localStorage.setItem('fb_auth_debug', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    step: 'oauth_error',
                    error: error.message,
                    isMobileDevice,
                    currentViewport
                }));
            }

            return { error };
        } catch (error) {
            console.error('💥 Unexpected error in signInWithFacebook:', error);
            localStorage.setItem('fb_auth_debug', JSON.stringify({
                timestamp: new Date().toISOString(),
                step: 'unexpected_error',
                error: error instanceof Error ? error.message : String(error)
            }));
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
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const signOut = async () => {
        try {
            console.log('🚪 AUTH: Starting sign out process...');
            
            // Clear vote data before signing out
            await clearVoteData(user?.id);
            
            // Clear local state immediately to ensure UI updates
            setUser(null);
            setSession(null);
            setCanVote(false);
            setIsVerified(false);
            setNeedsVerification(false);
            
            // Sign out from Supabase with timeout protection
            console.log('🚪 AUTH: Calling supabase.auth.signOut()...');
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise<{ error: AuthError }>((_, reject) =>
                setTimeout(() => reject(new Error('Sign out timeout')), 10000)
            );
            
            const { error } = await Promise.race([signOutPromise, timeoutPromise]);
            
            if (error) {
                console.error('AUTH: Supabase sign out error:', error);
                // Even if Supabase fails, we've cleared local state
            } else {
                console.log('✅ AUTH: Sign out completed successfully');
            }
            
            return { error };
        } catch (error) {
            console.error('AUTH: Unexpected sign out error:', error);
            
            // Ensure local state is cleared even on errors
            setUser(null);
            setSession(null);
            setCanVote(false);
            setIsVerified(false);
            setNeedsVerification(false);
            
            return { error: error as AuthError };
        }
    };

    const forceSignOut = async () => {
        try {
            // Clear all local state immediately
            setUser(null);
            setSession(null);
            setCanVote(false);
            setIsVerified(false);
            setNeedsVerification(false);
            
            // Clear vote data first
            await clearVoteData(user?.id);
            
            // Use modern targeted clearing instead of nuclear approach
            await clearCorruptedAppData({ 
                preserveAuth: false, // We're signing out, so clear auth too
                preserveUserData: false,
                preserveGameData: true, // Always preserve game data - it works without auth
                userId: user?.id 
            });
            
            // Force sign out from Supabase
            await supabase.auth.signOut();
            
            console.log('🔄 Force sign out completed - all state cleared');
        } catch (error) {
            console.error('Error during force sign out:', error);
        }
    };

    const refreshSessionIfNeeded = async (): Promise<boolean> => {
        try {
            const healthCheck = await checkSessionHealth();
            
            if (!healthCheck.isHealthy) {
                console.log('🔄 AUTH: Session unhealthy, attempting recovery...');
                
                if (healthCheck.needsRefresh) {
                    const refreshResult = await refreshSession();
                    if (refreshResult.success) {
                        console.log('✅ AUTH: Session refreshed successfully');
                        return true;
                    }
                    
                    if (refreshResult.shouldSignOut) {
                        console.log('🚪 AUTH: Session refresh failed, signing out...');
                        await forceSignOut();
                        return false;
                    }
                }
                
                return false;
            }
            
            if (healthCheck.needsRefresh) {
                console.log('🔄 AUTH: Proactive token refresh...');
                const refreshResult = await refreshSession();
                return refreshResult.success;
            }
            
            return true;
        } catch (error) {
            console.error('AUTH: Error checking session health:', error);
            return false;
        }
    };

    const clearUrlState = () => {
        setUrlState(null);
    };

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
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            // Update local user state
            setUser(prev => prev ? {
                ...prev,
                profile: {
                    ...prev.profile!,
                    associated_player_id: playerId,
                    updated_at: new Date().toISOString()
                }
            } : null);

            // Invalidate TanStack Query cache
            queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(user.id) });

            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const getAvailableSquads = async (): Promise<Squad[]> => {
        try {
            // Try to get from TanStack Query cache first
            const cachedSquads = queryClient.getQueryData<Squad[]>(squadKeys.list());
            if (cachedSquads) {
                console.log('AUTH: Returning cached squads');
                return cachedSquads;
            }

            // If not in cache, fetch and cache
            const { data, error } = await supabase
                .from('squads')
                .select('*')
                .order('name');

            if (error) throw error;

            // Cache the result
            queryClient.setQueryData(squadKeys.list(), data || []);

            return data || [];
        } catch (error) {
            console.error('Error fetching squads:', error);
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

            if (error) {
                if (error.code === 'PGRST116') {
                    return { valid: false, error: 'Squad not found' };
                }
                throw error;
            }

            return { valid: true };
        } catch (error) {
            console.error('Error validating squad:', error);
            return { valid: false, error: 'Failed to validate squad' };
        }
    };

    const verifySquad = async (squadId: string) => {
        if (!user) {
            return { error: { message: 'User not authenticated' } as AuthError };
        }

        try {
            // First validate the squad exists
            const validation = await validateSquad(squadId);
            if (!validation.valid) {
                return { error: { message: validation.error || 'Invalid squad' } as AuthError };
            }

            // Update user profile with squad_id but keep is_verified = false until player assignment
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    squad_id: squadId,
                    is_verified: false, // Will be set to true after player assignment
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            // Update local user state
            setUser(prev => prev ? {
                ...prev,
                profile: {
                    ...prev.profile!,
                    squad_id: squadId,
                    is_verified: false,
                    updated_at: new Date().toISOString()
                }
            } : null);

            // Invalidate TanStack Query cache
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
            // Update user profile with player assignment and set is_verified = true
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    squad_id: user.profile.squad_id, // Keep existing squad_id
                    associated_player_id: playerId,
                    is_verified: true, // Now fully verified
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            // Update local user state
            setUser(prev => prev ? {
                ...prev,
                profile: {
                    ...prev.profile!,
                    associated_player_id: playerId,
                    is_verified: true,
                    updated_at: new Date().toISOString()
                }
            } : null);

            // Invalidate TanStack Query cache
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

            // If creating a new player, create it first
            if (createNew && newPlayerName) {
                const { data: newPlayer, error: playerError } = await supabase
                    .from('players')
                    .insert({
                        name: newPlayerName.trim(),
                        // Individual stat columns with default values (5/10 = 50/100)
                        speed_avg: 5,
                        vision_avg: 5,
                        agility_avg: 5,
                        heading_avg: 5,
                        blocking_avg: 5,
                        crossing_avg: 5,
                        strength_avg: 5,
                        stamina_avg: 5,
                        tackling_avg: 5,
                        teamwork_avg: 5,
                        dribbling_avg: 5,
                        finishing_avg: 5,
                        long_shots_avg: 5,
                        aggression_avg: 5,
                        first_touch_avg: 5,
                        off_the_ball_avg: 5,
                        positivity_avg: 5,
                        long_passing_avg: 5,
                        short_passing_avg: 5,
                        communication_avg: 5,
                        def_workrate_avg: 5,
                        composure_avg: 5,
                        willing_to_switch_avg: 5,
                        attack_positioning_avg: 5,
                        attacking_workrate_avg: 5,
                        defensive_workrate_avg: 5,
                        defensive_awareness_avg: 5,
                        vote_count: 0
                    })
                    .select()
                    .single();

                if (playerError) throw playerError;
                finalPlayerId = newPlayer.id;
            }

            if (!finalPlayerId) {
                return { error: { message: 'Player ID is required' } as AuthError };
            }

            // Update user profile with squad verification and player association
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    squad_id: squadId,
                    associated_player_id: finalPlayerId,
                    is_verified: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            // Update local user state
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

            // Invalidate TanStack Query cache
            queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(user.id) });

            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    // Add timeout failsafe for loading state
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('⚠️ Auth initialization timeout - forcing state');
                setLoading(false);
            }
        }, 10000); // 10 second timeout

        return () => clearTimeout(timeout);
    }, [loading]);

    // Proactive session health monitoring
    useEffect(() => {
        if (!user || loading) return;

        // Check session health every 5 minutes
        const healthCheckInterval = setInterval(async () => {
            // Double-check user still exists (prevent race conditions during sign out)
            if (!user) {
                console.log('🔍 AUTH: Skipping health check - user signed out');
                return;
            }
            
            console.log('🔍 AUTH: Proactive session health check...');
            const isHealthy = await refreshSessionIfNeeded();
            
            if (!isHealthy) {
                console.warn('⚠️ AUTH: Session health check failed');
            }
        }, 5 * 60 * 1000); // 5 minutes

        // Initial health check after 30 seconds (avoid startup congestion)
        const initialCheck = setTimeout(async () => {
            // Double-check user still exists before health check
            if (user) {
                await refreshSessionIfNeeded();
            }
        }, 30000);

        return () => {
            clearInterval(healthCheckInterval);
            clearTimeout(initialCheck);
        };
    }, [user, loading]); // Removed refreshSessionIfNeeded from dependencies

    // Show loading screen while initializing
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
            refreshSessionIfNeeded,
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
