import { useState } from "react";
import { usePlayers } from "@/data/players-provider";
import { Player, ZoneScores } from "@/data/types";
import { X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import Modal from "@/components/dialogs/modal";

interface PlayerTableProps {
    isOpen: boolean;
    onClose: () => void;
}

const PlayerTable: React.FC<PlayerTableProps> = ({ isOpen, onClose }) => {
    const { players, updatePlayerAttributes, addPlayer, deletePlayer } = usePlayers();
    const [newPlayerName, setNewPlayerName] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortingMode, setSortingMode] = useState<string>("alphabetical");

    const STAT_LABELS: ["Defense", "Attack", "Athleticism"] = ["Defense", "Attack", "Athleticism"];

    const handleAttributeChange = (uid: string, statIndex: number, change: number) => {
        const player = players.find((p: Player) => p.id === uid);
        if (!player) return;

        const newStats: ZoneScores = [...player.stats];
        newStats[statIndex] = Math.max(1, Math.min(10, newStats[statIndex] + change));

        updatePlayerAttributes(uid, { stats: newStats });
    };

    const handleAddPlayer = () => {
        if (newPlayerName.trim() !== "") {
            addPlayer(newPlayerName.trim());
            setNewPlayerName("");
        }
    };

    const getNonTemps = (): Player[] => players?.filter((player: Player) => !player.temp_formation) || [];

    const filteredPlayers = getNonTemps().filter((player: Player) =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        switch (sortingMode) {
            case "Alphabetical":
                return a.name.localeCompare(b.name);
            case "Attack":
                return b.stats[1] - a.stats[1];
            case "Defense":
                return b.stats[0] - a.stats[0];
            case "Athleticism":
                return b.stats[2] - a.stats[2];
            default:
                return 0;
        }
    });

    return (
        <Modal title="Player Attributes" isOpen={isOpen} onClose={onClose}>
            <div className="rounded-xl shadow-xl max-h-[80vh] min-w-[100px] overflow-x-auto overflow-y-auto">
                <div className="flex flex-col space-y-4">
                    {/* Player Input */}
                    <div className="flex-1 items-center space-x-2">
                        <Input
                            type="text"
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            placeholder="Enter player name"
                        />

                    </div>

                    {/* Search and Sorting */}
                    <div className="flex w-full items-center mb-4 space-x-2">
                        <Button onClick={handleAddPlayer} className=" bg-blue-600 text-white hover:bg-blue-700">
                            Add Player
                        </Button>
                    </div>

                    {/* Search and Sorting */}
                    <div className="flex items-center mb-4 space-x-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search players..."
                            className="p-2 rounded w-full"
                        />

                        <Select onValueChange={setSortingMode}>
                            {/* Trigger button for the select */}
                            <SelectTrigger>
                                <SelectValue placeholder="Sort">Sort</SelectValue>
                            </SelectTrigger>

                            {/* Dropdown content with dynamically grouped formations */}
                            <SelectContent>
                                <SelectItem key={"Alphabetical"} value={"Alphabetical"}>
                                    {"Alphabetical"}
                                </SelectItem>
                                <SelectItem key={"Attack"} value={"Attack"}>
                                    {"Attack"}
                                </SelectItem>
                                <SelectItem key={"Defense"} value={"Defense"}>
                                    {"Defense"}
                                </SelectItem>
                                <SelectItem key={"Athleticism"} value={"Athleticism"}>
                                    {"Athleticism"}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <Table className="rounded-lg min-w-[100px] overflow-x-auto">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80%]">Name</TableHead>
                                <TableHead className="w-[20%]">Attributes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPlayers.map((player) => (
                                <TableRow key={player.id} className="text-xs">
                                    {/* Name Column */}
                                    <TableCell className="w-[80%] flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => deletePlayer(player.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X size={14} />
                                            </button>
                                            <span
                                                className="break-words whitespace-normal w-[75%] min-w-[40px] max-w-[200px] truncate text-ellipsis overflow-hidden"
                                                title={player.name}
                                            >
                                                {player.name}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Attributes Column */}
                                    <TableCell className="w-[20%]">
                                        <div className="flex flex-wrap gap-2 justify-between">
                                            {STAT_LABELS.map((label, index) => (
                                                <div key={label} className="flex flex-col items-center w-[60%]">
                                                    <span className="text-xs text-gray-400">{label}</span>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleAttributeChange(player.id, index, -1)}
                                                            size="sm"
                                                            className="p-1"
                                                        >
                                                            <Minus size={10} />
                                                        </Button>
                                                        <span className="text-xs">{player.stats[index]}</span>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleAttributeChange(player.id, index, 1)}
                                                            size="sm"
                                                            className="p-1"
                                                        >
                                                            <Plus size={10} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Modal>
    );
};

export default PlayerTable;
