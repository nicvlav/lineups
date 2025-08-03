import { useState } from "react";
import { usePlayers } from "@/context/players-provider";
import { StatCategoryKeys, StatCategoryNameMap, } from "@/data/stat-types";
import { getZoneAverages, getTopPositions, calculateScoresForStats } from "@/data/player-types";
import { normalizedDefaultWeights } from "@/data/position-types";
import PlayerCard from "@/components/dialogs/player-card";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Panel from "@/components/dialogs/panel";
import { ActionBarTwoColumn } from "@/components/ui/action-bar";

const PlayerCards = () => {
    const { players, } = usePlayers();
    const alphabeticalSortValue: string = "Alphabetical";
    const overallSortValue: string = "Overall";
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortingMode, setSortingMode] = useState<string>(overallSortValue);

    const filteredPlayers = Object.values(players).filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).map((player) => {
        const scores = calculateScoresForStats(player.stats, normalizedDefaultWeights);
        const topScores = getTopPositions(scores);

        return {
            player, overall:Math.max(...topScores.map((t) => t.score)),
            zoneFit: scores, topPositions: topScores.slice(0, 3).map((t) => t.position).join(", "),
            averages: getZoneAverages(player)
        }
    })

    const getSorted = () => {
        if (sortingMode !== alphabeticalSortValue && sortingMode !== overallSortValue) {
            for (const key of StatCategoryKeys) {
                if (StatCategoryNameMap[key] === sortingMode) {
                    return [...filteredPlayers].sort((a, b) => {
                        return b.averages[key] - a.averages[key];
                    });
                }
            }
        }
        if (sortingMode === alphabeticalSortValue) {
            return [...filteredPlayers].sort((a, b) => {
                return a.player.name.localeCompare(b.player.name);
            });
        }

        return [...filteredPlayers].sort((a, b) => {
            return b.overall - a.overall;
        });
    };

    const withScores = getSorted();

    return (
        <div className="flex flex-col h-full w-full overflow-hidden p-4">
            {/* Search and Sorting */}
            <ActionBarTwoColumn
                left={
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search players..."
                        className="w-full max-w-sm"
                    />
                }
                right={
                    <Select onValueChange={setSortingMode}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Sort by">{sortingMode}</SelectValue>
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem key={overallSortValue} value={overallSortValue}>
                                {overallSortValue}
                            </SelectItem>
                            <SelectItem key={alphabeticalSortValue} value={alphabeticalSortValue}>
                                {alphabeticalSortValue}
                            </SelectItem>

                            {Object.entries(StatCategoryNameMap)
                                .filter(([category]) => category !== "morale")
                                .map(([key, name]) => (
                                    <SelectItem key={key} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                }
            />

            {/* Panel fills the remaining space */}
            <div className="flex-1 overflow-y-auto">
                <Panel >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {withScores.map((item) => (
                            <PlayerCard key={item.player.id} player={item.player} playerName={item.player.name}
                                stats={item.player.stats} overall={item.overall}
                                zoneFit={item.zoneFit} top3Positions={item.topPositions}
                                averages={item.averages} />
                        ))}
                    </div>
                </Panel>
            </div>
        </div>
    );


}
export default PlayerCards;
