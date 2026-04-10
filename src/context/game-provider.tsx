import { openDB } from "idb";
import type React from "react";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { balanceTeams } from "@/auto-balance";
import { useAuth } from "@/context/auth-context";
import { usePitchAnimation } from "@/context/pitch-animation-context";
import { type PlayerV2, usePlayers } from "@/hooks/use-players";
import { logger } from "@/lib/logger";
import { gameStateSchema } from "@/lib/schemas";
import { getPointForPosition } from "@/lib/utils/pitch-rendering";
import { decodeStateFromURL } from "@/lib/utils/url-state";
import type { Formation } from "@/types/formations";
import type { Position } from "@/types/positions";
import { POSITIONS } from "@/types/positions";

const DB_NAME = "GameDB";
const STORE_NAME = "gameState";

// ─── IndexedDB Utilities ────────────────────────────────────────────────────

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

// ─── Game Player Type ───────────────────────────────────────────────────────
// Minimal type for players in an active game session.

export interface GamePlayer {
    id: string;
    name: string;
    isGuest: boolean;
    team: string;
    position: { x: number; y: number };
    exactPosition: Position;
}

// ─── Context ────────────────────────────────────────────────────────────────

interface GameContextType {
    gamePlayers: Record<string, GamePlayer>;
    currentFormation: Formation | null;

    clearGame: () => void;
    removeFromGame: (playerToRemove: GamePlayer) => void;
    switchToRealPlayer: (oldPlayer: GamePlayer, newID: string) => void;
    applyFormation: (formation: Formation) => void;
    generateTeams: (filteredPlayers: PlayerV2[]) => void;
    rebalanceCurrentGame: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
    children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
    const { urlState, clearUrlState } = useAuth();
    const { data: players = {} } = usePlayers();
    const { triggerAnimation } = usePitchAnimation();
    const location = useLocation();

    const isStaticRoute = location.pathname.startsWith("/auth") || location.pathname === "/data-deletion";

    const [gamePlayers, setGamePlayers] = useState<Record<string, GamePlayer>>({});
    const [currentFormation, setCurrentFormation] = useState<Formation | null>(null);
    const loadingState = useRef(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

    // Clean up old tab data on startup
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

        saveState(newGamePlayers, formation || null);
        setGamePlayers(newGamePlayers);
        setCurrentFormation(formation || null);
    };

    const initializeGameState = async () => {
        if (loadingState.current || isStaticRoute) return;

        loadingState.current = true;

        try {
            if (urlState) {
                const currentUrl = new URL(window.location.href);
                const decoded = decodeStateFromURL(urlState);

                if (decoded) {
                    await loadJSONGamePlayers(
                        decoded.gamePlayers as Record<string, GamePlayer>,
                        decoded.currentFormation
                    );
                    currentUrl.searchParams.delete("state");
                    window.history.replaceState({}, "", currentUrl.toString());
                }

                clearUrlState();
                return;
            }

            logger.debug("GAME: Loading game state with tab key:", tabKeyRef.current);
            const savedState = await getFromDB(tabKeyRef.current);
            if (savedState) {
                try {
                    const raw = JSON.parse(savedState);
                    const parsed = gameStateSchema.safeParse(raw);
                    if (!parsed.success) {
                        logger.warn("GAME: Invalid IndexedDB state shape:", parsed.error.issues);
                    } else {
                        logger.debug(
                            "GAME: Loaded game state from IndexedDB:",
                            Object.keys(parsed.data.gamePlayers).length,
                            "players"
                        );
                        await loadJSONGamePlayers(
                            parsed.data.gamePlayers as Record<string, GamePlayer>,
                            parsed.data.currentFormation ?? null
                        );
                    }
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

    // biome-ignore lint/correctness/useExhaustiveDependencies: initializeGameState excluded to prevent re-init loops; urlState triggers re-init on URL change
    useEffect(() => {
        if (isStaticRoute) return;

        initializeGameState().catch((error) => {
            logger.error("GAME: Game state initialization failed:", error);
        });
    }, [urlState, isStaticRoute]);

    // Auto-save debounced
    // biome-ignore lint/correctness/useExhaustiveDependencies: saveState excluded to prevent save loops on every render
    useEffect(() => {
        if (isStaticRoute) return;

        if (!loadingState.current && Object.keys(gamePlayers).length > 0) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveState(gamePlayers, currentFormation);
            }, 500);
        }

        return () => clearTimeout(saveTimeoutRef.current);
    }, [gamePlayers, currentFormation, isStaticRoute]);

    const saveState = async (gamePlayersToSave: Record<string, GamePlayer>, formation: Formation | null = null) => {
        const stateObject = { gamePlayers: gamePlayersToSave, currentFormation: formation };
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

    const clearGame = async () => {
        clearTimeout(saveTimeoutRef.current);
        setGamePlayers({});
        setCurrentFormation(null);
        await saveToDB(tabKeyRef.current, JSON.stringify({ gamePlayers: {}, currentFormation: null }));
    };

    const removeFromGame = async (playerToRemove: GamePlayer) => {
        setGamePlayers((prev) => {
            const updated = { ...prev };
            const newID = uuidv4();
            updated[newID] = {
                id: newID,
                name: "[Player]",
                isGuest: true,
                team: playerToRemove.team,
                position: playerToRemove.position,
                exactPosition: playerToRemove.exactPosition,
            };
            delete updated[playerToRemove.id];
            return updated;
        });
    };

    const switchToRealPlayer = async (oldPlayer: GamePlayer, newID: string) => {
        if (oldPlayer.id === newID || !(oldPlayer.id in gamePlayers) || !(newID in players)) return;

        if (newID in gamePlayers) {
            const newPlayer = gamePlayers[newID];
            setGamePlayers((prev) => ({
                ...prev,
                [oldPlayer.id]: {
                    ...oldPlayer,
                    team: newPlayer.team,
                    position: newPlayer.position,
                    exactPosition: newPlayer.exactPosition,
                },
                [newID]: {
                    ...newPlayer,
                    team: oldPlayer.team,
                    position: oldPlayer.position,
                    exactPosition: oldPlayer.exactPosition,
                },
            }));
        } else {
            const realPlayer = players[newID];
            setGamePlayers((prev) => {
                const updated = { ...prev };
                updated[newID] = {
                    id: realPlayer.id,
                    name: realPlayer.name,
                    isGuest: false,
                    team: oldPlayer.team,
                    position: oldPlayer.position,
                    exactPosition: oldPlayer.exactPosition,
                };
                delete updated[oldPlayer.id];
                return updated;
            });
        }
    };

    const applyFormation = async (formation: Formation) => {
        const applyToTeam = (team: string): Record<string, GamePlayer> => {
            const teamPlayers = Object.values(gamePlayers).filter((p) => p.team === team);
            const result: Record<string, GamePlayer> = {};

            for (const [key, count] of Object.entries(formation.positions)) {
                for (let i = 0; i < (count as number); i++) {
                    const player = teamPlayers.shift();
                    const pos = getPointForPosition(POSITIONS[key as Position], i, count as number, formation);
                    const exactPosition = key as Position;

                    if (player) {
                        result[player.id] = { ...player, team, position: pos, exactPosition };
                    } else {
                        const newID = uuidv4();
                        result[newID] = {
                            id: newID,
                            name: "[Player]",
                            isGuest: true,
                            team,
                            position: pos,
                            exactPosition,
                        };
                    }
                }
            }
            return result;
        };

        triggerAnimation("formation");
        setGamePlayers({ ...applyToTeam("A"), ...applyToTeam("B") });
        setCurrentFormation(formation);
    };

    // ─── Team Generation (V2 balance-first algorithm) ───────────────────────

    const generateTeams = async (filteredPlayers: PlayerV2[]) => {
        try {
            const result = balanceTeams(filteredPlayers.map((p) => ({ id: p.id, name: p.name, traits: p.traits })));

            // Debug: compare teams
            const debugTeam = (team: typeof result.teams.a, label: string) => {
                const rows = team.map((p) => ({
                    name: p.name,
                    pos: p.assignedPosition,
                    ovr: Math.round(p.overall),
                    def: Math.round(p.zoneEffectiveness.def),
                    mid: Math.round(p.zoneEffectiveness.mid),
                    att: Math.round(p.zoneEffectiveness.att),
                }));
                const totals = {
                    name: "TOTAL",
                    pos: "",
                    ovr: rows.reduce((s, r) => s + r.ovr, 0),
                    def: rows.reduce((s, r) => s + r.def, 0),
                    mid: rows.reduce((s, r) => s + r.mid, 0),
                    att: rows.reduce((s, r) => s + r.att, 0),
                };
                console.log(`\n=== ${label} (${result.formations[label === "TEAM A" ? "a" : "b"].name}) ===`);
                console.table([...rows.sort((a, b) => b.ovr - a.ovr), totals]);
            };
            debugTeam(result.teams.a, "TEAM A");
            debugTeam(result.teams.b, "TEAM B");
            console.log("Balance score:", result.score);
            console.log("Swaps:", result.audit.length);

            const playerRecord: Record<string, GamePlayer> = {};

            for (const assigned of [...result.teams.a, ...result.teams.b]) {
                playerRecord[assigned.id] = {
                    id: assigned.id,
                    name: assigned.name,
                    isGuest: false,
                    team: assigned.team === "a" ? "A" : "B",
                    position: assigned.assignedPoint,
                    exactPosition: assigned.assignedPosition,
                };
            }

            triggerAnimation("generation");
            setGamePlayers(playerRecord);
            setCurrentFormation(result.formations.a);
        } catch (error) {
            logger.error("Team generation error", error);
        }
    };

    const rebalanceCurrentGame = async () => {
        const activePlayers: PlayerV2[] = [];

        for (const [id] of Object.entries(gamePlayers)) {
            if (id in players) {
                activePlayers.push(players[id]);
            }
        }

        await generateTeams(activePlayers);
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
