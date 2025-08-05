/**
 * Modern Session Management Utility
 * 
 * Provides intelligent session handling, token refresh, and targeted cache clearing
 * while preserving authentication state during routine operations.
 */

import { supabase } from './supabase';

// Auth-related storage keys that should be preserved during cache clearing
const AUTH_STORAGE_KEYS = [
  'supabase.auth.token',
  'sb-auth-token',
  'sb-refresh-token', 
  'sb-provider-token',
  'mobile_session_recovery',
  'fb_auth_debug'
] as const;

// User-specific keys that should be preserved (will be filtered by user ID)
const USER_STORAGE_PATTERNS = [
  /^voting_session_/,
  /^user_profile_/,
  /^auth_state_/
] as const;

export interface SessionError {
  code: string;
  message: string;
  isAuthRelated: boolean;
  isNetworkRelated: boolean;
  isTemporary: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SessionRefreshResult {
  success: boolean;
  error?: string;
  shouldSignOut?: boolean;
  retryAfter?: number;
}

/**
 * Categorizes errors to determine appropriate response
 */
export function categorizeError(error: any): SessionError {
  const code = error?.code || '';
  const message = error?.message || '';
  
  // JWT/Token related errors
  if (code === 'PGRST301' || message.includes('JWT') || message.includes('expired') || message.includes('invalid_token')) {
    return {
      code,
      message,
      isAuthRelated: true,
      isNetworkRelated: false,
      isTemporary: true,
      severity: 'medium'
    };
  }
  
  // Network/connectivity errors
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || code === 'NETWORK_ERROR') {
    return {
      code,
      message,
      isAuthRelated: false,
      isNetworkRelated: true,
      isTemporary: true,
      severity: 'low'
    };
  }
  
  // Permission/authorization errors (non-token related)
  if (code.includes('PGRST') && code !== 'PGRST301') {
    return {
      code,
      message,
      isAuthRelated: true,
      isNetworkRelated: false,
      isTemporary: false,
      severity: 'high'
    };
  }
  
  // Unknown errors - treat conservatively
  return {
    code,
    message,
    isAuthRelated: false,
    isNetworkRelated: false,
    isTemporary: false,
    severity: 'medium'
  };
}

/**
 * Attempts to refresh the current session intelligently
 */
export async function refreshSession(): Promise<SessionRefreshResult> {
  try {
    console.log('🔄 SESSION: Attempting token refresh...');
    
    // Get current session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('SESSION: Error getting current session:', sessionError);
      return { 
        success: false, 
        error: sessionError.message,
        shouldSignOut: sessionError.message.includes('invalid') || sessionError.message.includes('expired')
      };
    }
    
    if (!session) {
      console.log('SESSION: No active session found');
      return { success: false, error: 'No active session', shouldSignOut: true };
    }
    
    // Check if token is close to expiry (refresh if less than 5 minutes remaining)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry > 300) { // More than 5 minutes left
      console.log(`SESSION: Token still valid for ${Math.floor(timeUntilExpiry / 60)} minutes`);
      return { success: true };
    }
    
    console.log('SESSION: Token needs refresh...');
    
    // Attempt refresh
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('SESSION: Refresh failed:', refreshError);
      
      // Determine if we should sign out based on error type
      const shouldSignOut = refreshError.message.includes('refresh_token') || 
                           refreshError.message.includes('invalid') ||
                           refreshError.message.includes('expired');
                           
      return { 
        success: false, 
        error: refreshError.message,
        shouldSignOut,
        retryAfter: shouldSignOut ? undefined : 30 // Retry in 30 seconds if not signing out
      };
    }
    
    if (newSession) {
      console.log('✅ SESSION: Token refreshed successfully');
      return { success: true };
    }
    
    return { success: false, error: 'No session returned from refresh' };
    
  } catch (error) {
    console.error('SESSION: Unexpected error during refresh:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      retryAfter: 60 // Retry in 1 minute for unexpected errors
    };
  }
}

/**
 * Clears corrupted application data while preserving authentication state
 */
export async function clearCorruptedAppData(options: {
  preserveAuth?: boolean;
  preserveUserData?: boolean;
  userId?: string;
} = {}): Promise<void> {
  const { preserveAuth = true, preserveUserData = true, userId } = options;
  
  console.log('🧹 SESSION: Clearing corrupted app data...', { preserveAuth, preserveUserData, userId });
  
  try {
    // Step 1: Collect keys to preserve
    const keysToPreserve = new Set<string>();
    
    if (preserveAuth) {
      // Add auth-related keys
      AUTH_STORAGE_KEYS.forEach(key => keysToPreserve.add(key));
      
      // Add any Supabase auth keys (they might have different names)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
          keysToPreserve.add(key);
        }
      }
    }
    
    if (preserveUserData && userId) {
      // Add user-specific keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Check if key matches user-specific patterns
          const isUserSpecific = USER_STORAGE_PATTERNS.some(pattern => pattern.test(key));
          if (isUserSpecific && key.includes(userId)) {
            keysToPreserve.add(key);
          }
        }
      }
    }
    
    // Step 2: Clear localStorage selectively
    const localStorageKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) localStorageKeys.push(key);
    }
    
    let clearedCount = 0;
    localStorageKeys.forEach(key => {
      if (!keysToPreserve.has(key)) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    // Step 3: Clear sessionStorage (less critical for auth)
    const sessionStorageKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) sessionStorageKeys.push(key);
    }
    
    // Only preserve tab-related keys in sessionStorage
    sessionStorageKeys.forEach(key => {
      if (!key.includes('tab') && !keysToPreserve.has(key)) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log(`✅ SESSION: Cleared ${clearedCount} localStorage keys, preserved ${keysToPreserve.size} auth/user keys`);
    
  } catch (error) {
    console.error('SESSION: Error during selective cache clear:', error);
    // If selective clearing fails, don't fall back to nuclear clear
    throw error;
  }
}

/**
 * Handles database errors with intelligent retry and recovery
 */
export async function handleDatabaseError(error: any, context: string, userId?: string): Promise<{
  shouldRetry: boolean;
  shouldSignOut: boolean;
  retryAfter?: number;
}> {
  const categorized = categorizeError(error);
  
  console.log(`🚨 SESSION: Database error in ${context}:`, {
    code: categorized.code,
    message: categorized.message,
    severity: categorized.severity,
    isAuthRelated: categorized.isAuthRelated,
    isTemporary: categorized.isTemporary
  });
  
  // Handle based on error category
  switch (categorized.severity) {
    case 'low':
      // Network issues - just retry
      return { shouldRetry: true, shouldSignOut: false, retryAfter: 5 };
      
    case 'medium':
      if (categorized.isAuthRelated && categorized.isTemporary) {
        // Try to refresh session first
        const refreshResult = await refreshSession();
        
        if (refreshResult.success) {
          return { shouldRetry: true, shouldSignOut: false, retryAfter: 1 };
        }
        
        if (refreshResult.shouldSignOut) {
          return { shouldRetry: false, shouldSignOut: true };
        }
        
        // Refresh failed but might recover - clear app data and retry
        await clearCorruptedAppData({ userId });
        return { shouldRetry: true, shouldSignOut: false, retryAfter: refreshResult.retryAfter || 30 };
      }
      
      // Non-auth medium errors - clear app data and retry
      await clearCorruptedAppData({ userId });
      return { shouldRetry: true, shouldSignOut: false, retryAfter: 10 };
      
    case 'high':
      // Permission issues - clear app data but don't sign out
      await clearCorruptedAppData({ userId });
      return { shouldRetry: false, shouldSignOut: false };
      
    case 'critical':
      // Critical errors - sign out
      return { shouldRetry: false, shouldSignOut: true };
      
    default:
      return { shouldRetry: false, shouldSignOut: false };
  }
}

/**
 * Modern session health check with automatic recovery
 */
export async function checkSessionHealth(): Promise<{
  isHealthy: boolean;
  needsRefresh: boolean;
  error?: string;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { isHealthy: false, needsRefresh: false, error: error.message };
    }
    
    if (!session) {
      return { isHealthy: false, needsRefresh: false, error: 'No active session' };
    }
    
    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry <= 0) {
      return { isHealthy: false, needsRefresh: true, error: 'Token expired' };
    }
    
    if (timeUntilExpiry < 300) { // Less than 5 minutes
      return { isHealthy: true, needsRefresh: true };
    }
    
    return { isHealthy: true, needsRefresh: false };
    
  } catch (error) {
    return { 
      isHealthy: false, 
      needsRefresh: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}