import { useState } from "react";
import { usePlayers } from "@/context/players-provider";
import { getZoneAverages, getTopPositions } from "@/types/players";
import { calculateArchetypeScores } from "@/lib/positions/calculator";
import PlayerCard from "@/components/players/player-card";
import PlayerStatsRankings from "@/components/players/player-stats-rankings";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Panel from "@/components/shared/panel";
import { ActionBarTwoColumn } from "@/components/ui/action-bar";
import { SquareUser, TrendingUp } from "lucide-react";

export type CardViewMode = "minimal" | "archetypes" | "face-stats";

const PlayerCards = () => {
    const { players, } = usePlayers();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"cards" | "leaderboard">("cards");
    const [cardViewMode, setCardViewMode] = useState<CardViewMode>("archetypes");

    const filteredPlayers = Object.values(players).filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).map((player) => {
        const archetypeScores = calculateArchetypeScores(player.stats);
        const topScores = getTopPositions(archetypeScores, 3);

        // Convert to ZoneScores for backward compatibility
        const zoneFit = Object.entries(archetypeScores).reduce((acc, [pos, data]) => {
            acc[pos as keyof typeof acc] = data.bestScore;
            return acc;
        }, { GK: 0, CB: 0, FB: 0, DM: 0, CM: 0, WM: 0, AM: 0, ST: 0, WR: 0 });

        return {
            player,
            overall: Math.max(...topScores.map((t) => t.score)),
            zoneFit,
            topPositions: topScores.slice(0, 3).map((t) => t.position).join(", "),
            topScoresWithArchetypes: topScores, // Pass full archetype data
            archetypeScores, // Pass full archetype breakdown
            averages: getZoneAverages(player)
        }
    });

    // Sort by overall descending (no sorting controls)
    const sortedPlayers = [...filteredPlayers].sort((a, b) => b.overall - a.overall);

    return (
        <div className="flex flex-col h-full w-full overflow-hidden p-4 space-y-6">
            {/* Section Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Player Database</h1>
                <p className="text-muted-foreground">
                    Browse and analyze player statistics, ratings, and positional fits
                </p>
            </div>

            {/* Tab Navigation */}
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
                        {/* Search + Card View Selector */}
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
                                    <Select value={cardViewMode} onValueChange={(value) => setCardViewMode(value as CardViewMode)}>
                                        <SelectTrigger className="w-40 h-9">
                                            <SelectValue placeholder="Card View" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="minimal">Minimal</SelectItem>
                                            <SelectItem value="archetypes">Archetypes</SelectItem>
                                            <SelectItem value="face-stats">Face Stats</SelectItem>
                                        </SelectContent>
                                    </Select>
                                }
                            />
                        </div>

                        {/* Player Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 items-start">
                            {sortedPlayers.map((item) => (
                                <PlayerCard
                                    key={item.player.id}
                                    player={item.player}
                                    playerName={item.player.name}
                                    stats={item.player.stats}
                                    overall={item.overall}
                                    zoneFit={item.zoneFit}
                                    top3Positions={item.topPositions}
                                    topScoresWithArchetypes={item.topScoresWithArchetypes}
                                    archetypeScores={item.archetypeScores}
                                    averages={item.averages}
                                    viewMode={cardViewMode}
                                />
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
