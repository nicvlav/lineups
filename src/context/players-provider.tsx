/**
 * PlayersProvider - Migrated to TanStack Query
 *
 * This provider now uses TanStack Query hooks instead of manual state management.
 * It provides a thin compatibility layer for existing code while leveraging
 * modern server state management.
 *
 * Benefits:
 * - Automatic caching and background refetch
 * - Real-time subscriptions
 * - Loading and error states
 * - Optimistic updates
 */

import React, { createContext, ReactNode, useContext } from "react";
import {
    useAddPlayer as useAddPlayerMutation,
    useDeletePlayer as useDeletePlayerMutation,
    usePlayers as usePlayersQuery,
} from "@/hooks/use-players";
import { Player } from "@/types/players";

interface PlayersContextType {
    players: Record<string, Player>;
    isLoading: boolean;
    error: Error | null;
    addPlayer: (player: Partial<Player>, onSuccess?: (player: Player) => void) => void;
    deletePlayer: (id: string) => void;
}

export const PlayersContext = createContext<PlayersContextType | undefined>(undefined);

interface PlayersProviderProps {
    children: ReactNode;
}

export const PlayersProvider: React.FC<PlayersProviderProps> = ({ children }) => {
    // Use TanStack Query hooks
    // Real-time subscriptions removed - Using REST-only approach for better stability
    // Background refresh handles updates on voting page (30s interval)
    const { data: players = {}, isLoading, error } = usePlayersQuery();
    const addPlayerMutation = useAddPlayerMutation();
    const deletePlayerMutation = useDeletePlayerMutation();

    // Wrapper for addPlayer to match old API
    const addPlayer = (player: Partial<Player>, onSuccess?: (player: Player) => void) => {
        addPlayerMutation.mutate(
            { player },
            {
                onSuccess: (newPlayer) => {
                    console.log("PlayersProvider: Player added successfully");
                    onSuccess?.(newPlayer);
                },
                onError: (error) => {
                    console.error("PlayersProvider: Error adding player:", error);
                },
            }
        );
    };

    // Wrapper for deletePlayer to match old API
    const deletePlayer = (id: string) => {
        deletePlayerMutation.mutate(
            { id },
            {
                onSuccess: () => {
                    console.log("PlayersProvider: Player deleted successfully");
                },
                onError: (error) => {
                    console.error("PlayersProvider: Error deleting player:", error);
                },
            }
        );
    };

    return (
        <PlayersContext.Provider
            value={{
                players,
                isLoading,
                error: error as Error | null,
                addPlayer,
                deletePlayer,
            }}
        >
            {children}
        </PlayersContext.Provider>
    );
};

export const usePlayers = () => {
    const context = useContext(PlayersContext);
    if (!context) {
        throw new Error("usePlayers must be used within a PlayersProvider");
    }
    return context;
};
