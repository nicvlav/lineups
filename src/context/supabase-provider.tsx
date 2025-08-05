import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';

// ---- Shared Session Lock ----
let sessionPromise: Promise<any> | null = null;

const getSafeSession = () => {
  if (!sessionPromise) {
    sessionPromise = supabase.auth.getSession().finally(() => {
      sessionPromise = null; // Reset so future calls are fresh
    });
  }
  return sessionPromise;
};

// ---- Context Setup ----
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
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const testConnection = async () => {
      try {
        const { error } = await getSafeSession();

        if (error) {
          console.warn('SUPABASE: Connection test warning:', error.message);
        }
      } catch (error) {
        console.error('SUPABASE: Connection test failed:', error);
      } finally {
        setIsReady(true);
      }
    };

    // Delay slightly to avoid race conditions with DOM or hydration
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
