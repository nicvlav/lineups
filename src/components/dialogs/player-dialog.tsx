import { useState, useEffect, useRef } from "react";
import { usePlayers } from "@/data/players-provider";
import { Player } from "@/data/types";
import { Button } from "@/components/ui/button"
import Modal from "@/components/dialogs/modal";
import AutoAlertDialog from "@/components/dialogs/auto-alert-dialog";

interface PlayerDialogProps {
    player: Player;
    isOpen: boolean;
    onClose: () => void;
}

const PlayerDialog: React.FC<PlayerDialogProps> = ({
    player,
    isOpen,
    onClose,
}) => {
    const { players, removeFromGame, switchToRealPlayer, switchToNewPlayer } = usePlayers();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);

    // Create a ref to the input element
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Focus the input when the component mounts
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        setConfirmOpen(selectedPlayer != null && selectedPlayer.team != null);
    }, [selectedPlayer]);

    const getNonTemps = (): Player[] => {
        if (!Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter((p) => p.temp_formation !== true);
    };

    const nonTempPlayers = getNonTemps();

    // Filter players based on search term
    const filteredPlayers = nonTempPlayers
        .map((p) => ({
            ...p,
            team: p.team || null,
        }))
        .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Find if there's an exact match
    const exactMatch = filteredPlayers.find(
        (p) => p.name.toLowerCase() === searchTerm.toLowerCase()
    );

    // Handle Player Selection with Warning
    const handlePlayerSelection = (selected: Player) => {
        // this brings up a confirmation box that requires an ok click
        // look into alter boxes
        if (!selected || selected.team) {
            setSelectedPlayer(selected);
        } else {
            handleSwitchPlayer(selected.id);
            onClose();
        }
    };

    // Confirm team removal and switch player
    const confirmSelection = () => {
        if (selectedPlayer) {
            handleSwitchPlayer(selectedPlayer.id);
            setSelectedPlayer(null);
            onClose();
        }
    };
    const handleSwitchPlayer = (newPlayerid: string) => {
        if (!player.team) return;
        switchToRealPlayer(player.team, player.id, newPlayerid);
    };

    const handleSwitchToNewPlayer = (newPlayerName: string) => {
        if (!player.team) return;
        switchToNewPlayer(player.team, player.id, newPlayerName, false);
    };

    const handleSwitchToNewGuest = (newPlayerName: string) => {
        switchToNewPlayer(player.team, player.id, newPlayerName, true);

    };

    return (
        <Modal title="Player Attributes" isOpen={isOpen} onClose={onClose}>

            <div className="flex items-center justify-center z-50">
                <div className=" rounded shadow-lg w-full">
                    <h2 className="text-lg font-bold mb-2">Switch Player: {player.name}</h2>

                    {/* Search Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full p-2 borderrounded mb-2"
                        placeholder="Search or enter new player..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* Player List */}
                    <ul className="max-h-40 overflow-y-auto">
                        {filteredPlayers.map((p) => (
                            <li
                                key={p.id}
                                className={`p-2 cursor-pointer flex justify-between  hover:bg-accent items-center ${p.team ? "text-red-500" : ""
                                    }`}
                                onClick={() => handlePlayerSelection(p)}
                            >
                                {p.name}
                                {p.team && <span className="text-sm font-semibold">({p.team})</span>}
                            </li>
                        ))}
                    </ul>

                    {/* Select Existing Player Button */}
                    {exactMatch && (
                        <Button
                            className="mt-2 w-full p-2 rounded"
                            onClick={() => handlePlayerSelection(exactMatch)}
                        >
                            Select {exactMatch.name}
                        </Button>
                        
                    )}

                    {/* Add and Select New Player Button */}
                    {!exactMatch && searchTerm && (
                        <>
                            <Button
                                className="mt-2 w-full bg-blue-500 p-2 rounded"
                                onClick={() => {
                                    handleSwitchToNewPlayer(searchTerm);
                                    onClose();
                                }}
                            >
                                + Add & Select "{searchTerm}"
                            </Button>

                            <Button
                                className="mt-2 w-full bg-yellow-500 p-2 rounded"
                                onClick={() => {
                                    handleSwitchToNewGuest(searchTerm);
                                    onClose();
                                }}
                            >
                                Add "{searchTerm}" as Guest
                            </Button>
                        </>
                    )}

                    {/* Remove from Game Button */}
                    <Button
                        className="mt-2 w-full bg-gray-600 p-2 rounded"
                        onClick={() => {
                            removeFromGame(player.id);
                            onClose();
                        }}
                    >
                        Remove from Game
                    </Button>

                    {/* Cancel Button */}
                    <Button className="mt-2 w-full bg-red-500 p-2 rounded" onClick={onClose}>
                        Cancel
                    </Button>

                    <AutoAlertDialog
                        triggerLabel=""
                        messageText={`${player.name} Is already on another team. Are you sure?`}
                        isOpen={isConfirmOpen}
                        setIsOpen={setConfirmOpen}
                        onCancel={() => setSelectedPlayer(null)}
                        onSuccess={confirmSelection}
                    />

                </div>
            </div>
        </Modal>
    );
};

export default PlayerDialog;
