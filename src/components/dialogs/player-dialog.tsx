import { useState, useEffect, useRef } from "react";
import { usePlayers } from "@/data/players-provider";
import { Player } from "@/data/player-types";
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
            <div className="flex flex-col h-[80vh] min-w-[200px]">

                {/* Player List - Modern Cards */}
                <div className="sticky top-0 bg-card p-2">
                    <span>Switch Player:</span>
                    {/* Search Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full p-2 borderrounded mb-2"
                        placeholder="Search or enter new player..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-col h-full  overflow-y-auto p-2">
                    {/* Player List */}
                    <ul className="">
                        {filteredPlayers.map((p) => (
                            <li
                                key={p.id}
                                className={`p-2 cursor-pointer flex justify-between  hover:bg-accent items-center break-words whitespace-normal w-full ${p.team ? "text-red-500" : ""
                                    }`}
                                onClick={() => handlePlayerSelection(p)}
                            >
                                {p.name}
                                {p.team && <span className="text-sm font-semibold">({p.team})</span>}
                            </li>
                        ))}
                    </ul>
                </div>


                <div className="flex-col w-full sticky bottom-0 bg-card ">
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
                                className="mt-2 w-full bg-chart-1 p-2 rounded"
                                onClick={() => {
                                    handleSwitchToNewPlayer(searchTerm);
                                    onClose();
                                }}
                            >
                                + Add & Select "{searchTerm}"
                            </Button>

                            <Button
                                className="mt-2 w-full bg-chart-2 p-2 rounded"
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
                        className="mt-2 w-full bg-chart-3 p-2 rounded"
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
                </div>
                <AutoAlertDialog
                    triggerLabel=""
                    messageText={selectedPlayer ? `${selectedPlayer.name} is already on another team. Swap them with the selected player?` : 'Swap the players?'}

                    isOpen={isConfirmOpen}
                    setIsOpen={setConfirmOpen}
                    onCancel={() => setSelectedPlayer(null)}
                    onSuccess={confirmSelection}
                />

            </div>
        </Modal>
    );
};

export default PlayerDialog;
