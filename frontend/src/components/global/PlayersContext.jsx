import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

// Create Context
export const PlayersContext = createContext();

export const PlayersProvider = ({ children }) => {
    const [players, setPlayers] = useState([]);
    const [gameData, setGame] = useState({});
    const [loading, setLoading] = useState(true);

    // Function to fetch players
    const fetchPlayers = async () => {
        try {
            const response = await axios.get("http://localhost:8000/players");
            setPlayers(response.data);
        } catch (error) {
            console.error("Error fetching players:", error);
        }
    };

    // Function to add a new player
    const addPlayer = async (n) => {
        if (!n.trim()) return;
        try {
            // First, add the player with the provided name
            const response = await axios.post("http://localhost:8000/players",  // The URL for your POST endpoint
                { name: n }  // Pass the name in the request body as a JSON object
            );
            console.log('Player added:', response.data);

            // After adding the player, fetch the updated players list
            await fetchPlayers();

        } catch (error) {
            console.error("Error adding player:", error);
        }
    };

    const deletePlayer = async (uid) => {
        console.log(uid);
        try {
            // The DELETE request now sends the uid in the URL, not in the body
            await axios.delete(`http://localhost:8000/players/${uid}`);

            // After adding the player, fetch the updated players list
            await fetchPlayers();
        } catch (error) {
            console.error("Error deleting player:", error);
        }
    };

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

    // Fetch players on mount
    useEffect(() => {
        fetchPlayers();
        fetchGame();
    }, []);

    return (
        <PlayersContext.Provider value={{ players, setPlayers, gameData, setGame, fetchPlayers, addPlayer, deletePlayer, fetchGame, loading }}>
            {children}
        </PlayersContext.Provider>
    );
};
