import React, { useState } from "react";
import { statShortLabelMap, statLabelMap, CategorizedStats, StatsKey, StatCategoryNameMap } from "@/data/stat-types";
import { Player, PlayerUpdate } from "@/data/player-types";
import { X, Plus, Minus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import Panel from "@/components/dialogs/panel";
import { ActionBarTwoColumn, ActionBarThreeColumn, ActionBarGroup } from "@/components/ui/action-bar";
interface CompactPlayerTableProps {
    players: Record<string, Player>;
    addPlayer: (player: Partial<Player>) => void;
    deletePlayer: (id: string) => void;
    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;
}

const CompactPlayerTable: React.FC<CompactPlayerTableProps> = ({ players, addPlayer, deletePlayer, updatePlayerAttributes }) => {
    const alphabeticalSortValue: string = "Alphabetical";
    const [newPlayerName, setNewPlayerName] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filterMode, setFilterMode] = useState<string>(StatCategoryNameMap["attacking"]);
    const [sortingMode, setSortingMode] = useState<string>(alphabeticalSortValue);

    const handleAttributeChange = (uid: string, statIndex: StatsKey, change: number) => {
        if (!(uid in players)) return;

        const newStats = players[uid].stats;
        newStats[statIndex] = Math.max(1, Math.min(100, newStats[statIndex] + change));
        updatePlayerAttributes(uid, { stats: newStats });
    };

    const handleAddPlayer = () => {
        if (newPlayerName.trim() !== "") {
            addPlayer({ name: newPlayerName.trim() });
            setNewPlayerName("");
        }
    };

    const getCurrentIndexes = () => {
        switch (filterMode) {
            case StatCategoryNameMap["pace"]:
                return CategorizedStats.pace;
            case StatCategoryNameMap["attacking"]:
                return CategorizedStats.attacking;
            case StatCategoryNameMap["passing"]:
                return CategorizedStats.passing;
            case StatCategoryNameMap["dribbling"]:
                return CategorizedStats.dribbling;
            case StatCategoryNameMap["defending"]:
                return CategorizedStats.defending;
            case StatCategoryNameMap["physical"]:
                return CategorizedStats.physical; 
                case StatCategoryNameMap["morale"]:
                return CategorizedStats.morale;
            default:
                return CategorizedStats.attacking;
        }
    };

    const currIndexes = getCurrentIndexes();

    const filteredPlayers = Object.values(players).filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getSorted = () => {
        if (sortingMode !== alphabeticalSortValue) {
            for (const key of currIndexes) {
                if (statLabelMap[key] === sortingMode) {
                    return [...filteredPlayers].sort((a, b) => {
                        return b.stats[key] - a.stats[key];
                    });
                }
            }
        }

        return [...filteredPlayers].sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    };

    const sortedPlayers = getSorted();

    return (
        <div className="h-full flex-1 min-h-0 flex flex-col p-4">
            <div className="flex flex-col flex-1 min-h-0">
                <div className="bg-background z-10">
                    {/* Add Player Bar */}
                    <ActionBarTwoColumn
                        variant="compact"
                        left={
                            <Input
                                type="text"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                placeholder="Enter player name"
                                className="w-full max-w-sm"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                            />
                        }
                        right={
                            <ActionBarGroup variant="outlined">
                                <Button 
                                    onClick={handleAddPlayer} 
                                    size="sm"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                    disabled={!newPlayerName.trim()}
                                >
                                    <UserPlus size={16} />
                                    <span className="ml-2">Add Player</span>
                                </Button>
                            </ActionBarGroup>
                        }
                    />

                    {/* Search, Filter and Sort Bar */}
                    <ActionBarThreeColumn
                        variant="compact"
                        left={
                            <Input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search players..."
                                className="w-full max-w-xs"
                            />
                        }
                        center={
                            <Select onValueChange={setFilterMode} value={filterMode}>
                                <SelectTrigger className="w-32">
                                    <SelectValue>{filterMode}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(StatCategoryNameMap).map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        }
                        right={
                            <Select onValueChange={setSortingMode} value={sortingMode}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Sort">{sortingMode}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem key={alphabeticalSortValue} value={alphabeticalSortValue}>
                                        {alphabeticalSortValue}
                                    </SelectItem>
                                    {currIndexes.map((index) => (
                                        <SelectItem key={statLabelMap[index]} value={statLabelMap[index]}>
                                            {statLabelMap[index]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        }
                    />
                </div>

                <Panel>
                    <div className="flex-1 min-h-0">
                        <div className="grid grid-cols-2 gap-y-1 text-muted-foreground text-sm mb-4">
                            {currIndexes.map((index) => (
                                <div key={index} className="flex gap-2">
                                    <span className="text-xs font-medium w-10">{statShortLabelMap[index]}</span>
                                    <span>{statLabelMap[index]}</span>
                                </div>
                            ))}
                        </div>
                        <Table className="rounded-lg w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[calc(100%-300px)]">Name</TableHead>
                                    <TableHead className="w-[300px]">{filterMode} Attributes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPlayers.map((player) => (
                                    <TableRow key={player.id}>
                                        {/* Name Column */}
                                        <TableCell className="w-[calc(100%-300px)] min-w-[200px]">
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
                                        <TableCell className="w-[300px]">
                                            <div className="flex flex-wrap gap-2 justify-evenly">
                                                {currIndexes.map((index) => (
                                                    <div key={statShortLabelMap[index]} className="flex flex-col items-center ">
                                                        <span className="">{statShortLabelMap[index]}</span>
                                                        <div className="flex items-center gap-2 rounded-md bg-accent w-full">
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
