import React, { createContext, ReactNode, useContext } from "react";

interface SupabaseContextType {
    isReady: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

interface SupabaseProviderProps {
    children: ReactNode;
}

/**
 * SupabaseProvider
 *
 * Simple wrapper that provides Supabase context to the app.
 * Auth initialization is handled by AuthProvider using getUser().
 */
export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
    return <SupabaseContext.Provider value={{ isReady: true }}>{children}</SupabaseContext.Provider>;
};

export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (!context) {
        throw new Error("useSupabase must be used within a SupabaseProvider");
    }
    return context;
};
