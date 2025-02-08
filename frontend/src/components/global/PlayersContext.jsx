import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

// Create Context
export const PlayersContext = createContext();

export const PlayersProvider = ({ children }) => {
    const [players, setPlayers] = useState([]);
    const [gameData, setGame] = useState({ teams: {} });
    const [loading, setLoading] = useState(true);
    const [formations, setFormations] = useState([]);
    const [selectedFormation, setSelectedFormation] = useState(null);

    // Fetch players from API
    const fetchPlayers = async () => {
        try {
            const response = await axios.get("http://localhost:8000/players");
            setPlayers(response.data);
        } catch (error) {
            console.error("Error fetching players:", error);
        }
    };

    // Add new player
    const addPlayer = async (newPlayerName) => {
        if (!newPlayerName.trim()) return;
        try {
            const response = await axios.post("http://localhost:8000/players", { name: newPlayerName });
            console.log("Player added:", response.data);
            await fetchPlayers();
        } catch (error) {
            console.error("Error adding player:", error);
        }
    };

    // Delete player
    const deletePlayer = async (uid) => {
        try {
            await axios.delete(`http://localhost:8000/players/${uid}`);
            await fetchPlayers();
        } catch (error) {
            console.error("Error deleting player:", error);
        }
    };

    // Fetch game data
    const fetchGame = async () => {
        try {
            setLoading(true);
            const response = await axios.get("http://localhost:8000/game");
            setGame(response.data);
        } catch (error) {
            console.error("Error fetching game data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Clear game data
    const clearGame = async () => {
        try {
            await axios.post("http://localhost:8000/game/clear");
            await fetchGame();
        } catch (error) {
            console.error("Error clearing game:", error);
        }
    };

    // Add player to game
    const addPlayerToGame = async (placedTeam, newUid, dropX, dropY) => {
        console.log("Adding player to team:", placedTeam, newUid);
        try {
            await axios.post(`http://localhost:8000/game/${placedTeam}`, { base_player_uid: newUid, x: dropX, y: dropY });
            await fetchGame();
        } catch (error) {
            console.error("Error adding player:", error);
        }
    };

    // Update player position in game
    const updateGamePlayer = async (placedTeam, newUid, dropX, dropY) => {
        try {
            await axios.put(`http://localhost:8000/game/${placedTeam}`, { base_player_uid: newUid, x: dropX, y: dropY });
        } catch (error) {
            console.error("Error updating player:", error);
        }
    };

    // Find player name by UID
    const findNameByUid = (uid) => {
        const player = players.find((p) => p.uid === uid);
        return player ? player.name : "Guest";
    };

    // Get players filtered by team
    const getTeamPlayers = (team) => {
        if (!gameData || !Array.isArray(gameData)) {
            console.warn("Invalid gameData format:", gameData);
            return [];
        }

        return gameData.filter(player => player.team === team);
    };

    // Fetch formations
    const fetchFormations = async () => {
        try {
            const response = await axios.get("http://localhost:8000/formations");
            setFormations(response.data);
        } catch (error) {
            console.error("Error fetching formations:", error);
        }
    };

    // Apply a formation to a team
    const applyFormation = async (formationId, team) => {
        try {
            console.log(formationId);
            await axios.post(`http://localhost:8000/game/formation/${formationId}`);
            setSelectedFormation(formationId);
            await fetchGame();
        } catch (error) {
            console.error("Error applying formation:", error);
        }
    };

    useEffect(() => {
        fetchPlayers();
        fetchGame();
        fetchFormations();
    }, []);

    return (
        <PlayersContext.Provider
            value={{
                players,
                gameData,
                formations,
                selectedFormation,
                loading,
                addPlayer,
                deletePlayer,
                fetchGame,
                addPlayerToGame,
                updateGamePlayer,
                applyFormation,
                findNameByUid,
                getTeamPlayers,
                clearGame
            }}
        >
            {children}
        </PlayersContext.Provider>
    );
};
