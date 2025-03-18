import React, { useState } from "react";
import { Player, ZoneScores, PlayerUpdate } from "@/data/types";
import { X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";

interface CompactPlayerTableProps {
    players: Player[];
    addPlayer: (name: string) => void;
    deletePlayer: (id: string) => void;
    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;
}

const CompactPlayerTable: React.FC<CompactPlayerTableProps> = ({ players, addPlayer, deletePlayer, updatePlayerAttributes }) => {
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
        <div className="p-4 h-[80vh] min-w-[300px] text-sm">
            <div className="flex-col space-y-4">
                <div className="bg-background z-10 sticky top-0">
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
                        <Button onClick={handleAddPlayer} className=" bg-blue-600 text-white hover:bg-blue-700  w-full">
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
                </div>
                <div className="flex">
                    {/* Table */}
                    <Table className="rounded-lg">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80%]">Name</TableHead>
                                <TableHead className="w-[20%]">Attributes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="rounded-lg overflow-x-auto overflow-y-auto">
                            {sortedPlayers.map((player) => (
                                <TableRow key={player.id}>
                                    {/* Name Column */}
                                    <TableCell className="w-[80%] flex-1">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => deletePlayer(player.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X size={14} />
                                            </button>
                                            <span
                                                className="break-words whitespace-normal w-[75%] min-w-[40px] max-w-[220px] truncate text-ellipsis overflow-hidden"
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
                                                    <span className="">{label}</span>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleAttributeChange(player.id, index, -1)}
                                                            size="sm"
                                                            className="p-1"
                                                        >
                                                            <Minus size={10} />
                                                        </Button>
                                                        <span>{player.stats[index]}</span>
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
        </div>
    );
};

export default CompactPlayerTable;
