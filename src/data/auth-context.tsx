import { createContext, useContext, useEffect, useState} from "react";
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, onSupabaseChange } from "@/lib/worker";

interface User {
    id: string;
    email: string | null;
}

interface AuthContextProps {
    client: SupabaseClient | null,
    user: User | null;
    // signUpWithEmail: (email: string, password: string) => Promise<void>;
    // signInWithEmail: (email: string, password: string) => Promise<void>;
    // signOut: () => Promise<void>;
    // updateUserPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [client, setClient] = useState(supabase);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const update = () => setClient(supabase); // Trigger re-render when Supabase updates
        onSupabaseChange(update);
        return () => {
            // Cleanup listener if needed
        };
    }, []);

    useEffect(() => {
        const getUser = async () => {
            if (!supabase ) return;
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser({ id: data.user.id, email: data.user.email ? data.user.email : null });
            }
        };
        getUser();

        // // Listen for auth state changes
        // supabase.auth.onAuthStateChange((_, session) => {
        //     if (session?.user) {
        //         setUser({ id: session.user.id, email: session.user.email || null });
        //     } else {
        //         setUser(null);
        //     }
        // });
    }, []);

    // Sign in with email and password
    // const signInWithEmail = async (email: string, password: string) => {
    //     const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    //     if (error) {
    //         console.error('Error during sign-in:', error.message);

    //         if (error.message === 'Email not confirmed') {
    //             alert('Please confirm your email before signing in.');
    //             return;
    //         }

    //         alert('An error occurred during sign-in.');
    //         return;
    //     }

    //     // If sign-in is successful
    //     console.log('Signed in successfully:', data);
    //     // Redirect or set the user state
    // };


    // const signUpWithEmail = async (email: string, password: string) => {
    //     const { error } = await supabase.auth.signUp({
    //         email,
    //         password,
    //         // Optionally, you can add an email redirect link here
    //         options: { emailRedirectTo: 'http://localhost:5173/dashboard' }
    //     });
    
    //     if (error) {
    //         console.error('Error during sign-up:', error.message);
    //         alert('Error during sign-up: ' + error.message);
    //         return;
    //     }
    
    //     // After sign-up, show a message to check their inbox for the confirmation email
    //     alert('Please check your inbox to confirm your email address.');
    
    //     // Optionally, redirect the user to a confirmation screen or wait for them to confirm
    // };
    

    // // Sign out
    // const signOut = async () => {
    //     await supabase.auth.signOut();
    //     setUser(null);
    // };

    // // Update user password
    // const updateUserPassword = async (newPassword: string) => {
    //     const { error } = await supabase.auth.updateUser({ password: newPassword });
    //     if (error) throw new Error(error.message);
    // };

    return (
        <AuthContext.Provider value={{  user, client/*, signUpWithEmail, signInWithEmail, signOut, updateUserPassword */}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
