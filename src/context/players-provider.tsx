import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { v4 as uuidv4, } from 'uuid';

import { openDB } from "idb";
import { defaultStatScores, PlayerStats } from "@/data/stat-types";
import { Formation, Point, Position, getPointForPosition, getThreatScore, normalizedDefaultWeights, emptyZoneScores } from "@/data/position-types";
import { Player, PlayerUpdate, GamePlayerUpdate, ScoredGamePlayer, ScoredGamePlayerWithThreat, calculateScoresForStats, GamePlayer } from "@/data/player-types";
import { /*, logPlayerStats*/ } from "@/data/auto-balance-types";
import { decodeStateFromURL } from "@/data/state-manager";
import { autoCreateTeamsScored } from "../data/auto-balance";

interface PlayersContextType {
    players: Record<string, Player>;
    gamePlayers: Record<string, ScoredGamePlayerWithThreat>;

    addPlayer: (player: Partial<Player>, onSuccess?: (player: Player) => void) => void;
    deletePlayer: (id: string) => void;
    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;
    updateGamePlayerAttributes: (gamePlayer: ScoredGamePlayerWithThreat, updates: GamePlayerUpdate) => void;

    clearGame: () => void;
    addNewRealPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addNewGuestPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addExisitingPlayerToGame: (player: ScoredGamePlayerWithThreat, team: string, dropX: number, dropY: number) => void;
    removeFromGame: (playerToRemove: ScoredGamePlayerWithThreat) => void;
    switchToRealPlayer: (oldPlayer: ScoredGamePlayerWithThreat, newID: string) => void;
    switchToNewPlayer: (oldPlayer: ScoredGamePlayerWithThreat, newName: string, guest: boolean) => void;

    applyFormation: (formation: Formation) => void;
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

    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [gamePlayers, setGamePlayers] = useState<Record<string, ScoredGamePlayerWithThreat>>({});

    const loadingState = useRef(false);
    const tabKeyRef = useRef(sessionStorage.getItem("tabKey") || `tab-${crypto.randomUUID()}`);

    const pendingUpdatesRef = useRef<Map<string, PlayerUpdate>>(new Map());
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    sessionStorage.setItem("tabKey", tabKeyRef.current);

    const loadJSONGamePlayers = async (newGamePlayers: Record<string, GamePlayer>, freshLoadedPlayers: Record<string, Player>) => {
        if (!newGamePlayers) {
            saveState({});
            setGamePlayers({});
            return;
        }

        const updatedPlayers: Record<string, ScoredGamePlayerWithThreat> = Object.fromEntries(
            Object.entries(newGamePlayers).map(([key, value]) => {
                if (!freshLoadedPlayers[value.id]) {
                    return [key, { ...value, zoneFit: structuredClone(emptyZoneScores), threatScore: 0 }];
                }

                const realPlayer = freshLoadedPlayers[value.id];
                const zoneFit = calculateScoresForStats(realPlayer.stats, normalizedDefaultWeights);
                const threatScore = getThreatScore(value.position, zoneFit);

                return [key, { ...value, zoneFit, threatScore }];
            })
        );
        saveState(updatedPlayers);
        setGamePlayers(updatedPlayers);
    };

    const loadURLState = async () => {
        if (loadingState.current || !supabase) return;

        const freshPlayers = await fetchPlayers();

        if (!urlState) return;

        const currentUrl = new URL(window.location.href);
        const decoded = decodeStateFromURL(urlState);

        loadingState.current = true;
        if (decoded) {
            await loadJSONGamePlayers(decoded.gamePlayers, freshPlayers);
            currentUrl.searchParams.delete("state");
            window.history.replaceState({}, "", currentUrl.toString());
        }

        clearUrlState();

        loadingState.current = false;
    };

    const loadTabState = async () => {
        if (!supabase || loadingState.current) return;

        const freshPlayers = await fetchPlayers();
        const savedState = await getFromDB(tabKeyRef.current);

        if (!savedState) return;

        loadingState.current = true;

        try {
            const parsedData = JSON.parse(savedState);
            await loadJSONGamePlayers(parsedData.gamePlayers, freshPlayers);
            console.log("Loaded from IndexedDB:");
        } catch (error) {

            console.error("Error loading from IndexedDB:", error);
        }

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
        if (urlState) {
            loadURLState();
        } else {
            loadTabState();
        }

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

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        newPlayers[payload.new.id] = payload.new as Player;
                        return newPlayers;
                    });
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

                    const id = payload.new.id;

                    // Skip if local has unsynced changes
                    if (pendingUpdatesRef.current.has(id)) {
                        // console.log(`[Skip RT] Ignoring real-time update for dirty player ${id}`);
                        return;
                    }

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        newPlayers[id] = payload.new as Player;
                        return newPlayers;
                    });
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
                    pendingUpdatesRef.current.delete(payload.old.id);

                    const deletedPlayer = payload.old as Partial<Player>;
                    let id: string | undefined = deletedPlayer?.id;

                    // console.log("Delete ID internal", id, players, gamePlayers);

                    if (!id) return;

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        if (id in newPlayers) delete newPlayers[id];
                        return newPlayers;
                    });

                    setGamePlayers(prevGamePlayers => {
                        const newGamePlayers = { ...prevGamePlayers };
                        if (id in newGamePlayers) delete newGamePlayers[id];
                        return newGamePlayers;
                    });
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
        loadURLState();
    }, [urlState]);

    const fetchPlayers = async (): Promise<Record<string, Player>> => {
        if (!supabase) return {};

        loadingState.current = true;

        const { data, error } = await supabase
            .from("players")
            .select("*")
            .order("name", { ascending: false });

        if (error) {
            console.error("Error fetching players:", error);
            loadingState.current = false;
            return {};
        }

        const playerRecord: Record<string, Player> = {};
        (data || []).forEach(player => {
            playerRecord[player.id] = player;
        });

        setPlayers(playerRecord); // still set state for global use

        loadingState.current = false;
        return playerRecord; // return immediately for local use
    };

    useEffect(() => {
        if (!loadingState.current) {
            // console.log("Saving state from change:", gamePlayers);
            saveState(gamePlayers);
        }
    }, [gamePlayers]);

    const saveState = async (gamePlayersToSave: Record<string, ScoredGamePlayerWithThreat>) => {
        const stateObject = { gamePlayers: gamePlayersToSave };
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
    };

    // optional lamda to call on success
    const addPlayer = async (player: Partial<Player>, onSuccess?: (player: Player) => void) => {
        if (!supabase) return;

        if (player.id != null && player.id in players) return;

        const newPlayer: Player = {
            id: player.id ? player.id : uuidv4(),
            name: player.name ? player.name : "Player Name",
            // stats: player.stats ? player.stats : defaultStatScores,
            stats: player.stats ? player.stats : defaultStatScores,
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
                    // Rollback local state if there's an error
                    console.error('Error deleting player:', error.message);
                } else {
                    console.log('Player deleted successfully:', data);
                }
            });
    };

    // Update player attributes
    const updatePlayerAttributes = (id: string, updates: PlayerUpdate) => {
        setPlayers(prevPlayers => {
            const newPlayers = { ...prevPlayers };
            if (id in newPlayers) {
                newPlayers[id] = { ...newPlayers[id], ...updates } as Player;
            }
            return newPlayers;
        });

        if (id in gamePlayers && updates.stats) {
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                const zoneFit = calculateScoresForStats(updates.stats as PlayerStats, normalizedDefaultWeights);
                newGamePlayers[id].zoneFit = zoneFit;
                newGamePlayers[id].threatScore = getThreatScore(newGamePlayers[id].position, zoneFit);
                return newGamePlayers;
            });
        }

        const existing = pendingUpdatesRef.current.get(id) ?? {};
        pendingUpdatesRef.current.set(id, { ...existing, ...updates });
        debounceFlush();
    };

    // Update player attributes
    const updateGamePlayerAttributes = async (gamePlayer: ScoredGamePlayerWithThreat, updates: GamePlayerUpdate) => {
        setGamePlayers(prevGamePlayers => {
            const newGamePlayers = { ...prevGamePlayers };
            if (gamePlayer.id in newGamePlayers) {
                newGamePlayers[gamePlayer.id] = { ...newGamePlayers[gamePlayer.id], ...updates } as ScoredGamePlayerWithThreat;
            }
            if (updates.position) {
                newGamePlayers[gamePlayer.id].threatScore = getThreatScore(newGamePlayers[gamePlayer.id].position, newGamePlayers[gamePlayer.id].zoneFit);
            }
            return newGamePlayers;
        });

    };

    // Clear game data
    const clearGame = async () => {
        setGamePlayers({});
    };

    // Add real player to game
    const addExisitingPlayerToGame = async (player: ScoredGamePlayerWithThreat, team: string, dropX: number, dropY: number) => {
        // const foundPlayer = gamePlayersRef.current.find((p) => p.id === player.id);

        if (player.id in gamePlayers) {
            updateGamePlayerAttributes(player, { team, position: { x: dropX, y: dropY } });
        } else if (player.id in players) {
            // const foundRealPlayer = playersRef.current.some(p => p.id == player.id);
            // if (foundRealPlayer) {
            //     setGamePlayers([...gamePlayersRef.current, {
            //         id: player.id,  // Or use a smarter way to generate a unique ID
            //         guest_name: null,
            //         team: team,
            //         position: { x: dropX, y: dropY } as Point
            //     }]);
            // }
        }
    };

    const addNewRealPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = uuidv4();

        addPlayer({ id: newID, name }, () => {
            if (!(newID in players)) return;

            const position = { x: dropX, y: dropY } as Point;
            const zoneFit = calculateScoresForStats(players[newID].stats, normalizedDefaultWeights);

            const gamePlayer: ScoredGamePlayerWithThreat = {
                id: newID, team: placedTeam,
                guest_name: null,
                position,
                zoneFit,
                threatScore: getThreatScore(position, zoneFit)
            };
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[gamePlayer.id] = gamePlayer;
                return newGamePlayers;
            });
        });
    };

    const addNewGuestPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = uuidv4();
        const position = { x: dropX, y: dropY } as Point;
        const zoneFit = structuredClone(emptyZoneScores);

        const gamePlayer: ScoredGamePlayerWithThreat = { id: newID, team: placedTeam, guest_name: name, position, zoneFit, threatScore: getThreatScore(position, zoneFit) };
        setGamePlayers(prevGamePlayers => {
            const newGamePlayers = { ...prevGamePlayers };
            newGamePlayers[gamePlayer.id] = gamePlayer;
            return newGamePlayers;
        });
    };

    const removeFromGame = async (playerToRemove: ScoredGamePlayerWithThreat) => {
        setGamePlayers(prevGamePlayers => {
            const newGamePlayers = { ...prevGamePlayers };
            delete newGamePlayers[playerToRemove.id];
            return newGamePlayers;
        });
    };

    const switchToRealPlayer = async (oldPlayer: ScoredGamePlayerWithThreat, newID: string) => {
        // No need to switch if IDs are the same
        // This function has these requirements:
        // old player MUST be in the game already
        // newID MUST belond to an existing player (doesnt have to be in game)
        if (oldPlayer.id === newID || !(oldPlayer.id in gamePlayers) || !(newID in players)) return;

        if (newID in gamePlayers) {
            const newPlayer = gamePlayers[newID];

            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[oldPlayer.id] = { ...oldPlayer, team: newPlayer.team, position: newPlayer.position, threatScore: getThreatScore(newPlayer.position, oldPlayer.zoneFit) };
                newGamePlayers[newID] = { ...newPlayer, team: oldPlayer.team, position: oldPlayer.position, threatScore: getThreatScore(oldPlayer.position, newPlayer.zoneFit) };
                return newGamePlayers;
            });
        } else {
            const newPlayer = players[newID];
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                const zoneFit = calculateScoresForStats(newPlayer.stats, normalizedDefaultWeights);
                newGamePlayers[newID] = { id: newPlayer.id, guest_name: null, team: oldPlayer.team, position: oldPlayer.position, zoneFit, threatScore: getThreatScore(oldPlayer.position, zoneFit) };
                delete newGamePlayers[oldPlayer.id];
                return newGamePlayers;
            });
        }
    };

    // this switches an existing game player to a brand new player entry
    const switchToNewPlayer = async (oldPlayer: ScoredGamePlayerWithThreat, newName: string, guest: boolean = false) => {
        // old player MUST be in the game already
        if (!(oldPlayer.id in gamePlayers)) return;

        if (guest) {
            // setGamePlayers(prevGamePlayers => {
            //     const newGamePlayers = { ...prevGamePlayers };
            //     newGamePlayers[newID] = { id: uuidv4(), guest_name: newName, team: oldPlayer.team, position: oldPlayer.position };
            //     delete newGamePlayers[oldPlayer.id];
            //     return newGamePlayers;
            // });
            // return;
        }

        const newID = uuidv4();

        addPlayer({ id: newID, name: newName }, () => {
            if (!(newID in players)) return;

            const zoneFit = calculateScoresForStats(players[newID].stats, normalizedDefaultWeights);

            const gamePlayer: ScoredGamePlayerWithThreat = {
                id: newID,
                team: oldPlayer.team,
                guest_name: null,
                position: oldPlayer.position,
                zoneFit,
                threatScore: getThreatScore(oldPlayer.position, zoneFit)
            };
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[gamePlayer.id] = gamePlayer;
                delete newGamePlayers[oldPlayer.id];
                return newGamePlayers;
            });
        });
    };


    const applyFormationToTeam = (team: string, formation: Formation) => {
        let teamPlayers = Object.values(gamePlayers).filter((player) => player.team === team);
        let newTeamPlayers: Record<string, ScoredGamePlayerWithThreat> = {};

        for (const [key, value] of Object.entries(formation.positions)) {
            for (let i = 0; i < value; i++) {
                // key is a string
                // value is of type 'unknown' by default — you can cast it
                const player = teamPlayers.shift();
                const position = getPointForPosition(normalizedDefaultWeights[key as Position], i, value);

                if (player) {
                    newTeamPlayers[player.id] = {
                        ...player,
                        team,
                        position
                    }
                } else {
                    const newID = uuidv4();
                    const zoneFit = structuredClone(emptyZoneScores);
                    newTeamPlayers[newID] = {
                        id: newID,
                        guest_name: "[Player]",
                        team,
                        position,
                        zoneFit,
                        threatScore: getThreatScore(position, zoneFit)
                    }
                }
            }

        }

        return newTeamPlayers;

    };

    const applyFormation = async (formation: Formation) => {
        const teamA = applyFormationToTeam("A", formation);
        const teamB = applyFormationToTeam("B", formation);

        // Ensure a new reference and trigger state update
        setGamePlayers({ ...teamA, ...teamB });
    };

    const handleGenerateTeams = async (gamePlayersWithScores: ScoredGamePlayerWithThreat[]) => {
        let teamA: ScoredGamePlayer[] = [];
        let teamB: ScoredGamePlayer[] = [];

        // logPlayerStats(gamePlayers, players);

        try {
            const balanced = autoCreateTeamsScored(gamePlayersWithScores);
            teamA = balanced.a;
            teamB = balanced.b;
        } catch (error) {
            return;
        }

        const playerRecord: Record<string, ScoredGamePlayerWithThreat> = {};
        teamA.forEach(player => {
            playerRecord[player.id] = { ...player, threatScore: getThreatScore(player.position, player.zoneFit) };
        });
        teamB.forEach(player => {
            playerRecord[player.id] = { ...player, threatScore: getThreatScore(player.position, player.zoneFit) };
        });

        setGamePlayers(playerRecord);
    };

    const generateTeams = async (filteredPlayers: Player[]) => {
        const normalizedWeights = normalizedDefaultWeights;
        handleGenerateTeams(filteredPlayers.map(player => {
            const position = { x: 0.5, y: 0.5 } as Point;
            const zoneFit = calculateScoresForStats(player.stats, normalizedWeights);
            return {
                id: player.id,
                guest_name: null,
                team: "A",
                position: position,
                zoneFit: zoneFit,
                threatScore: 0
            } as ScoredGamePlayerWithThreat;
        }));
    };

    const rebalanceCurrentGame = async () => {
        // Filter players in the current game
        let filteredPlayers: ScoredGamePlayerWithThreat[] = [];

        Object.entries(gamePlayers).forEach(([id, player]) => {
            if (!(id in players)) return;

            filteredPlayers.push(player);
        });

        // Call generateTeams with the filtered players
        await handleGenerateTeams(filteredPlayers);
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