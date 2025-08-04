import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";

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
    clearUrlState: () => void;
    // Profile management
    updateAssociatedPlayer: (playerId: string | null) => Promise<{ error: AuthError | null }>;
    validateSquad: (squadId: string) => Promise<{ valid: boolean; error?: string }>;
    verifySquadAndPlayer: (squadId: string, playerId: string | null, createNew?: boolean, newPlayerName?: string) => Promise<{ error: AuthError | null }>;
    getAvailableSquads: () => Promise<Squad[]>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    url: string | null;
}

export const AuthProvider = ({ children, url }: AuthProviderProps) => {
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
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Error getting session:', error);
                } else if (mounted && session?.user) {
                    setSession(session);
                    const authUser = await transformUser(session.user);
                    if (authUser === null) {
                        // User was force signed out due to validation failure
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
                console.error('Failed to get initial session:', error);
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
                console.log('Auth state changed:', event, session?.user?.email);
                
                // Add debugging for Facebook auth issues
                if (event === 'SIGNED_IN' && session?.user) {
                    console.log('🔍 User signed in:', {
                        id: session.user.id,
                        email: session.user.email,
                        provider: session.user.app_metadata?.provider,
                        created_at: session.user.created_at
                    });
                }
                
                if (mounted) {
                    setSession(session);
                    if (session?.user) {
                        try {
                            const authUser = await transformUser(session.user);
                            if (authUser === null) {
                                // User was force signed out due to validation failure
                                console.log('🚨 User session invalidated - forcing sign out');
                                setSession(null);
                                setUser(null);
                            } else {
                                console.log('✅ User profile loaded:', {
                                    hasProfile: !!authUser.profile,
                                    isVerified: authUser.profile?.is_verified,
                                    squadId: authUser.profile?.squad_id,
                                    playerId: authUser.profile?.associated_player_id
                                });
                                setUser(authUser);
                            }
                        } catch (error) {
                            console.error('❌ Failed to transform user:', error);
                            // Force sign out on any error
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
        
        // Check if user is verified (has squad and either player association OR is admin with NULL associated_player_id)
        const verified = !!(profile?.is_verified && profile?.squad_id && 
            (profile?.associated_player_id || profile?.associated_player_id === null));
        setIsVerified(verified);
        
        // Check if user needs verification (signed in but not verified)
        const needsVerif = !verified;
        setNeedsVerification(needsVerif);
        
        // Can vote: only verified squad members with player association
        setCanVote(verified);
    }, [user, loading]);

    // Transform Supabase User to our AuthUser type
    const transformUser = async (user: User): Promise<AuthUser | null> => {
        try {
            // First, verify the user actually exists in Supabase auth
            const { data: currentUser, error: userError } = await supabase.auth.getUser();
            
            if (userError || !currentUser.user || currentUser.user.id !== user.id) {
                console.warn('🚨 User session is stale - user no longer exists in auth');
                // Force sign out if user doesn't exist
                await supabase.auth.signOut();
                return null;
            }

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
                        // If we can't create profile, force sign out
                        await supabase.auth.signOut();
                        return null;
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
                    await supabase.auth.signOut();
                    return null;
                }
            }

            if (error && error.code !== 'PGRST116') {
                console.error('Database error loading profile:', error);
                // For other database errors, force sign out
                await supabase.auth.signOut();
                return null;
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
            // On any unexpected error, force sign out to clear state
            await supabase.auth.signOut();
            return null;
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
            // Store debug info in localStorage to survive redirects
            localStorage.setItem('fb_auth_debug', JSON.stringify({
                timestamp: new Date().toISOString(),
                step: 'oauth_initiated',
                url: window.location.href
            }));
            
            console.log('🚀 Starting Facebook OAuth...');
            
            console.log('📞 Calling Supabase signInWithOAuth...');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    scopes: 'email',
                    redirectTo: `${window.location.origin}/` // Go straight to home
                }
            });

            console.log('📦 OAuth response:', { data, error });
            
            if (error) {
                console.error('❌ OAuth initiation error:', error);
                localStorage.setItem('fb_auth_debug', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    step: 'oauth_error',
                    error: error.message
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
            const { error } = await supabase.auth.signOut();
            return { error };
        } catch (error) {
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
            
            // Clear browser storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Force sign out from Supabase
            await supabase.auth.signOut();
            
            console.log('🔄 Force sign out completed - all state cleared');
        } catch (error) {
            console.error('Error during force sign out:', error);
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

            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

    const getAvailableSquads = async (): Promise<Squad[]> => {
        try {
            const { data, error } = await supabase
                .from('squads')
                .select('*')
                .order('name');

            if (error) throw error;
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
                        stats: {
                            // Default stats for new player
                            pace: 50, shooting: 50, passing: 50, dribbling: 50,
                            defending: 50, physical: 50, finishing: 50, crossing: 50,
                            free_kicks: 50, penalties: 50, technique: 50, aggression: 50,
                            interceptions: 50, positioning: 50, vision: 50, composure: 50,
                            ball_control: 50, reactions: 50
                        }
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

            return { error: null };
        } catch (error) {
            return { error: error as AuthError };
        }
    };

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
            clearUrlState,
            updateAssociatedPlayer,
            validateSquad,
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
