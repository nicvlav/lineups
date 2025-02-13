import React, { useState, useContext, useRef, useEffect } from "react";
import { PlayersContext } from "../global/PlayersContext.jsx";
import { useDrag } from "react-dnd";

const PlayerList = () => {
    const { players, addPlayer, deletePlayer } = useContext(PlayersContext);
    const [newPlayerName, setNewPlayerName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [sortOrder, setSortOrder] = useState("desc");

    const inputRef = useRef(null);

    const handleAddPlayer = async () => {
        await addPlayer(newPlayerName);
        setNewPlayerName("");
        setIsAdding(false);
    };

    const handleShowAddField = () => setIsAdding(true);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleAddPlayer();
    };

    const handleDeletePlayer = async (uid) => await deletePlayer(uid);

    const handleSortChange = (e) => setSortOrder(e.target.value);

    const getNonGuests = () => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.guest !== true);
    };

    const filteredPlayers = getNonGuests(players);

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortOrder === "desc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
    });

    useEffect(() => {
        if (isAdding && inputRef.current) inputRef.current.focus();
    }, [isAdding]);

    return (
        <div className="flex flex-col w-full h-full">
            {/* Sort Options */}
            <SortControls sortOrder={sortOrder} handleSortChange={handleSortChange} />

            {/* Add Player Section */}
            <AddPlayerSection
                isAdding={isAdding}
                newPlayerName={newPlayerName}
                setNewPlayerName={setNewPlayerName}
                handleKeyDown={handleKeyDown}
                handleAddPlayer={handleAddPlayer}
                handleShowAddField={handleShowAddField}
                inputRef={inputRef}
            />

            {/* Scrollable List Component */}
            <ScrollablePlayerList
                players={sortedPlayers}
                handleDeletePlayer={handleDeletePlayer}
            />

        </div>
    );
};

const SortControls = ({ sortOrder, handleSortChange }) => (
    <div className="mb-4 bg-gray-900 p-2 rounded-lg">
        <label className="mr-2 text-white">Sort by name:</label>
        <select
            value={sortOrder}
            onChange={handleSortChange}
            className="p-2 border rounded bg-gray-800 text-white shadow"
        >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
        </select>
    </div>
);

const ScrollablePlayerList = ({ players, handleDeletePlayer }) => (
    <div className="flex-grow overflow-y-auto space-y-2 min-h-0">
        {players.map((player) => (
            <div
                key={player.id}
                className="p-2 border-b flex items-center justify-between shadow-md w-full min-w-0"
            >
                <DraggablePlayer player={player} />
                <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="text-red-500 ml-2 shrink-0"
                >
                    X
                </button>
            </div>
        ))}
    </div>
);

const DraggablePlayer = ({ player }) => {
    const [, drag] = useDrag(() => ({
        type: "PLAYER",
        item: { player_uid: player.id, name: player.name },
    }));

    return (
        <div
            ref={drag}
            className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap min-w-0 text-white"
            style={{
                cursor: "move", // Set the cursor to 'move' when not dragging
            }}
        >
            {player.name}
        </div>
    );
};


const AddPlayerSection = ({
    isAdding,
    newPlayerName,
    setNewPlayerName,
    handleKeyDown,
    handleAddPlayer,
    handleShowAddField,
    inputRef
}) => (
    <div className="bg-gray-900 p-2 border-t border-gray-700 rounded-lg">
        {isAdding ? (
            <div className="flex">
                <input
                    ref={inputRef}
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="p-2 border rounded w-full bg-gray-800 text-white"
                    placeholder="Enter player name"
                />
                <button
                    onClick={handleAddPlayer}
                    className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Add
                </button>
            </div>
        ) : (
            <button
                onClick={handleShowAddField}
                className="w-full bg-green-500 text-white p-2 rounded"
            >
                + Add Player
            </button>
        )}
    </div>
);

export default PlayerList;
