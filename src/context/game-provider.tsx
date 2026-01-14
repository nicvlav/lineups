import { openDB } from "idb";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { autoBalance } from "@/auto-balance";
import { useAuth } from "@/context/auth-context";
import { usePitchAnimation } from "@/context/pitch-animation-context";
import { usePlayers } from "@/context/players-provider";
import { logger } from "@/lib/logger";
import { decodeStateFromURL } from "@/lib/utils/url-state";
import { calculateScoresForStats, GamePlayer, Player, ScoredGamePlayer } from "@/types/players";
import {
    emptyZoneScores,
    Formation,
    getPointForPosition,
    normalizedDefaultWeights,
    Point,
    Position,
} from "@/types/positions";

const DB_NAME = "GameDB";
const STORE_NAME = "gameState";

// IndexedDB utility functions
const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
};

const getFromDB = async (key: string) => {
    try {
        const db = await initDB();
        return db.get(STORE_NAME, key);
    } catch (error) {
        logger.error("GAME: IndexedDB read error:", error);
        if (error instanceof Error && (error.name === "InvalidStateError" || error.name === "VersionError")) {
            logger.warn("GAME: IndexedDB corruption detected, clearing...");
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
        logger.error("GAME: IndexedDB write error:", error);
        if (error instanceof Error && (error.name === "InvalidStateError" || error.name === "VersionError")) {
            logger.warn("GAME: IndexedDB corruption detected, clearing...");
            await clearCorruptedDB();
        }
    }
};

const clearCorruptedDB = async () => {
    try {
        logger.info("GAME: Clearing corrupted IndexedDB...");
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        await tx.objectStore(STORE_NAME).clear();
        await tx.done;
        logger.info("GAME: IndexedDB cleared successfully");
    } catch (error) {
        logger.error("GAME: Failed to clear IndexedDB:", error);
        try {
            await indexedDB.deleteDatabase(DB_NAME);
            logger.info("GAME: IndexedDB database deleted");
        } catch (deleteError) {
            logger.error("GAME: Failed to delete IndexedDB:", deleteError);
        }
    }
};

interface GameContextType {
    gamePlayers: Record<string, ScoredGamePlayer>;
    currentFormation: Formation | null;

    clearGame: () => void;
    removeFromGame: (playerToRemove: ScoredGamePlayer) => void;
    switchToRealPlayer: (oldPlayer: ScoredGamePlayer, newID: string) => void;
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
    const { players } = usePlayers();
    const { triggerAnimation } = usePitchAnimation();
    const location = useLocation();

    // Routes that should NOT have game state management
    const isStaticRoute = location.pathname.startsWith("/auth") || location.pathname === "/data-deletion";

    const [gamePlayers, setGamePlayers] = useState<Record<string, ScoredGamePlayer>>({});
    const [currentFormation, setCurrentFormation] = useState<Formation | null>(null);
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

            logger.debug("GAME: Created new tab key:", tabKey);
        } else {
            logger.debug("GAME: Using existing tab key:", tabKey);
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
                const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

                const activeTabKeys = Object.keys(tabRegistry);
                const oldTabKeys = activeTabKeys.filter((key) => tabRegistry[key] < oneWeekAgo);

                if (oldTabKeys.length > 0) {
                    logger.debug(`GAME: Cleaning up ${oldTabKeys.length} old tab keys from IndexedDB`);

                    const db = await initDB();
                    const tx = db.transaction(STORE_NAME, "readwrite");
                    const store = tx.objectStore(STORE_NAME);

                    for (const oldKey of oldTabKeys) {
                        await store.delete(oldKey);
                        delete tabRegistry[oldKey];
                    }

                    await tx.done;
                    localStorage.setItem("tabRegistry", JSON.stringify(tabRegistry));
                }
            } catch (error) {
                logger.error("GAME: Error during tab cleanup:", error);
            }
        };

        setTimeout(cleanupOldTabs, 5000);
    }, []);

    const loadJSONGamePlayers = async (newGamePlayers: Record<string, GamePlayer>, formation?: Formation | null) => {
        if (!newGamePlayers) {
            setGamePlayers({});
            setCurrentFormation(null);
            return;
        }

        const updatedPlayers: Record<string, ScoredGamePlayer> = Object.fromEntries(
            Object.entries(newGamePlayers).map(([key, value]) => {
                if (!players[value.id]) {
                    return [key, { ...value, zoneFit: structuredClone(emptyZoneScores) }];
                }

                const realPlayer = players[value.id];
                const zoneFit = calculateScoresForStats(realPlayer.stats, normalizedDefaultWeights);

                return [key, { ...value, zoneFit }];
            })
        );
        saveState(updatedPlayers, formation || null);
        setGamePlayers(updatedPlayers);
        setCurrentFormation(formation || null);
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
                    await loadJSONGamePlayers(decoded.gamePlayers, decoded.currentFormation);
                    currentUrl.searchParams.delete("state");
                    window.history.replaceState({}, "", currentUrl.toString());
                }

                clearUrlState();
                return;
            }

            // Fall back to IndexedDB state
            logger.debug("GAME: Loading game state with tab key:", tabKeyRef.current);
            const savedState = await getFromDB(tabKeyRef.current);
            if (savedState) {
                try {
                    const parsedData = JSON.parse(savedState);
                    logger.debug(
                        "GAME: Loaded game state from IndexedDB:",
                        parsedData.gamePlayers ? Object.keys(parsedData.gamePlayers).length : 0,
                        "players"
                    );
                    await loadJSONGamePlayers(parsedData.gamePlayers, parsedData.currentFormation);
                } catch (error) {
                    logger.error("GAME: Error loading from IndexedDB:", error);
                }
            } else {
                logger.debug("GAME: No saved game state found in IndexedDB");
            }
        } catch (error) {
            logger.error("GAME: Error during game state initialization:", error);
        } finally {
            loadingState.current = false;
        }
    };

    // Initialize on mount and URL state changes
    useEffect(() => {
        if (isStaticRoute) return;

        initializeGameState().catch((error) => {
            logger.error("GAME: Game state initialization failed:", error);
        });
    }, [urlState, isStaticRoute]);

    // Auto-save to IndexedDB when game state changes
    useEffect(() => {
        if (isStaticRoute) return;

        if (!loadingState.current && Object.keys(gamePlayers).length > 0) {
            saveState(gamePlayers, currentFormation);
        }
    }, [gamePlayers, currentFormation, isStaticRoute]);

    const saveState = async (
        gamePlayersToSave: Record<string, ScoredGamePlayer>,
        formation: Formation | null = null
    ) => {
        const stateObject = {
            gamePlayers: gamePlayersToSave,
            currentFormation: formation,
        };
        logger.debug(
            "GAME: Saving game state with tab key:",
            tabKeyRef.current,
            "players:",
            Object.keys(gamePlayersToSave).length,
            "formation:",
            formation?.name || "none"
        );
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
    };

    // Clear game data
    const clearGame = async () => {
        setGamePlayers({});
        setCurrentFormation(null);
    };

    // switch a player to a dummy player
    const removeFromGame = async (playerToRemove: ScoredGamePlayer) => {
        setGamePlayers((prevGamePlayers) => {
            const newGamePlayers = { ...prevGamePlayers };
            delete newGamePlayers[playerToRemove.id];
            return newGamePlayers;
        });

        setGamePlayers((prevGamePlayers) => {
            const newGamePlayers = { ...prevGamePlayers };
            const newID = uuidv4();
            newGamePlayers[newID] = {
                id: newID,
                name: "[Player]",
                isGuest: true,
                team: playerToRemove.team,
                position: playerToRemove.position,
                exactPosition: playerToRemove.exactPosition,
                zoneFit: structuredClone(emptyZoneScores),
            };
            delete newGamePlayers[playerToRemove.id];
            return newGamePlayers;
        });
    };

    const switchToRealPlayer = async (oldPlayer: ScoredGamePlayer, newID: string) => {
        if (oldPlayer.id === newID || !(oldPlayer.id in gamePlayers) || !(newID in players)) return;

        if (newID in gamePlayers) {
            const newPlayer = gamePlayers[newID];

            setGamePlayers((prevGamePlayers) => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[oldPlayer.id] = {
                    ...oldPlayer,
                    team: newPlayer.team,
                    position: newPlayer.position,
                    exactPosition: newPlayer.exactPosition,
                };
                newGamePlayers[newID] = {
                    ...newPlayer,
                    team: oldPlayer.team,
                    position: oldPlayer.position,
                    exactPosition: oldPlayer.exactPosition,
                };
                return newGamePlayers;
            });
        } else {
            const newPlayer = players[newID];
            setGamePlayers((prevGamePlayers) => {
                const newGamePlayers = { ...prevGamePlayers };
                const zoneFit = calculateScoresForStats(newPlayer.stats, normalizedDefaultWeights);

                newGamePlayers[newID] = {
                    id: newPlayer.id,
                    name: newPlayer.name,
                    isGuest: false,
                    team: oldPlayer.team,
                    position: oldPlayer.position,
                    exactPosition: oldPlayer.exactPosition,
                    zoneFit,
                };
                delete newGamePlayers[oldPlayer.id];
                return newGamePlayers;
            });
        }
    };

    const applyFormationToTeam = (team: string, formation: Formation) => {
        const teamPlayers = Object.values(gamePlayers).filter((player) => player.team === team);
        const newTeamPlayers: Record<string, ScoredGamePlayer> = {};

        for (const [key, value] of Object.entries(formation.positions)) {
            for (let i = 0; i < value; i++) {
                const player = teamPlayers.shift();
                const position = getPointForPosition(normalizedDefaultWeights[key as Position], i, value, formation);

                if (player) {
                    const exactPosition = key as Position;
                    newTeamPlayers[player.id] = {
                        ...player,
                        team,
                        position,
                        exactPosition,
                    };
                } else {
                    const newID = uuidv4();
                    const zoneFit = structuredClone(emptyZoneScores);
                    const exactPosition = key as Position;
                    newTeamPlayers[newID] = {
                        id: newID,
                        name: "[Player]",
                        isGuest: true,
                        team,
                        position,
                        zoneFit,
                        exactPosition,
                    };
                }
            }
        }

        return newTeamPlayers;
    };

    const applyFormation = async (formation: Formation) => {
        const teamA = applyFormationToTeam("A", formation);
        const teamB = applyFormationToTeam("B", formation);

        triggerAnimation("formation");

        setGamePlayers({ ...teamA, ...teamB });
        setCurrentFormation(formation);
    };

    const handleGenerateTeams = async (gamePlayersWithScores: ScoredGamePlayer[]) => {
        let teamA: ScoredGamePlayer[] = [];
        let teamB: ScoredGamePlayer[] = [];
        let formation: Formation | undefined;

        try {
            const balanced = autoBalance(gamePlayersWithScores);
            teamA = balanced.teams.a;
            teamB = balanced.teams.b;
            // Both teams should use the same formation (they're the same size after balancing)
            formation = balanced.formationA || balanced.formationB;
        } catch (error) {
            logger.error("Team generation error", error);
            return;
        }

        const playerRecord: Record<string, ScoredGamePlayer> = {};
        teamA.forEach((player) => {
            playerRecord[player.id] = { ...player };
        });
        teamB.forEach((player) => {
            playerRecord[player.id] = { ...player };
        });

        triggerAnimation("generation");

        setGamePlayers(playerRecord);
        setCurrentFormation(formation || null);
    };

    const generateTeams = async (filteredPlayers: Player[]) => {
        const normalizedWeights = normalizedDefaultWeights;
        handleGenerateTeams(
            filteredPlayers.map((player) => {
                const position = { x: 0.5, y: 0.5 } as Point;
                const zoneFit = calculateScoresForStats(player.stats, normalizedWeights);

                // Determine best position based on zone scores (will be replaced by auto-balance)
                const bestPosition = (Object.entries(zoneFit) as [Position, number][]).reduce(
                    (best, [pos, score]) => (score > best.score ? { position: pos, score } : best),
                    { position: "CM" as Position, score: 0 }
                ).position;

                return {
                    id: player.id,
                    name: player.name,
                    isGuest: false,
                    team: "A",
                    position: position,
                    exactPosition: bestPosition,
                    zoneFit: zoneFit,
                    stats: player.stats,
                } as ScoredGamePlayer;
            })
        );
    };

    const rebalanceCurrentGame = async () => {
        const filteredPlayers: ScoredGamePlayer[] = [];

        Object.entries(gamePlayers).forEach(([id, player]) => {
            if (!(id in players)) return;

            const playerWithStats = {
                ...player,
                stats: players[id].stats,
            };
            filteredPlayers.push(playerWithStats);
        });

        await handleGenerateTeams(filteredPlayers);
    };

    return (
        <GameContext.Provider
            value={{
                gamePlayers,
                currentFormation,

                clearGame,
                removeFromGame,
                switchToRealPlayer,
                applyFormation,
                generateTeams,
                rebalanceCurrentGame,
            }}
        >
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return context;
};
