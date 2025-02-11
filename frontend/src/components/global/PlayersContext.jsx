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
            return { players: [] }; // Fallback to empty state
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
            const updated = [...playersRef.current, {
                id: newUID,
                name,
                guest: false,
                attack: 5,
                defense: 5,
                athleticism: 5
            }];
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

    const addNewRealPlayerToGame = async (placedTeam, name, dropX, dropY) => {
        setPlayers(() => {
            const newPlayer = {
                id: Date.now().toString(),  // Or use a smarter way to generate a unique ID
                team: placedTeam,
                name: name,
                guest: false,
                attack: 5,
                defense: 5,
                athleticism: 5,
                x: dropX,
                y: dropY,
            };
            const updated = [...playersRef.current, newPlayer];
            return updated;
        });
    };

    const addNewGuestPlayerToGame = async (placedTeam, name, dropX, dropY) => {
        setPlayers(() => {
            const newPlayer = {
                id: Date.now().toString(),  // Or use a smarter way to generate a unique ID
                team: placedTeam,
                name: name,
                guest: true,
                attack: 5,
                defense: 5,
                athleticism: 5,
                x: dropX,
                y: dropY,
            };
            const updated = [...playersRef.current, newPlayer];
            return updated;
        });
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

    const switchToRealPlayer = async (placedTeam, oldID, newID) => {
        if (oldID === newID) {
            return; // No need to switch if IDs are the same
        }

        // Find the old player in the list (should exist)
        const oldPlayer = playersRef.current.find((p) => p.id === oldID);
        if (!oldPlayer) {
            return; // If old player isn't found, exit early
        }

        // Find the new player in the list (must exist)
        const newPlayer = playersRef.current.find((p) => p.id === newID);
        if (!newPlayer) {
            return; // If new player isn't found, exit early
        }

        // Store the old player's x and y positions
        const { x, y } = oldPlayer;

        // Create the updated player list
        const updatedPlayers = playersRef.current.map((player) => {
            if (player.id === oldID) {
                // If old player was a guest, remove it; otherwise, set team to null
                return oldPlayer.guest ? null : { ...player, team: null };
            }
            if (player.id === newID) {
                // Update the new player's team and assign old player's x, y coordinates
                return { ...player, team: placedTeam, x, y };
            }
            return player;
        }).filter(Boolean); // Remove null entries if a guest was removed

        setPlayers(updatedPlayers);
    };

    const switchToNewPlayer = async (placedTeam, oldID, guestName, guest = false) => {
        if (!guestName) {
            return;
        }
    
        // Find the old player in the list (should exist)
        const oldPlayer = playersRef.current.find((p) => p.id === oldID);
        if (!oldPlayer) {
            return; // Exit early if not found
        }
    
        // Store the old player's x and y positions
        const { x, y, guest: wasGuest } = oldPlayer;
    
        // Create a new guest player
        const newGuest = {
            id: Date.now().toString(), // Generate a unique ID
            name: guestName,
            team: placedTeam,
            x,
            y,
            guest: guest,
        };
    
        // Create the updated player list
        const updatedPlayers = playersRef.current.map((player) =>
            player.id === oldID
                ? wasGuest
                    ? null // Remove if the old player was a guest
                    : { ...player, team: null } // Otherwise, just clear the team
                : player
        ).filter(Boolean); // Remove null entries only for guests
    
        updatedPlayers.push(newGuest); // Add the new guest player
    
        setPlayers(updatedPlayers);
    };

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
            addPlayer,
            deletePlayer,
            updatePlayerAttributes,
            addRealPlayerToGame,
            addNewRealPlayerToGame,
            addNewGuestPlayerToGame,
            switchToRealPlayer,
            switchToNewPlayer,
            applyFormation,
            clearGame,
            generateTeams
        }}>
            {children}
        </PlayersContext.Provider>
    );
};
