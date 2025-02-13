import React, { createContext, useState, useEffect, useRef } from "react";
import { openDB } from "idb";
import { decodeStateFromURL } from "./stateManager";
import formations from "./Formations"

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
    const [selectedFormation, setSelectedFormation] = useState([]);

    // this is probably hacky? idk about this stale capture bs
    const playersRef = useRef(players);
    const tabKeyRef = useRef(sessionStorage.getItem("tabKey") || `tab-${crypto.randomUUID()}`);

    useEffect(() => {
        sessionStorage.setItem("tabKey", tabKeyRef.current); // Ensure it persists in sessionStorage

        const loadGameState = async () => {
            const currentUrl = new URL(window.location);
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


    const saveState = async (p) => {
        const stateObject = { players: p };
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
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
        const updatedPlayers = playersRef.current.map((player) => {
            if (player.guest || player.temp_formation) {
                // If old player was a guest, remove it; otherwise, set team to null
                return null;
            }
            return { ...player, team: null };;
        }).filter(Boolean); // Remove null entries if a guest was removed

        setPlayers(updatedPlayers);
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

    const adjustTeamSize = (currentPlayers, team, formation) => {
        let teamPlayers = currentPlayers.filter((p) => p.team === team);
        const numPlayersNeeded = formation.num_players;
        console.log("numPlayersNeeded: ", numPlayersNeeded);

        // // Handle surplus players by setting team to null
        if (teamPlayers.length > numPlayersNeeded) {
            teamPlayers.slice(numPlayersNeeded).forEach((p) => (p.team = null));
            teamPlayers = teamPlayers.slice(0, numPlayersNeeded);
        }

        // // Handle missing players by adding new guest players
        if (teamPlayers.length < numPlayersNeeded) {
            const missingPlayers = formation.positions
                .slice(teamPlayers.length, numPlayersNeeded)
                .map((pos, index) => ({
                    id: Date.now().toString() + currentPlayers.length.toString() + index, // Unique ID
                    name: pos.name, // Use position's name
                    team,
                    guest: true,
                    temp_formation: true,
                    attack: 5,
                    defense: 5,
                    athleticism: 5,
                    x: pos.x,
                    y: pos.y
                }));
            currentPlayers.push(...missingPlayers);
            teamPlayers = currentPlayers.filter((p) => p.team === team);
        }

        console.log("teamPlayers: ", teamPlayers);
        console.log("currentPlayers: ", currentPlayers);

        // // double confirm that all positions have correct players
        teamPlayers.forEach((player, index) => {
            player.x = formation.positions[index].x;
            player.y = formation.positions[index].y;
        });
    };

    // Apply a formation to a team
    const applyFormation = async (formationId) => {
        // deep copy to ensure state setting triggers a use effect
        let currPlayers = playersRef.current.map(player => ({ ...player }));

        console.log("formationId: ", formationId, formations);

        const formation = formations.find((f) => f.id === Number(formationId));

        if (!formation) {
            return;
        }

        adjustTeamSize(currPlayers, "A", formation);
        adjustTeamSize(currPlayers, "B", formation);

        setSelectedFormation(formationId);
        setPlayers(currPlayers);
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
