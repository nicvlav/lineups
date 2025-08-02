import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";

interface AuthUser {
    id: string;
    email: string | null;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
}

interface AuthContextProps {
    user: AuthUser | null;
    session: Session | null;
    urlState: string | null;
    canEdit: boolean;
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
    clearUrlState: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    url: string | null;
}

export const AuthProvider = ({ children, url }: AuthProviderProps) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [canEdit, setCanEdit] = useState(false);
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
                } else if (mounted) {
                    setSession(session);
                    setUser(session?.user ? transformUser(session.user) : null);
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
                
                if (mounted) {
                    setSession(session);
                    setUser(session?.user ? transformUser(session.user) : null);
                    
                    // Handle different auth events
                    if (event === 'SIGNED_OUT') {
                        setCanEdit(false);
                    }
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Check edit permissions when user changes
    useEffect(() => {
        if (!user || loading) {
            setCanEdit(false);
            return;
        }

        // For now, give all authenticated users edit access
        // TODO: Implement proper permission system later
        setCanEdit(true);
    }, [user, loading]);

    // Transform Supabase User to our AuthUser type
    const transformUser = (user: User): AuthUser => ({
        id: user.id,
        email: user.email || null,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
    });

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

    const clearUrlState = () => {
        setUrlState(null);
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
            canEdit,
            loading,
            signUpWithEmail,
            signInWithEmail,
            signInWithFacebook,
            resetPassword,
            updatePassword,
            signOut,
            clearUrlState
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
