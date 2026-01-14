/**
 * Session Management Utility
 *
 * Per Supabase docs:
 * - Use getUser() for authentication validation (makes network request)
 * - Don't frequently call getSession() - there's a background process for refresh
 * - Let Supabase's autoRefreshToken handle token management
 *
 * See: https://supabase.com/docs/guides/auth/sessions
 */

import { logger } from "@/lib/logger";
import { supabase } from "./supabase";

// =====================================================
// PRE-MUTATION VALIDATION
// =====================================================

/**
 * Ensures user is authenticated before a mutation.
 * Uses getUser() which makes a network request to verify the session.
 *
 * @returns true if user is authenticated and mutation can proceed
 */
export async function ensureValidSession(): Promise<boolean> {
    try {
        // getUser() makes a network request to verify the session is valid
        // This is the recommended approach per Supabase docs
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            logger.warn("Session validation failed:", error.message);
            return false;
        }

        return !!user;
    } catch (err) {
        logger.error("Session validation exception:", err);
        return false;
    }
}

// =====================================================
// ERROR HANDLING
// =====================================================

export interface DatabaseError {
    isAuthError: boolean;
    isNetworkError: boolean;
    isRetryable: boolean;
    message: string;
}

/**
 * Categorize a database error for appropriate handling
 */
export function categorizeError(error: unknown): DatabaseError {
    const errorObj = error as { code?: string; message?: string } | null;
    const code = errorObj?.code || "";
    const message = errorObj?.message || "";

    // JWT/Token errors
    if (
        code === "PGRST301" ||
        message.includes("JWT") ||
        message.includes("expired") ||
        message.includes("invalid_token")
    ) {
        return {
            isAuthError: true,
            isNetworkError: false,
            isRetryable: true,
            message,
        };
    }

    // Network errors
    if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("NetworkError") ||
        message.includes("timeout")
    ) {
        return {
            isAuthError: false,
            isNetworkError: true,
            isRetryable: true,
            message,
        };
    }

    // Other Postgres errors (permission, constraint, etc.)
    if (code.startsWith("PGRST") || code.startsWith("23")) {
        return {
            isAuthError: false,
            isNetworkError: false,
            isRetryable: false,
            message,
        };
    }

    // Unknown - assume not retryable
    return {
        isAuthError: false,
        isNetworkError: false,
        isRetryable: false,
        message,
    };
}

// =====================================================
// STORAGE CLEANUP (for sign out)
// =====================================================

const VOTE_STORAGE_PATTERNS = [/^voting_session_/, /^user_votes_/, /^vote_cache_/];

/**
 * Clear vote-related data from storage (called on sign out)
 */
export function clearVoteData(userId?: string): void {
    try {
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            const isVoteRelated = VOTE_STORAGE_PATTERNS.some((pattern) => pattern.test(key));
            const isUserSpecific =
                userId &&
                key.includes(userId) &&
                (key.includes("voting_") || key.includes("vote_") || key.includes("player_votes"));

            if (isVoteRelated || isUserSpecific) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
        // Storage access may fail in some contexts
    }
}
