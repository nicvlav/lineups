import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
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
    const [players, setPlayers] = useState<Player[]>([]);
    const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);

    const [zoneWeights, setZoneWeights] = useState<Weighting>(defaultZoneWeights);

    // this is probably hacky? idk about this stale capture bs
    const playersRef = useRef(players);
    const loadingState = useRef(false);
    const gamePlayersRef = useRef(gamePlayers);
    const tabKeyRef = useRef(sessionStorage.getItem("tabKey") || `tab-${crypto.randomUUID()}`);

    useEffect(() => {
        sessionStorage.setItem("tabKey", tabKeyRef.current); // Ensure it persists in sessionStorage

        const loadGameState = async () => {
            const currentUrl = new URL(window.location.href);
            const urlState = decodeStateFromURL(currentUrl.search);

            if (urlState && urlState.players) {
                setPlayers(urlState.players || []);
                setGamePlayers(urlState.gamePlayers || []);
                console.log("Loaded from URL:", urlState);

                // Store in tab-specific IndexedDB key
                await saveToDB(tabKeyRef.current, JSON.stringify(urlState));

                // Clear the URL so future reloads use IndexedDB
                currentUrl.searchParams.delete("state");
                window.history.replaceState({}, "", currentUrl.toString());

                return;
            }

            // Load from tab-specific IndexedDB key
            loadingState.current = true;
            const savedState = await getFromDB(tabKeyRef.current);
            if (savedState) {
                try {
                    const parsedData = JSON.parse(savedState);
                    setPlayers(parsedData.players || []);
                    setGamePlayers(parsedData.gamePlayers || []);
                    console.log("Loaded from IndexedDB:", parsedData);
                } catch (error) {
                    console.error("Error loading from IndexedDB:", error);
                }
                loadingState.current = false;
                return;
            }

            console.log("No saved state found, using default.");
            setPlayers([]);
        };

        loadGameState();
    }, []);

    useEffect(() => {
        if (playersRef.current !== players) {
            playersRef.current = players;
            console.log("Updated players in context:", players);
            if (!loadingState.current) saveState();
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
        const stateObject = { players: playersRef.current, gamePlayers: gamePlayersRef.current };
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
    };

    const addPlayer = async (name: string) => {
        if (!name.trim()) return;
        const newUID = Date.now().toString();
        setPlayers(() => {
            const updated = [...playersRef.current, {
                id: newUID,
                name,
                stats: defaultAttributes,
            }
            ];

            return updated;
        });
    };

    const deletePlayer = async (uid: string) => {
        setPlayers(() => {
            const filtered = playersRef.current.filter(player => player.id !== uid);
            return filtered;
        });

        setGamePlayers(() => {
            const filtered = gamePlayersRef.current.filter(player => player.id !== uid);
            return filtered;
        });
    };

    // Update player attributes
    const updatePlayerAttributes = async (id: string, updates: PlayerUpdate) => {
        setPlayers((prevPlayers) => {
            const updated = prevPlayers.map((player) =>
                player.id === id ? { ...player, ...updates } : player
            );
            return updated;
        });
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
        setGamePlayers([]); // Pass a strict `Player[]`
    };

    const addNewRealPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = Date.now().toString();
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
        const newID = Date.now().toString();

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
            updateGamePlayerAttributes(player, { team, position: { x: dropX, y: dropY }});
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

        const newID = Date.now().toString();
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
            const newID = Date.now().toString();

            const missingPlayers: GamePlayer[] = formation.positions
                .slice(teamPlayers.length, numPlayersNeeded)
                .map((pos) => ({
                    id: newID,
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

        // Update state to reflect the removal
        setPlayers([...playersRef.current]);

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