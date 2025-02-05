import React, { useState, useContext, useRef, useEffect } from "react";
import { PlayersContext } from "../global/PlayersContext";
import { useDrag } from "react-dnd";

const PlayerList = () => {
    const { players, addPlayer, deletePlayer } = useContext(PlayersContext);
    const [newPlayerName, setNewPlayerName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [sortOrder, setSortOrder] = useState("dsc"); // State for sorting

    const inputRef = useRef(null);

    const handleAddPlayer = async () => {
        await addPlayer(newPlayerName);
        setNewPlayerName("");
        setIsAdding(false);
    };

    const handleShowAddField = () => {
        setIsAdding(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleAddPlayer();
        }
    };

    const handleDeletePlayer = async (uid) => {
        await deletePlayer(uid); // Call deletePlayer function from context
    };

    const handleSortChange = (e) => {
        setSortOrder(e.target.value); // Update the sort order based on the selection
    };

    // Sort players based on the selected sortOrder (ascending or descending)
    const sortedPlayers = [...players].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (sortOrder === "asc") {
            return nameA > nameB ? -1 : nameA < nameB ? 1 : 0; // Ascending 
        } else {
            return nameA < nameB ? -1 : nameA > nameB ? 1 : 0; // Descending
        }
    });

    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    return (
        <div className="p-4 bg-secondary shadow-lg rounded-lg">
            <h2 className="text-lg font-bold mb-2">Players</h2>

            {/* Sort Options */}
            <div className="mb-4">
                <label className="mr-2">Sort by name:</label>
                <select
                    value={sortOrder}
                    onChange={handleSortChange}
                    className="p-2 border rounded bg-secondary shadow"
                >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>

            <ul>
                {sortedPlayers.map((player) => (
                    <li key={player.uid} className="p-2 border-b flex justify-between items-center">
                        <DraggablePlayer key={player.uid} player={player} />
                        <button
                            onClick={() => handleDeletePlayer(player.uid)}
                            className="text-red-500 ml-2"
                        >
                            X
                        </button>
                    </li>
                ))}
            </ul>

            {isAdding ? (
                <div className="flex mt-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="p-2 border rounded w-full"
                        placeholder="Enter player name"
                    />
                    <button onClick={handleAddPlayer} className="ml-2 px-4 py-2 bg-blue-500 text-white rounded">
                        Add
                    </button>
                </div>
            ) : (
                <button onClick={handleShowAddField} className="mt-2 w-full bg-green-500 text-white p-2 rounded">
                    + Add Player
                </button>
            )}
        </div>
    );
};


const DraggablePlayer = ({ player }) => {
    const [, drag] = useDrag(() => ({
        type: "PLAYER",
        item: { uid: player.uid, name: player.name },
    }));

    return (
        <li ref={drag} className="p-2  cursor-pointer">
            {player.name}
        </li>
    );
};


export default PlayerList;
