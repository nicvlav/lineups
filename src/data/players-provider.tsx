import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
import { openDB } from "idb";
import { Player, Point, Formation, PlayerUpdate, defaultAttributes } from "@/data/player-types";
import {  defaultZoneWeights, Weighting } from "@/data/balance-types";
import { decodeStateFromURL } from "@/data/state-manager";
import { autoCreateTeams } from "./auto-balance";
import formations from "@/data/formations"

interface PlayersContextType {
    players: Player[];
    zoneWeights: Weighting;

    addPlayer: (name: string) => void;
    deletePlayer: (id: string) => void;
    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;

    clearGame: () => void;
    addNewRealPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addNewGuestPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addRealPlayerToGame: (placedTeam: string, realPlayerID: string, dropX: number, dropY: number) => void;
    removeFromGame: (id: string) => void;
    switchToRealPlayer: (placedTeam: string, oldID: string, newID: string) => void;
    switchToNewPlayer: (placedTeam: string | null, oldID: string, name: string, guest: boolean) => void;

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
    const [zoneWeights, setZoneWeights] = useState<Weighting>(defaultZoneWeights);

    // this is probably hacky? idk about this stale capture bs
    const playersRef = useRef(players);
    const tabKeyRef = useRef(sessionStorage.getItem("tabKey") || `tab-${crypto.randomUUID()}`);

    useEffect(() => {
        sessionStorage.setItem("tabKey", tabKeyRef.current); // Ensure it persists in sessionStorage

        const loadGameState = async () => {
            const currentUrl = new URL(window.location.href);
            
            const urlState = decodeStateFromURL(currentUrl.search);

            if (urlState && urlState.players) {
                setPlayers(urlState.players);
                console.log("Loaded from URL:", urlState);

                // Store in tab-specific IndexedDB key
                await saveToDB(tabKeyRef.current, JSON.stringify(urlState));

                // Clear the URL so future reloads use IndexedDB
                currentUrl.searchParams.delete("state");
                window.history.replaceState({}, "", currentUrl.toString());

                return;
            }

            // Load from tab-specific IndexedDB key
            const savedState = await getFromDB(tabKeyRef.current);
            if (savedState) {
                try {
                    const parsedData = JSON.parse(savedState);
                    setPlayers(parsedData.players || []);
                    console.log("Loaded from IndexedDB:", parsedData);
                } catch (error) {
                    console.error("Error loading from IndexedDB:", error);
                }
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
            saveState(players);
        }
    }, [players]);


    const saveState = async (p: Player[]) => {
        const stateObject = { players: p };
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
    };

    const addPlayer = async (name: string) => {
        if (!name.trim()) return;
        const newUID = Date.now().toString();
        setPlayers(() => {
            const updated = [...playersRef.current, {
                id: newUID,
                name,
                guest: false,
                temp_formation: null,
                team: null,
                stats: defaultAttributes,
                position: null,
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

    // Clear game data
    const clearGame = async () => {
        const updatedPlayers: Player[] = playersRef.current
            .filter((player) => !(player.guest || player.temp_formation)) // Remove guests and temp formations
            .map((player) => ({ ...player, team: null })); // Ensure `team: null` but keep other properties

        setPlayers(updatedPlayers); // Pass a strict `Player[]`
    };


    const addNewRealPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        setPlayers(() => {
            const newPlayer = {
                id: Date.now().toString(),  // Or use a smarter way to generate a unique ID
                team: placedTeam,
                name: name,
                guest: false,
                temp_formation: null,
                stats: defaultAttributes,
                position: { x: dropX, y: dropY } as Point,
            };
            const updated = [...playersRef.current, newPlayer];
            return updated;
        });
    };

    const addNewGuestPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        setPlayers(() => {
            const newPlayer = {
                id: Date.now().toString(),  // Or use a smarter way to generate a unique ID
                team: placedTeam,
                name: name,
                guest: true,
                temp_formation: null,
                stats: defaultAttributes,
                position: { x: dropX, y: dropY } as Point,
            };
            const updated = [...playersRef.current, newPlayer];
            return updated;
        });
    };

    // Add real player to game
    const addRealPlayerToGame = async (placedTeam: string, realPlayerID: string, dropX: number, dropY: number) => {
        const foundPlayer = playersRef.current.find((p) => p.id === realPlayerID);

        if (!foundPlayer) {
            return;
        }

        setPlayers(() => {
            const updated = playersRef.current.map((player) =>
                player === foundPlayer
                    ? { ...player, team: placedTeam, position: { x: dropX, y: dropY } as Point }
                    : player
            );
            return updated;
        });
    };

    const removeFromGame = async (id: string) => {
        const updatedPlayers: Player[] = playersRef.current
            .map((player) => {
                if (player.id === id) {
                    return player.guest ? null : { ...player, team: null };
                }
                return player;
            })
            .filter((player): player is Player => player !== null); // Ensures strict typing

        console.log("updatedPlayers", updatedPlayers);
        setPlayers(updatedPlayers);
    };

    const switchToRealPlayer = async (placedTeam: string, oldID: string, newID: string) => {
        if (oldID === newID) return; // No need to switch if IDs are the same

        const oldPlayer = playersRef.current.find((p) => p.id === oldID);
        const newPlayer = playersRef.current.find((p) => p.id === newID);
        if (!oldPlayer || !newPlayer) return;

        // Ensure old player is on the placed team
        if (oldPlayer.team !== placedTeam) return; // Prevent switching if old player is not on the placed team

        const updatedPlayers: Player[] = playersRef.current.map((player) => {
            if (player.id === oldID) {
                return { ...player, team: newPlayer.team, position: newPlayer.position };
            }
            if (player.id === newID) {
                return { ...player, team: oldPlayer.team, position: oldPlayer.position };
            }
            return player;
        });

        setPlayers(updatedPlayers);
    };

    const switchToNewPlayer = async (placedTeam: string | null, oldID: string, newName: string, guest: boolean = false) => {
        if (!newName) {
            return;
        }

        const oldPlayer = playersRef.current.find((p) => p.id === oldID);
        if (!oldPlayer) return;

        const oldPosition = oldPlayer.position;

        const newGuest: Player = {
            id: Date.now().toString(),
            name: newName,
            team: placedTeam,
            guest: guest,
            temp_formation: null,
            stats: defaultAttributes, // Default balanced stats
            position: oldPosition, // Keeps the same position as oldPlayer
        };

        const updatedPlayers: Player[] = playersRef.current
            .map((player) =>
                player.id === oldID
                    ? oldPlayer.guest
                        ? null // Remove if old player was a guest
                        : { ...player, team: null } // Otherwise, clear team
                    : player
            )
            .filter((player): player is Player => player !== null);

        updatedPlayers.push(newGuest);

        setPlayers(updatedPlayers);
    };


    const adjustTeamSize = (currentPlayers: Player[], team: string, formation: Formation) => {
        let teamPlayers = currentPlayers.filter((p) => p.team === team);
        const numPlayersNeeded = formation.num_players;

        // Handle surplus players by setting team to null
        if (teamPlayers.length > numPlayersNeeded) {
            teamPlayers.slice(numPlayersNeeded).forEach((p) => {
                const original = currentPlayers.find((cp) => cp.id === p.id);
                if (original) original.team = null; // Modify the reference inside `currentPlayers`
            });
            teamPlayers = teamPlayers.slice(0, numPlayersNeeded);
        }

        // Handle missing players by adding new guest players
        if (teamPlayers.length < numPlayersNeeded) {
            const missingPlayers: Player[] = formation.positions
                .slice(teamPlayers.length, numPlayersNeeded)
                .map((pos, index) => ({
                    id: Date.now().toString() + currentPlayers.length.toString() + index, // Unique ID
                    name: "[Player]", // Default placeholder name
                    team,
                    guest: true,
                    temp_formation: true,
                    stats: defaultAttributes, // Default stats
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
        let currPlayers: Player[] = playersRef.current
            .filter((player) => !player.temp_formation)
            .map((player) => ({ ...player }));

        players.filter((player) => !player.guest); // This line has no effect (it does not modify `players`)

        const formation = formations.find((f: Formation) => f.id === Number(formationId));

        if (!formation) return;

        adjustTeamSize(currPlayers, "A", formation);
        adjustTeamSize(currPlayers, "B", formation);

        setPlayers([...currPlayers]); // Ensure a new reference to trigger useEffect
    };

    const resetToDefaultWeights = async () => {
        setZoneWeights(defaultZoneWeights);
    };

    const generateTeams = async (filteredPlayers: Player[]) => {
        // Remove all players with temp_formation === true
        playersRef.current = playersRef.current.filter((player) => !player.temp_formation);
        filteredPlayers = filteredPlayers.filter((player) => !player.temp_formation);

        let teamA: Player[] = [];
        let teamB: Player[] = [];

        try {
            const balanced = autoCreateTeams(filteredPlayers, zoneWeights);
            teamA = balanced.a;
            teamB = balanced.b;
        } catch (error) {
            return;
        }

        // Create lookup maps for quick access
        const teamAMap = new Map<string, Player>(teamA.map((player) => [player.id, player]));
        const teamBMap = new Map<string, Player>(teamB.map((player) => [player.id, player]));

        // Create a new array with updated team assignments and positions
        const updatedPlayers: Player[] = playersRef.current
            .map((player) => {
                if (teamAMap.has(player.id)) {
                    return { ...player, team: "A", position: teamAMap.get(player.id)?.position ?? null };
                } else if (teamBMap.has(player.id)) {
                    return { ...player, team: "B", position: teamBMap.get(player.id)?.position ?? null };
                } else {
                    return { ...player, team: null };
                }
            })
            .filter((player): player is Player => !(player.team === null && player.guest)); // Remove guests with no team

        // Ensure a new reference and trigger state update
        playersRef.current = updatedPlayers;
        setPlayers([...updatedPlayers]); // Spread into a new array to trigger useEffect
    };

    const rebalanceCurrentGame = async () => {
        // Filter players who have a non-null team
        const filteredPlayers = playersRef.current.filter((player) => player.team !== null);

        // Update state to reflect the removal
        setPlayers([...playersRef.current]);

        // Call generateTeams with the filtered players
        await generateTeams(filteredPlayers);
    };

    return (
        <PlayersContext.Provider value={{
            players,
            addPlayer,
            deletePlayer,
            updatePlayerAttributes,
            addRealPlayerToGame,
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