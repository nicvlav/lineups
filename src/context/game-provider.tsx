import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { usePitchAnimation } from "@/context/pitch-animation-context";
import { useLocation } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { openDB } from "idb";

import { Formation, Point, Position, getPointForPosition, getThreatScore, normalizedDefaultWeights, emptyZoneScores } from "@/data/position-types";
import { Player, ScoredGamePlayer, ScoredGamePlayerWithThreat, calculateScoresForStats, GamePlayer } from "@/data/player-types";
import { decodeStateFromURL } from "@/data/state-manager";
import { autoBalanceV3 } from "@/data/auto-balance";

const DB_NAME = "GameDB";
const STORE_NAME = "gameState";

// IndexedDB utility functions
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
    try {
        const db = await initDB();
        return db.get(STORE_NAME, key);
    } catch (error) {
        console.error('💥 GAME: IndexedDB read error:', error);
        if (error instanceof Error && (error.name === 'InvalidStateError' || error.name === 'VersionError')) {
            console.warn('GAME: IndexedDB corruption detected, clearing...');
            await clearCorruptedDB();
        }
        return null;
    }
};

const saveToDB = async (key: string, value: string) => {
    try {
        const db = await initDB();
        await db.put(STORE_NAME, value, key);
    } catch (error) {
        console.error('💥 GAME: IndexedDB write error:', error);
        if (error instanceof Error && (error.name === 'InvalidStateError' || error.name === 'VersionError')) {
            console.warn('GAME: IndexedDB corruption detected, clearing...');
            await clearCorruptedDB();
        }
    }
};

const clearCorruptedDB = async () => {
    try {
        console.log('🧹 GAME: Clearing corrupted IndexedDB...');
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.objectStore(STORE_NAME).clear();
        await tx.done;
        console.log('✅ GAME: IndexedDB cleared successfully');
    } catch (error) {
        console.error('❌ GAME: Failed to clear IndexedDB:', error);
        try {
            await indexedDB.deleteDatabase(DB_NAME);
            console.log('🗑️ GAME: IndexedDB database deleted');
        } catch (deleteError) {
            console.error('💥 GAME: Failed to delete IndexedDB:', deleteError);
        }
    }
};

interface GameContextType {
    gamePlayers: Record<string, ScoredGamePlayerWithThreat>;

    clearGame: () => void;
    addNewRealPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addNewGuestPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addExisitingPlayerToGame: (player: ScoredGamePlayerWithThreat, team: string, dropX: number, dropY: number) => void;
    removeFromGame: (playerToRemove: ScoredGamePlayerWithThreat) => void;
    switchToRealPlayer: (oldPlayer: ScoredGamePlayerWithThreat, newID: string) => void;
    switchToNewPlayer: (oldPlayer: ScoredGamePlayerWithThreat, newName: string, guest: boolean) => void;

    updateGamePlayerPosition: (gamePlayer: GamePlayer, newPosition: { x: number; y: number }) => void;

    applyFormation: (formation: Formation) => void;
    generateTeams: (filteredPlayers: Player[]) => void;
    rebalanceCurrentGame: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
    children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
    const { urlState, clearUrlState } = useAuth();
    const { players, addPlayer } = usePlayers();
    const { triggerAnimation } = usePitchAnimation();
    const location = useLocation();

    // Routes that should NOT have game state management
    const isStaticRoute = location.pathname.startsWith('/auth') ||
        location.pathname === '/data-deletion';

    const [gamePlayers, setGamePlayers] = useState<Record<string, ScoredGamePlayerWithThreat>>({});
    const loadingState = useRef(false);

    // Create unique tab key per browser tab (survives refresh but not tab sharing)
    const getOrCreateTabKey = () => {
        let tabKey = sessionStorage.getItem("tabKey");

        if (!tabKey) {
            tabKey = `tab-${crypto.randomUUID()}`;
            sessionStorage.setItem("tabKey", tabKey);

            const tabRegistry = JSON.parse(localStorage.getItem("tabRegistry") || "{}");
            tabRegistry[tabKey] = Date.now();
            localStorage.setItem("tabRegistry", JSON.stringify(tabRegistry));

            console.log('🆕 GAME: Created new tab key:', tabKey);
        } else {
            console.log('🔄 GAME: Using existing tab key:', tabKey);
        }

        return tabKey;
    };

    const tabKeyRef = useRef(getOrCreateTabKey());

    // Clean up old tab data on startup (prevent IndexedDB bloat)
    useEffect(() => {
        const cleanupOldTabs = async () => {
            try {
                const tabRegistry = JSON.parse(localStorage.getItem("tabRegistry") || "{}");
                const now = Date.now();
                const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

                const activeTabKeys = Object.keys(tabRegistry);
                const oldTabKeys = activeTabKeys.filter(key => tabRegistry[key] < oneWeekAgo);

                if (oldTabKeys.length > 0) {
                    console.log(`🧹 GAME: Cleaning up ${oldTabKeys.length} old tab keys from IndexedDB`);

                    const db = await initDB();
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);

                    for (const oldKey of oldTabKeys) {
                        await store.delete(oldKey);
                        delete tabRegistry[oldKey];
                    }

                    await tx.done;
                    localStorage.setItem("tabRegistry", JSON.stringify(tabRegistry));
                }
            } catch (error) {
                console.error('GAME: Error during tab cleanup:', error);
            }
        };

        setTimeout(cleanupOldTabs, 5000);
    }, []);

    const loadJSONGamePlayers = async (newGamePlayers: Record<string, GamePlayer>) => {
        if (!newGamePlayers) {
            setGamePlayers({});
            return;
        }

        const updatedPlayers: Record<string, ScoredGamePlayerWithThreat> = Object.fromEntries(
            Object.entries(newGamePlayers).map(([key, value]) => {
                if (!players[value.id]) {
                    return [key, { ...value, zoneFit: structuredClone(emptyZoneScores), threatScore: 0 }];
                }

                const realPlayer = players[value.id];
                const zoneFit = calculateScoresForStats(realPlayer.stats, normalizedDefaultWeights);
                const threatScore = getThreatScore(value.position, zoneFit, value.exactPosition);

                return [key, { ...value, zoneFit, threatScore }];
            })
        );
        saveState(updatedPlayers);
        setGamePlayers(updatedPlayers);
    };

    // Initialize game state
    const initializeGameState = async () => {
        if (loadingState.current || isStaticRoute) {
            return;
        }

        loadingState.current = true;

        try {
            // Handle URL state first (takes precedence)
            if (urlState) {
                const currentUrl = new URL(window.location.href);
                const decoded = decodeStateFromURL(urlState);

                if (decoded) {
                    await loadJSONGamePlayers(decoded.gamePlayers);
                    currentUrl.searchParams.delete("state");
                    window.history.replaceState({}, "", currentUrl.toString());
                }

                clearUrlState();
                return;
            }

            // Fall back to IndexedDB state
            console.log('GAME: Loading game state with tab key:', tabKeyRef.current);
            const savedState = await getFromDB(tabKeyRef.current);
            if (savedState) {
                try {
                    const parsedData = JSON.parse(savedState);
                    console.log('GAME: Loaded game state from IndexedDB:', parsedData.gamePlayers ? Object.keys(parsedData.gamePlayers).length : 0, 'players');
                    await loadJSONGamePlayers(parsedData.gamePlayers);
                } catch (error) {
                    console.error('GAME: Error loading from IndexedDB:', error);
                }
            } else {
                console.log('GAME: No saved game state found in IndexedDB');
            }
        } catch (error) {
            console.error('GAME: Error during game state initialization:', error);
        } finally {
            loadingState.current = false;
        }
    };

    // Initialize on mount and URL state changes
    useEffect(() => {
        if (isStaticRoute) return;

        initializeGameState().catch(error => {
            console.error('GAME: Game state initialization failed:', error);
        });
    }, [urlState, isStaticRoute]);

    // Auto-save to IndexedDB when game state changes
    useEffect(() => {
        if (isStaticRoute) return;

        if (!loadingState.current && Object.keys(gamePlayers).length > 0) {
            saveState(gamePlayers);
        }
    }, [gamePlayers, isStaticRoute]);

    const saveState = async (gamePlayersToSave: Record<string, ScoredGamePlayerWithThreat>) => {
        const stateObject = { gamePlayers: gamePlayersToSave };
        console.log('GAME: Saving game state with tab key:', tabKeyRef.current, 'players:', Object.keys(gamePlayersToSave).length);
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
    };

    // Clear game data
    const clearGame = async () => {
        setGamePlayers({});
    };

    // Add existing player to game
    const addExisitingPlayerToGame = async (player: ScoredGamePlayerWithThreat, team: string, dropX: number, dropY: number) => {
        if (player.id in gamePlayers) {
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                const position = { x: dropX, y: dropY };
                newGamePlayers[player.id] = {
                    ...newGamePlayers[player.id],
                    team,
                    position,
                    threatScore: getThreatScore(position, newGamePlayers[player.id].zoneFit, newGamePlayers[player.id].exactPosition)
                };
                return newGamePlayers;
            });
        }
    };

    const addNewRealPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = uuidv4();

        addPlayer({ id: newID, name }, () => {
            if (!(newID in players)) return;

            const position = { x: dropX, y: dropY } as Point;
            const zoneFit = calculateScoresForStats(players[newID].stats, normalizedDefaultWeights);

            const gamePlayer: ScoredGamePlayerWithThreat = {
                id: newID,
                team: placedTeam,
                guest_name: null,
                position,
                zoneFit,
                threatScore: getThreatScore(position, zoneFit, null)
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

        const gamePlayer: ScoredGamePlayerWithThreat = {
            id: newID,
            team: placedTeam,
            guest_name: name,
            position,
            zoneFit,
            threatScore: getThreatScore(position, zoneFit)
        };
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
        if (oldPlayer.id === newID || !(oldPlayer.id in gamePlayers) || !(newID in players)) return;

        if (newID in gamePlayers) {
            const newPlayer = gamePlayers[newID];

            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[oldPlayer.id] = {
                    ...oldPlayer,
                    team: newPlayer.team,
                    position: newPlayer.position,
                    threatScore: getThreatScore(newPlayer.position, oldPlayer.zoneFit, oldPlayer.exactPosition)
                };
                newGamePlayers[newID] = {
                    ...newPlayer,
                    team: oldPlayer.team,
                    position: oldPlayer.position,
                    threatScore: getThreatScore(oldPlayer.position, newPlayer.zoneFit, newPlayer.exactPosition)
                };
                return newGamePlayers;
            });
        } else {
            const newPlayer = players[newID];
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                const zoneFit = calculateScoresForStats(newPlayer.stats, normalizedDefaultWeights);
                newGamePlayers[newID] = {
                    id: newPlayer.id,
                    guest_name: null,
                    team: oldPlayer.team,
                    position: oldPlayer.position,
                    zoneFit,
                    threatScore: getThreatScore(oldPlayer.position, zoneFit, oldPlayer.exactPosition)
                };
                delete newGamePlayers[oldPlayer.id];
                return newGamePlayers;
            });
        }
    };

    const switchToNewPlayer = async (oldPlayer: ScoredGamePlayerWithThreat, newName: string, guest: boolean = false) => {
        if (!(oldPlayer.id in gamePlayers)) return;

        if (guest) {
            return;
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
                threatScore: getThreatScore(oldPlayer.position, zoneFit, oldPlayer.exactPosition)
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
        const teamPlayers = Object.values(gamePlayers).filter((player) => player.team === team);
        const newTeamPlayers: Record<string, ScoredGamePlayerWithThreat> = {};

        for (const [key, value] of Object.entries(formation.positions)) {
            for (let i = 0; i < value; i++) {
                const player = teamPlayers.shift();
                const position = getPointForPosition(normalizedDefaultWeights[key as Position], i, value, formation);

                if (player) {
                    const exactPosition = key as Position;
                    const threatScore = getThreatScore(position, player.zoneFit, exactPosition);
                    newTeamPlayers[player.id] = {
                        ...player,
                        team,
                        position,
                        exactPosition,
                        threatScore
                    }
                } else {
                    const newID = uuidv4();
                    const zoneFit = structuredClone(emptyZoneScores);
                    const exactPosition = key as Position;
                    newTeamPlayers[newID] = {
                        id: newID,
                        guest_name: "[Player]",
                        team,
                        position,
                        zoneFit,
                        exactPosition,
                        threatScore: getThreatScore(position, zoneFit, exactPosition)
                    }
                }
            }
        }

        return newTeamPlayers;
    };

    const applyFormation = async (formation: Formation) => {
        const teamA = applyFormationToTeam("A", formation);
        const teamB = applyFormationToTeam("B", formation);

        triggerAnimation('formation');

        setGamePlayers({ ...teamA, ...teamB });
    };

    const handleGenerateTeams = async (gamePlayersWithScores: ScoredGamePlayerWithThreat[]) => {
        let teamA: ScoredGamePlayer[] = [];
        let teamB: ScoredGamePlayer[] = [];

        try {
            const balanced = autoBalanceV3(gamePlayersWithScores);
            teamA = balanced.teams.a;
            teamB = balanced.teams.b;
        } catch (error) {
            return;
        }

        const playerRecord: Record<string, ScoredGamePlayerWithThreat> = {};
        teamA.forEach(player => {
            playerRecord[player.id] = { ...player, threatScore: getThreatScore(player.position, player.zoneFit, player.exactPosition) };
        });
        teamB.forEach(player => {
            playerRecord[player.id] = { ...player, threatScore: getThreatScore(player.position, player.zoneFit, player.exactPosition) };
        });

        triggerAnimation('generation');

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
                threatScore: 0,
                stats: player.stats
            } as ScoredGamePlayerWithThreat;
        }));
    };

    const rebalanceCurrentGame = async () => {
        const filteredPlayers: ScoredGamePlayerWithThreat[] = [];

        Object.entries(gamePlayers).forEach(([id, player]) => {
            if (!(id in players)) return;

            const playerWithStats = {
                ...player,
                stats: players[id].stats
            };
            filteredPlayers.push(playerWithStats);
        });

        await handleGenerateTeams(filteredPlayers);
    };

    // Update game player position (for drag-and-drop) - CRITICAL for smooth UX
    const updateGamePlayerPosition = (gamePlayer: GamePlayer, newPosition: { x: number; y: number }) => {
        const playerId = gamePlayer.id;
        if (!playerId) return;

        setGamePlayers(prev => {
            const updated = { ...prev };
            if (updated[playerId]) {
                updated[playerId] = {
                    ...updated[playerId],
                    position: newPosition
                };
            }
            return updated;
        });
    };

    return (
        <GameContext.Provider value={{
            gamePlayers,

            clearGame,
            addNewRealPlayerToGame,
            addNewGuestPlayerToGame,
            addExisitingPlayerToGame,
            removeFromGame,
            switchToRealPlayer,
            switchToNewPlayer,

            updateGamePlayerPosition,

            applyFormation,
            generateTeams,
            rebalanceCurrentGame,
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
