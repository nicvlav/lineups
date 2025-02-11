import React, { createContext, useState, useEffect, useRef } from "react";
import { openDB } from "idb";
import LZString from "lz-string";
import { decodeStateFromURL } from "./stateManager";

export const PlayersContext = createContext();

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

const getFromDB = async (key) => {
    const db = await initDB();
    return db.get(STORE_NAME, key);
};

const saveToDB = async (key, value) => {
    const db = await initDB();
    await db.put(STORE_NAME, value, key);
};

export const PlayersProvider = ({ children }) => {
    const [players, setPlayers] = useState([]);
    const [selectedFormation, setSelectedFormations] = useState([]);
    const [formations, setFormations] = useState([]);
    const [loading, setLoading] = useState(false);

    // this is probably hacky? idk about this stale capture bs
    const playersRef = useRef(players);

    useEffect(() => {
        const loadGameState = () => {
            // 1. Read state from URL
            const urlState = decodeStateFromURL2(window.location.search);
            console.log("succeeded 123", urlState);
            if (urlState) {
                setPlayers(urlState.players || []);
                // console.log("urlState:", { urlState });
                return;
            }

            // 2. Load from IndexedDB
            const savedState = getFromDB("latest");
            if (savedState) {
                try {
                    const parsedData = JSON.parse(savedState);
                    setPlayers(urlState.players || []);
                    console.log("parsedData:", { parsedData });
                    return;
                } catch (error) {
                    console.error("Error loading from IndexedDB:", error);
                }
            }
            console.log("over:");
            // 3. Load default state
            setPlayers([]);
        };

        loadGameState();

    }, []);

    useEffect(() => {
        playersRef.current = players;
        console.log("Updated players in context:", players);
        saveState(players);
    }, [players]);

    const decodeStateFromURL2 = (search) => {
        const params = new URLSearchParams(search);
        const stateParam = params.get("state");
        if (!stateParam) return { players: [] }; // Default empty state
        console.log("succeeded 12")
        try {
            const decompressed = LZString.decompressFromEncodedURIComponent(stateParam);
            return JSON.parse(decompressed);
        } catch (error) {
            console.error("Failed to decode state from URL:", error);
            return { players: []}; // Fallback to empty state
        }
    };

    const saveState = async (p) => {
        const stateObject = { players: p };

        console.log("SAVED STATE OBJ ", stateObject);
        const jsonString = JSON.stringify(stateObject);
        const compressed = LZString.compressToEncodedURIComponent(jsonString);

        // Save to IndexedDB
        await saveToDB("latest", jsonString);

        // Update URL with compressed state
        const newUrl = `${window.location.pathname}?state=${compressed}`;
        window.history.pushState({}, "", newUrl);
    };

    const addPlayer = async (name) => {
        if (!name.trim()) return;
        const newUID = Date.now().toString();
        setPlayers(() => {
            const updated = [...playersRef.current, { id: newUID, name, guest: false}];
            return updated;
        });
    };

    const deletePlayer = async (uid) => {
        setPlayers(() => {
            const filtered = playersRef.current.filter(player => player.id !== uid);
            return filtered;
        });
    };


    // Update player attributes
    const updatePlayerAttributes = async (id, updates) => {
        setPlayers(() => {
            const updated = playersRef.current.map(player =>
                player.id === id ? { ...player, ...updates } : player
            );
            playersRef.current = updated; // Keep the ref updated
            return updated;
        });
    };

    // Clear game data
    const clearGame = async () => {
        // setGame([]); // Assuming clearing the state
    };

    // Switch game player
    const switchGamePlayer = (placedTeam, gamePlayerUID, realPlayerUID) => {
        // setGame((prev) => {
        //     const updated = prev.map(player =>
        //         player.uid === gamePlayerUID ? { ...player, base_player_uid: realPlayerUID } : player
        //     );
        //     return updated;
        // });
    };

    // Switch game player to a guest
    const switchGamePlayerToGuest = (placedTeam, gamePlayerUID, newPlayerName) => {
        // setGame((prev) => {
        //     const updated = prev.map(player =>
        //         player.uid === gamePlayerUID ? { ...player, name: newPlayerName } : player
        //     );
        //     return updated;
        // });
    };

    // Add and switch a game player
    const addAndSwitchGamePlayer = (placedTeam, gamePlayerUID, newPlayerName) => {
        // if (!newPlayerName.trim()) return;
        // setPlayers((prev) => {
        //     const newPlayer = { uid: Date.now().toString(), name: newPlayerName };
        //     const updatedPlayers = [...prev, newPlayer];
        //     setGame((gamePrev) => {
        //         const updatedGame = gamePrev.map(player =>
        //             player.uid === gamePlayerUID ? { ...player, base_player_uid: newPlayer.uid } : player
        //         );
        //         return updatedGame;
        //     });
        //     return updatedPlayers;
        // });
    };

    // Add real player to game
    const addRealPlayerToGame = async (placedTeam, realPlayerUID, dropX, dropY) => {
        const foundPlayer = playersRef.current.find((p) => p.id === realPlayerUID);

        if (!foundPlayer) {
            return;
        }

        setPlayers(() => {
            const updated = playersRef.current.map((player) =>
                player === foundPlayer
                    ? { ...player, team: placedTeam, x: dropX, y: dropY }
                    : player
            );
            return updated;
        });
    };

    const addGamePlayerToGame = async (placedTeam, gamePlayerUID, dropX, dropY) => {
        console.log("ytoooo", gamePlayerUID, playersRef.current)
        const foundPlayer = playersRef.current.find((p) => p.id === gamePlayerUID);

        if (foundPlayer) {
            setPlayers(() => {
                const updated = playersRef.current.map((player) =>
                    player === foundPlayer
                        ? { ...player, team: placedTeam, x: dropX, y: dropY }
                        : player
                );
                return updated;
            });

        } else {
            setPlayers(() => {
                const newPlayer = {
                    id: Date.now().toString(),  // Or use a smarter way to generate a unique ID
                    team: placedTeam,
                    name: "Guest",
                    guest: true,
                    x: dropX,
                    y: dropY,
                };
                const updated = [...playersRef.current, newPlayer];
                return updated;
            });
        }
    };

    // Update player position in game
    const updateGamePlayer = (placedTeam, gamePlayer, dropX, dropY) => {
        // setGame((prev) => {
        //     const updated = prev.map(player =>
        //         player.id === gamePlayer.id ? { ...player, x: dropX, y: dropY } : player
        //     );
        //     return updated;
        // });
    };


    // Get players filtered by te

    // Fetch formations
    const fetchFormations = () => {
        setFormations(loadFormationsState()); // Assuming a function to load formations state
    };

    // Apply a formation to a team
    const applyFormation = (formationId, team) => {
        setSelectedFormation(formationId);
    };

    // Generate teams based on players and weighting
    const generateTeams = (filteredPlayers, weighting) => {
        // console.log(filteredPlayers);
        // const generatedTeams = autoCreateTeams(filteredPlayers, weighting); // Assuming a function to auto-generate teams
        // setGame(generatedTeams);
    };


    return (
        <PlayersContext.Provider value={{
            players,
            formations,
            selectedFormation,
            loading,
            addPlayer,
            deletePlayer,
            updatePlayerAttributes,
            addRealPlayerToGame,
            addGamePlayerToGame,
            switchGamePlayer,
            switchGamePlayerToGuest,
            addAndSwitchGamePlayer,
            updateGamePlayer,
            applyFormation,
            clearGame,
            generateTeams
        }}>
            {children}
        </PlayersContext.Provider>
    );
};
