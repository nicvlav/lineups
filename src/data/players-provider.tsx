import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/data/auth-context";
import { v4 as uuidv4, } from 'uuid';

import { openDB } from "idb";
import { Player, GamePlayer, Point, Formation, PlayerUpdate, defaultAttributes, GamePlayerUpdate } from "@/data/player-types";
import { defaultZoneWeights, FilledGamePlayer, Weighting } from "@/data/balance-types";
import { decodeStateFromURL } from "@/data/state-manager";
import { autoCreateTeams } from "./auto-balance";
import formations from "@/data/formations"

interface PlayersContextType {
    players: Player[];
    gamePlayers: GamePlayer[];
    zoneWeights: Weighting;

    addPlayer: (name: string) => void;
    deletePlayer: (id: string) => void;
    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;
    updateGamePlayerAttributes: (gamePlayer: GamePlayer, updates: GamePlayerUpdate) => void;

    clearGame: () => void;
    addNewRealPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addNewGuestPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addExisitingPlayerToGame: (player: GamePlayer, team: string, dropX: number, dropY: number) => void;
    removeFromGame: (playerToRemove: GamePlayer) => void;
    switchToRealPlayer: (oldPlayer: GamePlayer, newID: string) => void;
    switchToNewPlayer: (oldPlayer: GamePlayer, newName: string, guest: boolean) => void;

    // adjustTeamSize: (currentPlayers: Player[], team: string, formation: Formation) => void;
    applyFormation: (formationId: string) => void;

    setZoneWeights: (newWeighting: Weighting) => void;
    resetToDefaultWeights: () => void;

    generateTeams: (filteredPlayers: Player[]) => void;
    rebalanceCurrentGame: () => void;
}

export const PlayersContext = createContext<PlayersContextType | undefined>(undefined);

const DB_NAME = "GameDB";
const STORE_NAME = "gameState";

const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        }
    });
};

const getFromDB = async (key: string) => {
    const db = await initDB();
    return db.get(STORE_NAME, key);
};

const saveToDB = async (key: string, value: string) => {
    const db = await initDB();
    await db.put(STORE_NAME, value, key);
};

interface PlayersProviderProps {
    children: ReactNode;
}


export const PlayersProvider: React.FC<PlayersProviderProps> = ({ children }) => {
    const { supabase, urlState, clearUrlState } = useAuth();

    const [players, setPlayers] = useState<Player[]>([]);
    const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);
    const [zoneWeights, setZoneWeights] = useState<Weighting>(defaultZoneWeights);

    const playersRef = useRef(players);
    const loadingState = useRef(false);
    const gamePlayersRef = useRef(gamePlayers);
    const tabKeyRef = useRef(sessionStorage.getItem("tabKey") || `tab-${crypto.randomUUID()}`);

    const pendingUpdatesRef = useRef<Map<string, PlayerUpdate>>(new Map());
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadURLState = async () => {
        if (!supabase || !urlState || loadingState.current) return;

        loadingState.current = true;
        const currentUrl = new URL(window.location.href);
        const decoded = decodeStateFromURL(urlState);

        if (decoded && decoded.gamePlayers) {
            setGamePlayers(decoded.gamePlayers || []);

            await saveToDB(tabKeyRef.current, JSON.stringify(urlState));
            currentUrl.searchParams.delete("state");
            window.history.replaceState({}, "", currentUrl.toString());
        }

        clearUrlState();
        fetchPlayers();
        loadingState.current = false;
    };

    // make updates feel more responsive with debounced db sync and optimistic ui updates
    const flushPendingUpdates = async () => {
        const updates = Array.from(pendingUpdatesRef.current.entries());

        if (updates.length === 0 || !supabase) return;

        for (const [id, update] of updates) {
            const { error } = await supabase
                .from('players')
                .update({ ...update })
                .match({ id });

            if (error) {
                console.error(`Failed to update player ${id}:`, error.message);
                loadingState.current = true;
                fetchPlayers();
                loadingState.current = false;
            } else {
                pendingUpdatesRef.current.delete(id);
            }
        }
    };

    const debounceFlush = (delay = 2000) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            flushPendingUpdates();
        }, delay);
    };

    // Real-time updates for players
    useEffect(() => {
        loadURLState();

        // Create a channel for realtime subscriptions
        const playerChannel = supabase?.channel('players')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                },
                (payload) => {
                    if (loadingState.current) return;
                    console.log("New player inserted:", payload.new);
                    setPlayers((prevPlayers) => [...prevPlayers, payload.new as Player]);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                },
                (payload) => {
                    if (loadingState.current) return;

                    const updatedPlayer = payload.new as Player;
                    const id = updatedPlayer.id;

                    // Skip if local has unsynced changes
                    if (pendingUpdatesRef.current.has(id)) {
                        console.log(`[Skip RT] Ignoring real-time update for dirty player ${id}`);
                        return;
                    }

                    setPlayers(() =>
                        playersRef.current.map((p) =>
                            p.id === id ? { ...p, ...updatedPlayer } : p
                        )
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                },
                (payload) => {
                    if (loadingState.current) return;
                    console.log("Player deleted:", payload);
                    setPlayers(() => {
                        return playersRef.current.filter((player) => player.id !== payload.old.id);
                    });
                    setGamePlayers(() => {
                        return gamePlayersRef.current.filter((player) => player.id !== payload.old.id);
                    });

                    pendingUpdatesRef.current.delete(payload.old.id);

                }
            )
            .subscribe();

        // Cleanup the subscription when the component unmounts
        return () => {
            if (supabase && playerChannel) supabase.removeChannel(playerChannel);
            flushPendingUpdates();
        };
    }, [supabase]);


    useEffect(() => {
        sessionStorage.setItem("tabKey", tabKeyRef.current);

        const loadGameState = async () => {
            if (urlState) {
                loadURLState();
            } else {
                const savedState = await getFromDB(tabKeyRef.current);
                if (savedState) {
                    try {
                        const parsedData = JSON.parse(savedState);
                        // setPlayers(parsedData.players || []);
                        setGamePlayers(parsedData.gamePlayers || []);
                        console.log("Loaded from IndexedDB:", parsedData);
                    } catch (error) {
                        console.error("Error loading from IndexedDB:", error);
                    }
                }
            }
            fetchPlayers();
            loadingState.current = false;
        };

        loadGameState();
    }, []);

    useEffect(() => {
        loadURLState();
    }, [urlState]);

    const fetchPlayers = async () => {
        if (!supabase) return;

        const { data, error } = await supabase
            .from("players")
            .select("*")
            .order("name", { ascending: false });

        if (error) {
            console.error("Error fetching players:", error);
        } else {
            setPlayers(data || []);
            console.log("Fetched players from Supabase:", data);
        }
    };

    useEffect(() => {
        if (playersRef.current !== players) {
            playersRef.current = players;
        }
    }, [players]);


    useEffect(() => {
        if (gamePlayersRef.current !== gamePlayers) {
            gamePlayersRef.current = gamePlayers;
            console.log("Updated game players in context:", gamePlayers);
            if (!loadingState.current) saveState();
        }
    }, [gamePlayers]);

    const saveState = async () => {
        const stateObject = { gamePlayers: gamePlayersRef.current };
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
    };

    const addPlayer = async (name: string) => {
        if (!name.trim() || !supabase) return;

        const newUID = uuidv4();
        const newPlayer: Player = {
            id: newUID,
            name,
            stats: defaultAttributes,
        };

        supabase.from('players')
            .insert([newPlayer]).then(({ data, error }) => {
                if (error) {
                    // Rollback local state if there's an error
                    console.error('Error adding player:', error.message);
                    // setPlayers((prevPlayers) => prevPlayers.filter(player => player.id !== newUID));
                } else {
                    console.log('Adding player:', data);
                    // console.log('Player added successfully:', data);
                }
            });
    };

    const deletePlayer = async (id: string) => {
        if (!supabase) return;

        supabase.from('players')
            .delete()
            .match({ id }).then(({ data, error }) => {
                if (error) {
                    // Rollback local state if there's an error
                    console.error('Error deleting player:', error.message);
                } else {
                    console.log('Player deleted successfully:', data);
                }
            });
    };

    // Update player attributes
    const updatePlayerAttributes = (id: string, updates: PlayerUpdate) => {
        // Optimistically update UI
        setPlayers((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, ...updates } : p
            )
        );

        const existing = pendingUpdatesRef.current.get(id) ?? {};
        pendingUpdatesRef.current.set(id, { ...existing, ...updates });
        debounceFlush();
    };

    // Update player attributes
    const updateGamePlayerAttributes = async (gamePlayer: GamePlayer, updates: GamePlayerUpdate) => {
        setGamePlayers((prevPlayers) => {
            const updated = prevPlayers.map((player) =>
                player.id == gamePlayer.id ? { ...player, ...updates } : player
            );
            return updated;
        });
    };

    // Clear game data
    const clearGame = async () => {
        setGamePlayers([]);
    };

    const addNewRealPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = uuidv4();;
        setPlayers(() => {
            const newPlayer = {
                id: newID,  // Or use a smarter way to generate a unique ID
                name: name,
                stats: defaultAttributes,
            };
            const updated = [...playersRef.current, newPlayer];
            return updated;
        });

        setGamePlayers(() => {
            const newPlayer = {
                id: newID,  // Or use a smarter way to generate a unique ID
                guest_name: null,
                team: placedTeam,
                position: { x: dropX, y: dropY } as Point,
            };
            const updated = [...gamePlayersRef.current, newPlayer];
            return updated;
        });
    };

    const addNewGuestPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = uuidv4();

        setGamePlayers(() => {
            const newPlayer = {
                id: newID,  // Or use a smarter way to generate a unique ID
                guest_name: name,
                team: placedTeam,
                position: { x: dropX, y: dropY } as Point,
            };
            const updated = [...gamePlayersRef.current, newPlayer];
            return updated;
        });
    };

    // Add real player to game
    const addExisitingPlayerToGame = async (player: GamePlayer, team: string, dropX: number, dropY: number) => {
        const foundPlayer = gamePlayersRef.current.find((p) => p.id === player.id);

        if (foundPlayer) {
            updateGamePlayerAttributes(player, { team, position: { x: dropX, y: dropY } });
        } else {
            const foundRealPlayer = playersRef.current.some(p => p.id == player.id);
            if (foundRealPlayer) {
                setGamePlayers([...gamePlayersRef.current, {
                    id: player.id,  // Or use a smarter way to generate a unique ID
                    guest_name: null,
                    team: team,
                    position: { x: dropX, y: dropY } as Point
                }]);
            }
        }
    };

    const removeFromGame = async (playerToRemove: GamePlayer) => {
        const updatedPlayers: GamePlayer[] = gamePlayersRef.current
            .map((player) => {
                if (player.id === playerToRemove.id) {
                    return null;
                }
                return player;
            })
            .filter((player): player is GamePlayer => player !== null); // Ensures strict typing


        setGamePlayers(updatedPlayers);
    };

    const switchToRealPlayer = async (oldPlayer: GamePlayer, newID: string) => {
        if (oldPlayer.id === newID) return; // No need to switch if IDs are the same

        const newGamePlayer = gamePlayersRef.current.find((p) => p.id === newID);
        const newPlayer = playersRef.current.find((p) => p.id === newID);

        if (!newPlayer) return;

        if (newGamePlayer) {
            setGamePlayers(gamePlayersRef.current.map((player) => {
                if (player.id === oldPlayer.id) {
                    return { ...player, team: newGamePlayer.team, position: newGamePlayer.position };
                }
                if (player.id === newID) {
                    return { ...player, team: oldPlayer.team, position: oldPlayer.position };
                }
                return player;
            }) as GamePlayer[]);

        } else {
            const updatedPlayers: GamePlayer[] = gamePlayersRef.current
                .map((player) => {
                    if (player.id === oldPlayer.id) {
                        return null;
                    }
                    return player;
                })
                .filter((player): player is GamePlayer => player !== null); // Ensures strict typing

            setGamePlayers([...updatedPlayers, {
                id: newID,
                guest_name: null,
                team: oldPlayer.team,
                position: oldPlayer.position
            }]);
        }
    };

    const switchToNewPlayer = async (oldPlayer: GamePlayer, newName: string, guest: boolean = false) => {
        if (!newName) {
            return;
        }

        if (!oldPlayer) return;

        if (guest) {
            setGamePlayers(gamePlayersRef.current.map((player) => {
                if (player.id === oldPlayer.id) {
                    return { id: null, guest_name: newName, team: oldPlayer.team, position: oldPlayer.position };
                }
                return player;
            }) as GamePlayer[]);
            return;
        }

        const newID = uuidv4();
        const newPlayer = {
            id: newID,  // Or use a smarter way to generate a unique ID
            name: newName,
            stats: defaultAttributes,
        };
        const updated = [...playersRef.current, newPlayer];

        setPlayers(updated);

        playersRef.current = updated;

        await switchToRealPlayer(oldPlayer, newID);
    };


    const adjustTeamSize = (currentPlayers: GamePlayer[], team: string, formation: Formation) => {
        let teamPlayers = currentPlayers.filter((p) => p.team === team);
        const numPlayersNeeded = formation.num_players;

        // Handle surplus players by setting team to null
        if (teamPlayers.length > numPlayersNeeded) {
            teamPlayers = teamPlayers.slice(0, numPlayersNeeded);
        }

        // Handle missing players by adding new guest players
        else if (teamPlayers.length < numPlayersNeeded) {
            const newID = uuidv4();
            const addInc = team === "A" ? 0 : 100;

            const missingPlayers: GamePlayer[] = formation.positions
                .slice(teamPlayers.length, numPlayersNeeded)
                .map((pos, idx) => ({
                    id: newID + idx + addInc,
                    guest_name: "[Player]", // Default placeholder name
                    team,
                    position: pos, // Assign correct position type
                }));

            currentPlayers.push(...missingPlayers);
            teamPlayers = currentPlayers.filter((p) => p.team === team);
        }

        // Ensure all players are assigned correct positions
        teamPlayers.forEach((player, index) => {
            const original = currentPlayers.find((cp) => cp.id === player.id);
            if (original) original.position = formation.positions[index]; // Modify the reference inside `currentPlayers`
        });
    };


    const applyFormation = async (formationId: string) => {
        // Deep copy to ensure state setting triggers a useEffect
        let currPlayers: GamePlayer[] = gamePlayersRef.current
            .filter((player) => !player.guest_name)
            .map((player) => ({ ...player }));

        const formation = formations.find((f: Formation) => f.id === Number(formationId));

        if (!formation) return;

        adjustTeamSize(currPlayers, "A", formation);
        adjustTeamSize(currPlayers, "B", formation);

        setGamePlayers([...currPlayers]); // Ensure a new reference to trigger useEffect
    };

    const resetToDefaultWeights = async () => {
        setZoneWeights(defaultZoneWeights);
    };

    const generateTeams = async (filteredPlayers: Player[]) => {
        let teamA: GamePlayer[] = [];
        let teamB: GamePlayer[] = [];

        const gamePlayersWithStats = filteredPlayers.map(player => {
            return {
                id: player.id,
                guest_name: null,
                team: "A",
                position: { x: 0.5, y: 0.5 } as Point,
                real_name: player.name,
                stats: player.stats
            } as FilledGamePlayer;
        });

        try {
            const balanced = autoCreateTeams(gamePlayersWithStats, zoneWeights);
            teamA = balanced.a;
            teamB = balanced.b;
        } catch (error) {
            return;
        }

        // Create a new array with updated team assignments and positions
        const merged = teamA.concat(teamB);

        // Ensure a new reference and trigger state update
        gamePlayersRef.current = merged;
        setGamePlayers([...merged]); // Spread into a new array to trigger useEffect
    };

    const rebalanceCurrentGame = async () => {
        // Filter players in the current game
        const filteredPlayers = playersRef.current.filter(realPlayer =>
            gamePlayersRef.current.some(gamePlayer => gamePlayer.id === realPlayer.id)
        );

        // Call generateTeams with the filtered players
        await generateTeams(filteredPlayers);
    };

    return (
        <PlayersContext.Provider value={{
            players,
            gamePlayers,
            addPlayer,
            deletePlayer,
            updatePlayerAttributes,
            updateGamePlayerAttributes,
            addExisitingPlayerToGame,
            removeFromGame,
            addNewRealPlayerToGame,
            addNewGuestPlayerToGame,
            switchToRealPlayer,
            switchToNewPlayer,
            applyFormation,
            clearGame,
            zoneWeights,
            resetToDefaultWeights,
            setZoneWeights,
            generateTeams,
            rebalanceCurrentGame,
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