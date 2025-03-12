import { useState, useRef, useEffect } from "react";
import { Player, DnDPlayerItem } from "@/data/types";
import { usePlayers } from "@/data/players-provider";
import { useDrag } from "react-dnd";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"

const PlayerList = () => {
    const { players, addPlayer, deletePlayer, addRealPlayerToGame } = usePlayers();
    const [newPlayerName, setNewPlayerName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [sortOrder, setSortOrder] = useState("desc");
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleAddPlayer = async () => {
        if (newPlayerName.trim()) {
            addPlayer(newPlayerName);
            setNewPlayerName("");
            setIsAdding(false);
        }
    };

    const handleShowAddField = () => setIsAdding(true);

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") handleAddPlayer();
    };

    const handleDeletePlayer = async (id: string) => await deletePlayer(id);

    const handleAddPlayerToGame = (playerUID: string, team: string) => {
        addRealPlayerToGame(team, playerUID, Math.random() * 0.9 + 0.05, Math.random() * 0.9 + 0.05);
    };


    const handleSortChange = (mode: string) => setSortOrder(mode);

    const filteredPlayers = players?.filter(player => !player.guest) || [];
    const sortedPlayers = [...filteredPlayers].sort((a, b) =>
        sortOrder === "desc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );

    useEffect(() => {
        if (isAdding && inputRef.current) inputRef.current.focus();
    }, [isAdding]);

    return (
        <div className="flex flex-col w-full h-full">
            <SortControls handleSortChange={handleSortChange} />
            <div className="flex-1 overflow-y-auto mb-3">
                {sortedPlayers.map((player) => (
                    <PlayerRow key={player.id} player={player} onDelete={() => handleDeletePlayer(player.id)} handleAddPlayerToGame={handleAddPlayerToGame} />
                ))}
                {sortedPlayers.length === 0 && (
                    <div className="p-3 text-center">No players added yet</div>
                )}
            </div>
            <AddPlayerSection
                isAdding={isAdding}
                newPlayerName={newPlayerName}
                setNewPlayerName={setNewPlayerName}
                handleKeyDown={handleKeyDown}
                handleAddPlayer={handleAddPlayer}
                handleShowAddField={handleShowAddField}
                inputRef={inputRef as React.RefObject<HTMLInputElement>}
            />
        </div>
    );
};

const SortControls = ({ handleSortChange }: { handleSortChange: (mode: string) => void }) => (
    <div className="mb-3 flex items-center">
        <label className="mr-2">Sort:</label>
        <Select onValueChange={handleSortChange}>
            <SelectTrigger className="border border-gray-300 rounded-md px-3 py-1">
                <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="desc">A-Z</SelectItem>
                <SelectItem value="asc">Z-A</SelectItem>
            </SelectContent>
        </Select>
    </div>
);

const PlayerRow = ({ player, onDelete, handleAddPlayerToGame }: { player: Player, onDelete: () => void, handleAddPlayerToGame: (playerUID: string, team: string) => void }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "PLAYER",
        item: { id: player.id, name: player.name, team: player.team } as DnDPlayerItem,
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }));

    const divRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={(node) => {
            drag(node);
            divRef.current = node; // Store the reference if needed elsewhere
        }}
            className={`${isDragging ? 'opacity-50' : ''}`}>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div className="flex items-center justify-between p-2 border-b border-gray-200">
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{player.name}
                        </span>
                        <Button onClick={onDelete} className="bg-transparent text-red-500 p-1">
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleAddPlayerToGame(player.id, "A")}>Add {player.name} to Team A</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAddPlayerToGame(player.id, "B")}>Add {player.name}  to Team B</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div >
    );
};

const AddPlayerSection = ({
    isAdding, newPlayerName, setNewPlayerName, handleKeyDown, handleAddPlayer, handleShowAddField, inputRef
}: {
    isAdding: boolean;
    newPlayerName: string;
    setNewPlayerName: (newName: string) => void;
    handleKeyDown: (event: React.KeyboardEvent) => void;
    handleAddPlayer: () => void;
    handleShowAddField: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
}) => (
    <div className="border-t border-gray-200 p-3">
        {isAdding ? (
            <div className="flex flex-col">
                <input
                    ref={inputRef}
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full p-2 border border-gray-300 rounded-md mb-2"
                    placeholder="Enter player name"
                />
                <Button onClick={handleAddPlayer} className="bg-green-500 text-white p-2 rounded-md">
                    Add
                </Button>
            </div>
        ) : (
            <Button onClick={handleShowAddField} className="w-full flex items-center justify-center bg-blue-500 text-white p-2 rounded-md">
                <UserPlus size={16} className="mr-2" /> Add Player
            </Button>
        )}
    </div>
);

export default PlayerList;
