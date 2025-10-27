import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { handleDatabaseError } from "@/lib/session-manager";
import { defaultStatScores, PlayerStats } from "@/data/stat-types";
import { Player } from "@/data/player-types";

interface PlayersContextType {
    players: Record<string, Player>;
    addPlayer: (player: Partial<Player>, onSuccess?: (player: Player) => void) => void;
    deletePlayer: (id: string) => void;
}

export const PlayersContext = createContext<PlayersContextType | undefined>(undefined);

interface PlayersProviderProps {
    children: ReactNode;
}

export const PlayersProvider: React.FC<PlayersProviderProps> = ({ children }) => {
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const loadingState = useRef(false);

    // Initialize players on mount and set up real-time subscriptions
    useEffect(() => {
        fetchPlayers();

        // Real-time subscriptions for players table
        const playerChannel = supabase?.channel('players_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'players'
                },
                (payload) => {
                    if (loadingState.current) return;

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        const newPlayer = payload.new as any;
                        // Convert individual stats for new players
                        newPlayer.stats = convertIndividualStatsToPlayerStats(newPlayer);
                        newPlayer.vote_count = 0;
                        newPlayer.aggregates = null;
                        newPlayers[newPlayer.id] = newPlayer;
                        return newPlayers;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'players'
                },
                (payload) => {
                    if (loadingState.current) return;

                    const id = payload.new.id;

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        const updatedPlayer = payload.new as any;

                        updatedPlayer.stats = convertIndividualStatsToPlayerStats(updatedPlayer);
                        updatedPlayer.vote_count = 0;
                        updatedPlayer.aggregates = null;

                        newPlayers[id] = updatedPlayer;
                        return newPlayers;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'players'
                },
                (payload) => {
                    if (loadingState.current) return;

                    const deletedPlayer = payload.old as Partial<Player>;
                    const id: string | undefined = deletedPlayer?.id;

                    if (!id) return;

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        if (id in newPlayers) delete newPlayers[id];
                        return newPlayers;
                    });
                }
            )
            .subscribe();

        // Cleanup the subscription when the component unmounts
        return () => {
            if (supabase && playerChannel) supabase.removeChannel(playerChannel);
        };
    }, []);

    const fetchPlayers = async (): Promise<Record<string, Player>> => {
        if (!supabase) {
            console.log('PlayersProvider: No Supabase client available');
            return {};
        }

        console.log('PlayersProvider: Starting player fetch...');
        loadingState.current = true;

        try {
            const { data, error } = await supabase
                .from("players")
                .select(`
                    id,
                    name,
                    vote_count,
                    anticipation_avg,
                    composure_avg,
                    off_the_ball_avg,
                    vision_avg,
                    first_touch_avg,
                    passing_avg,
                    tackling_avg,
                    finishing_avg,
                    speed_avg,
                    strength_avg,
                    agility_avg,
                    workrate_avg,
                    crossing_avg,
                    positioning_avg,
                    technique_avg,
                    dribbling_avg,
                    decisions_avg,
                    marking_avg,
                    heading_avg,
                    aggression_avg,
                    flair_avg,
                    long_shots_avg,
                    stamina_avg,
                    teamwork_avg,
                    determination_avg,
                    leadership_avg,
                    concentration_avg,
                    created_at,
                    updated_at
                `)
                .order("name", { ascending: false });

            if (error) {
                console.error("PlayersProvider: Error fetching players:", error);
                loadingState.current = false;

                // Use intelligent error handling
                await handleDatabaseError(error, 'fetch players');

                return {};
            }

            if (!data || data.length === 0) {
                console.warn('PlayersProvider: No players found in database');
                return {};
            }

            console.log(`PlayersProvider: Fetched ${data.length} players successfully`);

            const playerRecord: Record<string, Player> = {};
            data.forEach(player => {
                try {
                    // Use community-voted stats if available, otherwise fall back to individual stat columns (0-10 scale converted to 0-100)
                    const effectiveStats = convertIndividualStatsToPlayerStats(player);

                    playerRecord[player.id] = {
                        ...player,
                        stats: effectiveStats,
                        vote_count: player.vote_count || 0,
                    };
                } catch (statError) {
                    console.error(`PlayersProvider: Error processing player ${player.name}:`, statError);
                }
            });

            setPlayers(playerRecord);
            console.log(`PlayersProvider: Player fetch complete, ${Object.keys(playerRecord).length} players processed`);

            loadingState.current = false;
            return playerRecord;
        } catch (unexpectedError) {
            console.error('PlayersProvider: Unexpected error during player fetch:', unexpectedError);
            loadingState.current = false;
            return {};
        }
    };

    // Convert PlayerStats (0-100) to individual stat columns (0-10) for database insert
    const convertPlayerStatsToIndividualColumns = (stats: PlayerStats) => {
        return {
            anticipation_avg: Math.round(stats.anticipation / 10),
            composure_avg: Math.round(stats.composure / 10),
            off_the_ball_avg: Math.round(stats.offTheBall / 10),
            vision_avg: Math.round(stats.vision / 10),
            first_touch_avg: Math.round(stats.firstTouch / 10),
            passing_avg: Math.round(stats.passing / 10),
            tackling_avg: Math.round(stats.tackling / 10),
            finishing_avg: Math.round(stats.finishing / 10),
            speed_avg: Math.round(stats.speed / 10),
            strength_avg: Math.round(stats.strength / 10),
            agility_avg: Math.round(stats.agility / 10),
            workrate_avg: Math.round(stats.workrate / 10),
            crossing_avg: Math.round(stats.crossing / 10),
            positioning_avg: Math.round(stats.positioning / 10),
            technique_avg: Math.round(stats.technique / 10),
            dribbling_avg: Math.round(stats.dribbling / 10),
            decisions_avg: Math.round(stats.decisions / 10),
            marking_avg: Math.round(stats.marking / 10),
            heading_avg: Math.round(stats.heading / 10),
            aggression_avg: Math.round(stats.aggression / 10),
            flair_avg: Math.round(stats.flair / 10),
            long_shots_avg: Math.round(stats.longShots / 10),
            stamina_avg: Math.round(stats.stamina / 10),
            teamwork_avg: Math.round(stats.teamwork / 10),
            determination_avg: Math.round(stats.determination / 10),
            leadership_avg: Math.round(stats.leadership / 10),
            concentration_avg: Math.round(stats.concentration / 10),
        };
    };

    // Convert individual player stat columns (0-10) to PlayerStats (0-100)
    const convertIndividualStatsToPlayerStats = (player: any): PlayerStats => {
        const stats = { ...defaultStatScores };

        // Map database AGGREGATE column names to stat keys and convert 0-10 to 0-100 scale
        const statMapping: Record<string, keyof PlayerStats> = {
            anticipation_avg: 'anticipation',
            composure_avg: 'composure',
            off_the_ball_avg: 'offTheBall',
            vision_avg: 'vision',
            first_touch_avg: 'firstTouch',
            passing_avg: 'passing',
            tackling_avg: 'tackling',
            finishing_avg: 'finishing',
            speed_avg: 'speed',
            strength_avg: 'strength',
            agility_avg: 'agility',
            workrate_avg: 'workrate',
            crossing_avg: 'crossing',
            positioning_avg: 'positioning',
            technique_avg: 'technique',
            dribbling_avg: 'dribbling',
            decisions_avg: 'decisions',
            marking_avg: 'marking',
            heading_avg: 'heading',
            aggression_avg: 'aggression',
            flair_avg: 'flair',
            long_shots_avg: 'longShots',
            stamina_avg: 'stamina',
            teamwork_avg: 'teamwork',
            determination_avg: 'determination',
            leadership_avg: 'leadership',
            concentration_avg: 'concentration'
        };

        for (const [dbColumn, statKey] of Object.entries(statMapping)) {
            const value = player[dbColumn];
            if (typeof value === 'number' && value > 0) {
                // Convert 0-10 to 0-100 scale, only if value > 0 (has votes)
                stats[statKey] = value * 10;
            } else if (typeof value === 'string') {
                // Handle string numbers from database
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue > 0) {
                    stats[statKey] = numValue * 10;
                }
            }
        }

        return stats;
    };

    const addPlayer = async (player: Partial<Player>, onSuccess?: (player: Player) => void) => {
        if (!supabase) return;

        if (player.id != null && player.id in players) return;

        const playerStats = player.stats ? player.stats : defaultStatScores;
        const newPlayer: Player = {
            id: player.id ? player.id : uuidv4(),
            name: player.name ? player.name : "Player Name",
            vote_count: 0,
            stats: playerStats,
        };

        // Convert stats to individual columns for database
        const individualColumns = convertPlayerStatsToIndividualColumns(playerStats);

        supabase.from('players')
            .insert([{
                id: newPlayer.id,
                name: newPlayer.name,
                vote_count: 0,
                ...individualColumns
            }]).then(({ data, error }) => {
                if (error) {
                    console.error('PlayersProvider: Error adding player:', error.message);
                } else {
                    console.log('PlayersProvider: Player added successfully:', data);
                    onSuccess?.(newPlayer);
                }
            });
    };

    const deletePlayer = async (id: string) => {
        if (!supabase) return;

        supabase.from('players')
            .delete()
            .match({ id }).then(({ data, error }) => {
                if (error) {
                    console.error('PlayersProvider: Error deleting player:', error.message);
                } else {
                    console.log('PlayersProvider: Player deleted successfully:', data);
                }
            });
    };

    return (
        <PlayersContext.Provider value={{
            players,
            addPlayer,
            deletePlayer,
        }}>
            {children}
        </PlayersContext.Provider>
    );
};

export const usePlayers = () => {
    const context = useContext(PlayersContext);
    if (!context) {
        throw new Error('usePlayers must be used within a PlayersProvider');
    }
    return context;
};
