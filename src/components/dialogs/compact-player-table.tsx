import React, { useState } from "react";
import { attributeScores, defaultAttributeScores, attributeShortLabels, attributeLabels } from "@/data/attribute-types";
import { Player, PlayerUpdate } from "@/data/player-types";
import { X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import Panel from "@/components/dialogs/panel"

interface CompactPlayerTableProps {
    players: Record<string, Player>;
    addPlayer: (player: Partial<Player>) => void;
    deletePlayer: (id: string) => void;
    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;
}

const CompactPlayerTable: React.FC<CompactPlayerTableProps> = ({ players, addPlayer, deletePlayer, updatePlayerAttributes }) => {
    const [newPlayerName, setNewPlayerName] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortingMode, setSortingMode] = useState<number>(0);

    const handleAttributeChange = (uid: string, statIndex: number, change: number) => {
        if (uid in players) return;

        const newStats: attributeScores = [...players[uid].stats];
        newStats[statIndex] = Math.max(1, Math.min(100, newStats[statIndex] + change));

        updatePlayerAttributes(uid, { stats: newStats });
    };

    const handleAddPlayer = () => {
        if (newPlayerName.trim() !== "") {
            addPlayer({ name: newPlayerName.trim() });
            setNewPlayerName("");
        }
    };


    const filteredPlayers = Object.values(players).filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        if (sortingMode < 0 || sortingMode >= defaultAttributeScores.length) {
            return a.name.localeCompare(b.name);
        }

        return b.stats[sortingMode] - a.stats[sortingMode];

    });

    return (
        <div className=" h-full flex-1 min-h-0 flex flex-col border p-4">
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
                <div className="bg-background z-10 ">
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

                        <Select onValueChange={(value: string) => setSortingMode(Number(value))}>
                            {/* Trigger button for the select */}
                            <SelectTrigger>
                                <SelectValue placeholder="Sort">Sort</SelectValue>
                            </SelectTrigger>

                            {/* Dropdown content with dynamically grouped formations */}
                            <SelectContent>
                                <SelectItem key={"Alphabetical"} value={attributeLabels.length.toString()}>
                                    {"Alphabetical"}
                                </SelectItem>
                                {attributeLabels.map((idx, label) => (
                                    <SelectItem key={label} value={idx.toString()}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Panel>
                    <div className="flex-1 min-h-0">
                        <Table className="rounded-lg w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50%]">Name</TableHead>
                                    <TableHead className="w-[50%]">Attributes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPlayers.map((player) => (
                                    <TableRow key={player.id}>
                                        {/* Name Column */}
                                        <TableCell className="w-[50%] flex-1 min-w-[200px]">
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

                                        {/* Attributes Column Second Hal*/}
                                        <TableCell className="w-[50%]">
                                            <div className="flex flex-wrap gap-1 justify-evenly">
                                                {attributeShortLabels.map((label, index) => (
                                                    <div key={label} className="flex flex-col items-center ">
                                                        <span className="">{label}</span>
                                                        <div className="flex items-center gap-1 rounded-md bg-accent w-full">
                                                            <span>{player.stats[index]}</span>
                                                            <div className="flexrounded-lg">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => handleAttributeChange(player.id, index, 5)}
                                                                    size="sm"
                                                                    className="w-6 h-4 p-0 flex justify-center items-center rounded-t-md"
                                                                >
                                                                    <Plus size={8} />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => handleAttributeChange(player.id, index, -5)}
                                                                    size="sm"
                                                                    className="w-6 h-4 p-0 flex justify-center items-center rounded-b-md"
                                                                >
                                                                    <Minus size={8} />
                                                                </Button>
                                                            </div>
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
                </Panel>
            </div>


        </div >
    );
};

export default CompactPlayerTable;
