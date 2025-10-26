import { useState } from "react";
import { usePlayers } from "@/context/players-provider";
import { StatCategoryKeys, StatCategoryNameMap, } from "@/data/stat-types";
import { getZoneAverages, getTopPositions, calculateScoresForStats } from "@/data/player-types";
import { normalizedDefaultWeights } from "@/data/position-types";
import PlayerCard from "@/components/players/player-card";
import PlayerStatsRankings from "@/components/players/player-stats-rankings";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Panel from "@/components/shared/panel";
import { ActionBarTwoColumn } from "@/components/ui/action-bar";
import { SquareUser, TrendingUp } from "lucide-react";

const PlayerCards = () => {
    const { players, } = usePlayers();
    const alphabeticalSortValue: string = "Alphabetical";
    const overallSortValue: string = "Overall";
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortingMode, setSortingMode] = useState<string>(overallSortValue);
    const [activeTab, setActiveTab] = useState<"cards" | "leaderboard">("cards");

    const filteredPlayers = Object.values(players).filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).map((player) => {
        const scores = calculateScoresForStats(player.stats, normalizedDefaultWeights);
        const topScores = getTopPositions(scores);

        return {
            player, overall: Math.max(...topScores.map((t) => t.score)),
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
        <div className="flex flex-col h-full w-full overflow-hidden p-4 space-y-6">
            {/* Section Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Player Database</h1>
                <p className="text-muted-foreground">
                    Browse and analyze player statistics, ratings, and positional fits
                </p>
            </div>

            {/* Tab Navigation - Fixed height to match Generator */}
            <div className="flex items-center justify-between h-10">
                <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("cards")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "cards"
                                ? "bg-background text-foreground shadow-sm border border-border/40"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                    >
                        <SquareUser className="w-4 h-4" />
                        Player Cards
                    </button>
                    <button
                        onClick={() => setActiveTab("leaderboard")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "leaderboard"
                                ? "bg-background text-foreground shadow-sm border border-border/40"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Leaderboard
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "cards" ? (
                    <Panel>
                        {/* Search and Sorting Controls - Now inside Panel to scroll away */}
                        <div className="pb-4">
                            <ActionBarTwoColumn
                                variant="default"
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
                                        <SelectTrigger className="w-40 h-9">
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
                        </div>
                        
                        {/* Player Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {withScores.map((item) => (
                                <PlayerCard key={item.player.id} player={item.player} playerName={item.player.name}
                                    stats={item.player.stats} overall={item.overall}
                                    zoneFit={item.zoneFit} top3Positions={item.topPositions}
                                    averages={item.averages} />
                            ))}
                        </div>
                    </Panel>
                ) : (
                    <PlayerStatsRankings />
                )}
            </div>
        </div>
    );


}
export default PlayerCards;
