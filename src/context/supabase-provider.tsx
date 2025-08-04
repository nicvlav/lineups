import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface SupabaseContextType {
  isReady: boolean;
  supabaseClient: typeof supabase | null;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

interface SupabaseProviderProps {
  children: ReactNode;
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        // Simple test to ensure Supabase is responsive
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('SUPABASE: Connection test warning:', error.message);
        }
        
        // Even if there's an auth error, Supabase is still functional
        setIsReady(true);
        
      } catch (error) {
        console.error('SUPABASE: Connection test failed:', error);
        // Still set ready to true to avoid infinite loading
        setIsReady(true);
      }
    };

    // Add a small delay to ensure DOM is ready
    setTimeout(testConnection, 100);
  }, []);

  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Connecting to services...</p>
        </div>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={{ isReady: true, supabaseClient: supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};