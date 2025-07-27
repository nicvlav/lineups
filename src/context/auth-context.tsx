import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
interface User {
    id: string;
    email: string | null;
}

interface AuthContextProps {
    supabase: SupabaseClient | null;
    user: User | null;
    urlState: string | null;
    canEdit: boolean;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateUserPassword: (newPassword: string) => Promise<void>;
    clearUrlState: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children, url }: { children: React.ReactNode, url: string | null }) => {
    const [canEdit, setCanEdit] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
    const [urlState, setUrlState] = useState<string | null>(url);
    const [loading, setLoading] = useState(true);

    const checkEditAccess = () => {
        if (!supabase || !user) {
            setCanEdit(false);
            return;
        }
        const checkPermission = async () => {
            const { data } = await supabase
                .from("user_permissions")
                .select("can_edit")
                .eq("user_id", user.id)
                .single();

            console.log("d", data);

            if (data?.can_edit) setCanEdit(true);
        };

        checkPermission();
    };


    useEffect(() => {
        const getUser = async () => {
            if (!supabase) {
                setUser(null);
                return;
            }

            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                console.log("d", data);
                setUser({ id: data.user.id, email: data.user.email || null });
            }
        };

        getUser();

        // Listen for auth changes
        const { data: subscription } = supabase?.auth.onAuthStateChange((_, session) => {
            if (session?.user) {
                setUser({ id: session.user.id, email: session.user.email || null });
            } else {
                setUser(null);
            }
        }) ?? { data: null };

        return () => {
            subscription?.subscription?.unsubscribe();
        };
    }, [supabase]);

    useEffect(() => {
        checkEditAccess();
    }, [user]);

    useEffect(() => {
        if (supabase) return;

        getSupabaseClient().then((obj) => {
            setSupabase(obj);
            setLoading(false); // done loading after supabase is ready
        });
    }, []);


    // Sign in with email and password
    const signInWithEmail = async (email: string, password: string) => {
        if (!supabase) return;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('Error during sign-in:', error.message);

            if (error.message === 'Email not confirmed') {
                alert('Please confirm your email before signing in.');
                return;
            }

            alert('An error occurred during sign-in.');
            return;
        }

        console.log('Signed in successfully:', data);
    };


    const signUpWithEmail = async (email: string, password: string) => {
        if (!supabase) return;
        const { error } = await supabase.auth.signUp({
            email,
            password,
            // Optionally, you can add an email redirect link here
            options: { emailRedirectTo: 'http://localhost:5173/' }
        });

        if (error) {
            console.error('Error during sign-up:', error.message);
            alert('Error during sign-up: ' + error.message);
            return;
        }

        // After sign-up, show a message to check their inbox for the confirmation email
        alert('Please check your inbox to confirm your email address.');
    };


    // Sign out
    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
    };

    // Update user password
    const updateUserPassword = async (newPassword: string) => {
        if (!supabase) return;
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
    };

    const clearUrlState = async () => {
        setUrlState(null);
    };

    if (!supabase || loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }


    return (
        <AuthContext.Provider value={{ supabase, user, urlState, canEdit, signUpWithEmail, signInWithEmail, signOut, updateUserPassword, clearUrlState }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
