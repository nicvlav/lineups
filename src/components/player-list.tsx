import { useState, useRef, useEffect } from "react";
import { Point, emptyZoneScores } from "@/data/attribute-types";
import { Player, ScoredGamePlayer } from "@/data/player-types";
import { usePlayers } from "@/data/players-provider";
import { useDrag } from "react-dnd";
import { Trash2, UserPlus, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PlayerList = () => {
    const { players, addPlayer, deletePlayer, addExisitingPlayerToGame } = usePlayers();
    const [newPlayerName, setNewPlayerName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [sortOrder, setSortOrder] = useState("desc");
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleAddPlayer = async () => {
        if (newPlayerName.trim()) {
            addPlayer({ name: newPlayerName });
            setNewPlayerName("");
            setIsAdding(false);
        }
    };

    const handleShowAddField = () => setIsAdding(true);

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") handleAddPlayer();
    };

    const handleDeletePlayer = async (id: string) => await deletePlayer(id);

    const handleAddPlayerToGame = (player: ScoredGamePlayer, team: string) => {
        addExisitingPlayerToGame(player, team, Math.random() * 0.9 + 0.05, Math.random() * 0.9 + 0.05);
    };


    const handleSortChange = (mode: string) => setSortOrder(mode);

    const sortedPlayers = Object.values(players).sort((a, b) =>
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

const PlayerRow = ({ player, onDelete, handleAddPlayerToGame }: { player: Player, onDelete: () => void, handleAddPlayerToGame: (player: ScoredGamePlayer, team: string) => void }) => {
    const gamePlayer: ScoredGamePlayer = { id: player.id, team: "", guest_name: null, position: { x: 0.5, y: 0.5 } as Point, zoneFit: structuredClone(emptyZoneScores) };

    const [{ isDragging }, drag] = useDrag(() => ({
        type: "PLAYER",
        item: gamePlayer,
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }));


    return (
        <div className={`${isDragging ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <EllipsisVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Player Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAddPlayerToGame(gamePlayer, "A")}>Add {player.name} to Team A</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddPlayerToGame(gamePlayer, "B")}>Add {player.name}  to Team B</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div ref={(node) => {
                    if (navigator.maxTouchPoints === 0) {
                        drag(node); // Enable dragging only if no touch capability
                    }
                }} className="ml-2 cursor-pointer flex-1 overflow-hidden text-ellipsis whitespace-nowrap">

                    {player.name}

                </div>

                <Button onClick={onDelete} className="bg-transparent text-red-500 p-1">
                    <Trash2 size={16} />
                </Button>
            </div>
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
