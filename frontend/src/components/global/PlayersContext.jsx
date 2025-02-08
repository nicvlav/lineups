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
            await fetchPlayers();
            return response.data.id;
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

    const switchGamePlayer = async (placedTeam, gamePlayerUID, realPlayerUID) => {
        try {
            await axios.put(`http://localhost:8000/game/switch/${placedTeam}`, { id: gamePlayerUID, base_player_uid: realPlayerUID});
            await fetchGame();
        } catch (error) {
            console.error("Error switching real player:", error);
        }
    };

    const switchGamePlayerToGuest = async (placedTeam, gamePlayerUID, newPlayerName) => {
        try {
            await axios.put(`http://localhost:8000/game/switch/${placedTeam}`, { id: gamePlayerUID, name: newPlayerName});
            await fetchGame();
        } catch (error) {
            console.error("Error switching guest player:", error);
        }
    };    
    
    const addAndSwitchGamePlayer = async (placedTeam, gamePlayerUID, newPlayerName) => {

        if (!newPlayerName.trim()) return;
        try {
            const id = await addPlayer(newPlayerName);
            switchGamePlayer(placedTeam, gamePlayerUID, id);
        } catch (error) {
            console.error("Error switch + adding player:", error);
        }
    };


    const addRealPlayerToGame = async (placedTeam, realPlayerUID, dropX, dropY) => {
        try {
            await axios.post(`http://localhost:8000/game/${placedTeam}`, { base_player_uid: realPlayerUID, x: dropX, y: dropY });
            await fetchGame();
        } catch (error) {
            console.error("Error adding player:", error);
        }
    };

    // Add player to game
    const addGamePlayerToGame = async (placedTeam, gamePlayerUID, dropX, dropY) => {
        try {
            await axios.post(`http://localhost:8000/game/${placedTeam}`, { id: gamePlayerUID, x: dropX, y: dropY });
            await fetchGame();
        } catch (error) {
            console.error("Error adding player:", error);
        }
    };

    // Update player position in game
    const updateGamePlayer = async (placedTeam, gamePlayer, dropX, dropY) => {
        try {
            await axios.put(`http://localhost:8000/game/${placedTeam}`, { id: gamePlayer.id, base_player_uid: gamePlayer.base_player_uid, x: dropX, y: dropY });
        } catch (error) {
            console.error("Error updating player:", error);
        }
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
                addRealPlayerToGame,
                addGamePlayerToGame,
                switchGamePlayer,
                switchGamePlayerToGuest,
                addAndSwitchGamePlayer,
                updateGamePlayer,
                applyFormation,
                getTeamPlayers,
                clearGame
            }}
        >
            {children}
        </PlayersContext.Provider>
    );
};
