import React, { useState, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PlayersContext } from "../../utility/PlayersContext";

const PlayerDialog = ({ player, onClose, onSelectExistingPlayer, onSelectGuestPlayer, onAddAndSelectNewPlayer }) => {
    const { players } = useContext(PlayersContext);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    // Create a ref to the input element
    const inputRef = useRef(null);

    // Focus the input when the component mounts
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []); // Empty dependency array means it runs once after the initial render

    const getNonTemps = () => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.temp_formation !== true);
    };

    const nonTempPlayers = getNonTemps();
    
    // Filter players based on search term
    const filteredPlayers = nonTempPlayers.map((p) => {
        const team = p.team || null;
        return {
            ...p,
            team: team,
        };
    }).filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Find if there's an exact match
    const exactMatch = filteredPlayers.find((p) => p.name.toLowerCase() === searchTerm.toLowerCase());

    // Handle Player Selection with Warning
    const handlePlayerSelection = (selected) => {
        if (selected.team) {
            setSelectedPlayer(selected); // Show confirmation before switching
        } else {
            onSelectExistingPlayer(player.id, selected);
            onClose();
        }
    };

    // Confirm team removal and switch player
    const confirmSelection = () => {
        onSelectExistingPlayer(player.id, selectedPlayer);
        setSelectedPlayer(null);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-brown p-4 rounded shadow-lg w-80">
                <h2 className="text-lg font-bold mb-2">Switch Player: {player.name}</h2>

                {/* Search Input */}
                <input
                    ref={inputRef} // Attach the ref to the input element
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded mb-2"
                    placeholder="Search or enter new player..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Player List */}
                <ul className="max-h-40 overflow-y-auto">
                    {filteredPlayers.map((p) => (
                        <li
                            key={p.id}
                            className={`p-2 cursor-pointer hover:bg-gray-200 flex justify-between items-center ${p.team ? "text-red-500" : ""}`}
                            onClick={() => handlePlayerSelection(p)}
                        >
                            {p.name}
                            {p.team && <span className="text-sm font-semibold">({p.team})</span>}
                        </li>
                    ))}
                </ul>

                {/* Select Existing Player Button */}
                {exactMatch && (
                    <button
                        className="mt-2 w-full bg-green-500 text-white p-2 rounded"
                        onClick={() => handlePlayerSelection(exactMatch)}
                    >
                        Select {exactMatch.name}
                    </button>
                )}

                {/* Add and Select New Player Button */}
                {!exactMatch && searchTerm && (
                    <>
                        <button
                            className="mt-2 w-full bg-blue-500 text-white p-2 rounded"
                            onClick={() => {
                                onAddAndSelectNewPlayer(player.id, searchTerm);
                                onClose();
                            }}
                        >
                            + Add & Select "{searchTerm}"
                        </button>

                        <button
                            className="mt-2 w-full bg-yellow-500 text-white p-2 rounded"
                            onClick={() => {
                                onSelectGuestPlayer(player.id, searchTerm);
                                onClose();
                            }}
                        >
                            Add "{searchTerm}" as Guest
                        </button>
                    </>
                )}

                {/* Cancel Button */}
                <button className="mt-2 w-full bg-red-500 text-white p-2 rounded" onClick={onClose}>
                    Cancel
                </button>

                {/* Confirmation Dialog */}
                {selectedPlayer && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60">
                        <div className="bg-black p-4 rounded shadow-lg w-72">
                            <h3 className="text-lg font-bold mb-2">Warning</h3>
                            <p className="mb-4">{selectedPlayer.name} is already in team "{selectedPlayer.team}". Switching will remove them from that team. Proceed?</p>
                            <button className="w-full bg-red-500 text-white p-2 rounded mb-2" onClick={confirmSelection}>
                                Yes, Switch Player
                            </button>
                            <button className="w-full bg-gray-500 text-white p-2 rounded" onClick={() => setSelectedPlayer(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PlayerDialog;
