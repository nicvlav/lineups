import { useState } from "react";
import { usePlayers } from "@/context/players-provider";
import { CategorizedStats } from "@/data/stat-types";
import { getZoneAverages, calculateScoresForStats, getTopPositions } from "@/data/player-types";
import { normalizedDefaultWeights, PositionLabels, Position, positionKeys } from "@/data/position-types";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import Panel from "@/components/dialogs/panel";
import { ActionBarTwoColumn } from "@/components/ui/action-bar";
import SharedPlayerStatsModal, { getPlayerAccent } from "@/components/dialogs/shared-player-stats-modal";
import { Trophy, Medal, Award, Star, TrendingUp } from "lucide-react";

interface PlayerRanking {
    player: any;
    score: number;
    overall: number;
    topPositions: string;
    averages: any;
    topCategories?: Array<{
        category: string;
        label: string;
        value: number;
    }>;
    zoneFit: any;
}

const PlayerStatsRankings = () => {
    const { players } = usePlayers();
    const [selectedPosition, setSelectedPosition] = useState<Position | "overall" | "total_average">("overall");
    const [topCount, setTopCount] = useState<number>(10);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

    // Get player's top 3 categories (excluding morale)
    const getTopCategories = (averages: any) => {
        const categoryLabels: Record<string, string> = {
            pace: "PAC",
            attacking: "ATT",
            passing: "PAS",
            dribbling: "DRI",
            defending: "DEF",
            physical: "PHY"
        };

        return Object.entries(averages)
            .filter(([category]) => category !== "morale")
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([category, value]) => ({
                category,
                label: categoryLabels[category],
                value: Math.round((value as number) * 10) / 10
            }));
    };

    // Calculate all players' stats and position scores
    const playersWithStats = Object.values(players).map((player) => {
        const scores = calculateScoresForStats(player.stats, normalizedDefaultWeights);
        const topScores = getTopPositions(scores);
        const averages = getZoneAverages(player);

        // Calculate overall average excluding morale (total stats average)
        const nonMoraleValues = Object.entries(player.stats)
            .filter(([key]) => !CategorizedStats.morale.includes(key as any))
            .map(([_, value]) => value);
        const totalStatsAverage = nonMoraleValues.reduce((sum, v) => sum + v, 0) / (nonMoraleValues.length || 1);

        // Get top 3 categories for this player
        const topCategories = getTopCategories(averages);

        return {
            player,
            scores,
            topScores,
            overall: Math.round(Math.max(...topScores.map((t) => t.score)) * 10) / 10, // Standard overall (highest position score) rounded to 1 decimal
            totalStatsAverage: Math.round(totalStatsAverage * 10) / 10,
            averages,
            topPositions: topScores.slice(0, 3).map((t) => t.position).join(", "),
            topCategories
        };
    });

    // Get rankings based on selected criteria
    const getRankings = (): PlayerRanking[] => {
        if (selectedPosition === "overall") {
            // Standard overall - highest position score (like cards)
            return playersWithStats
                .map(p => ({
                    player: p.player,
                    score: p.overall,
                    overall: p.overall,
                    topPositions: p.topPositions,
                    averages: p.averages,
                    topCategories: p.topCategories,
                    zoneFit: p.scores
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topCount);
        } else if (selectedPosition === "total_average") {
            // Total stats average (excluding morale)
            return playersWithStats
                .map(p => ({
                    player: p.player,
                    score: p.totalStatsAverage,
                    overall: p.overall,
                    topPositions: p.topPositions,
                    averages: p.averages,
                    topCategories: p.topCategories,
                    zoneFit: p.scores
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topCount);
        } else {
            // Specific position
            return playersWithStats
                .map(p => ({
                    player: p.player,
                    score: Math.round(p.scores[selectedPosition]),
                    overall: p.overall,
                    topPositions: p.topPositions,
                    averages: p.averages,
                    topCategories: p.topCategories,
                    zoneFit: p.scores
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topCount);
        }
    };

    const rankings = getRankings();

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-4 h-4 text-slate-400" />;
        if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
        if (rank <= 5) return <Star className="w-4 h-4 text-blue-500" />;
        return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
    };

    const getRankAccent = (rank: number, score: number) => {
        // Special rank-based styling for top 3
        if (rank === 1) return {
            border: 'border-l-4 border-l-yellow-400/80 border-r border-t border-b border-border/40',
            bg: 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10'
        };
        if (rank === 2) return {
            border: 'border-l-4 border-l-slate-400/80 border-r border-t border-b border-border/40',
            bg: 'bg-gradient-to-r from-slate-500/10 to-gray-500/10'
        };
        if (rank === 3) return {
            border: 'border-l-4 border-l-amber-600/80 border-r border-t border-b border-border/40',
            bg: 'bg-gradient-to-r from-amber-600/10 to-orange-500/10'
        };

        // Use shared coloring system for others
        const accent = getPlayerAccent(score);
        return {
            border: accent.border,
            bg: 'bg-card/50'
        };
    };

    // Modern minimal color system for leaderboard (with more granularity for competitive context)
    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-400 font-bold"; // Excellent (90+)
        if (score >= 80) return "text-emerald-500 font-semibold"; // Very Good (80-90)
        if (score >= 70) return "text-blue-500 font-semibold"; // Good (70-80)
        if (score >= 60) return "text-amber-500"; // Above Average (60-70)
        if (score >= 50) return "text-orange-500"; // Average (50-60)
        return "text-red-500"; // Below Average (<50)
    };

    return (
        <div className="flex flex-col h-full">
            {/* Controls */}
            <ActionBarTwoColumn
                left={
                    <Select value={selectedPosition} onValueChange={(value: string) => setSelectedPosition(value as Position | "overall" | "total_average")}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select ranking type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="overall">Overall (Best Position)</SelectItem>
                            <SelectItem value="total_average">Total Stats Average</SelectItem>
                            {positionKeys.filter(pos => pos !== "GK").map(position => (
                                <SelectItem key={position} value={position}>
                                    {PositionLabels[position]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
                right={
                    <Select value={topCount.toString()} onValueChange={(value) => setTopCount(Number(value))}>
                        <SelectTrigger className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">Top 10</SelectItem>
                            <SelectItem value="15">Top 15</SelectItem>
                            <SelectItem value="20">Top 20</SelectItem>
                            <SelectItem value="25">Top 25</SelectItem>
                            <SelectItem value="50">Top 50</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />

            {/* Rankings Display */}
            <Panel>
                <div className="space-y-2">
                    {rankings.map((ranking, index) => {
                        const rank = index + 1;
                        const accent = getRankAccent(rank, ranking.score);

                        return (
                            <div
                                key={ranking.player.id}
                                className={`${accent.border} ${accent.bg} rounded-lg p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
                                onDoubleClick={() => setSelectedPlayer(ranking.player)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Rank and Icon */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            {getRankIcon(rank)}
                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                #{rank}
                                            </span>
                                        </div>

                                        {/* Player Info */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Avatar */}
                                            <div className="relative w-10 h-10 flex-shrink-0">
                                                {ranking.player.avatar_url ? (
                                                    <img
                                                        src={ranking.player.avatar_url}
                                                        alt={ranking.player.name}
                                                        className="w-full h-full object-cover rounded-full shadow-lg border-2 border-background"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-primary">
                                                            {ranking.player.name.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name and Position */}
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-semibold text-foreground truncate">
                                                    {ranking.player.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {ranking.topPositions}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score and Stats */}
                                    <div className="flex items-center gap-4">
                                        {/* Top 3 Categories */}
                                        <div className="hidden sm:flex gap-2">
                                            {ranking.topCategories?.slice(0, 3).map(cat => (
                                                <div key={cat.category} className="text-center" title={cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}>
                                                    <div className="text-[10px] text-muted-foreground font-medium">
                                                        {cat.label}
                                                    </div>
                                                    <div className="text-xs font-semibold">
                                                        {cat.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Main Score */}
                                        <div className="text-right">
                                            <div className={`text-2xl font-bold ${getScoreColor(ranking.score)}`}>
                                                {ranking.score}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-medium">
                                                {selectedPosition === "overall" ? "OVR" :
                                                    selectedPosition === "total_average" ? "AVG" :
                                                        PositionLabels[selectedPosition as Position]?.split(" ").map(w => w[0]).join("")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Panel>

            {/* Shared Player Stats Modal */}
            {selectedPlayer && (
                <SharedPlayerStatsModal
                    player={selectedPlayer}
                    isOpen={!!selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                    overall={playersWithStats.find(p => p.player.id === selectedPlayer.id)?.overall ?? 0}
                    zoneFit={playersWithStats.find(p => p.player.id === selectedPlayer.id)?.scores ?? {
                        GK: 0, CB: 0, FB: 0, CM: 0, DM: 0, WM: 0, AM: 0, ST: 0, WR: 0
                    }}
                    top3Positions={playersWithStats.find(p => p.player.id === selectedPlayer.id)?.topPositions ?? ""}
                    averages={playersWithStats.find(p => p.player.id === selectedPlayer.id)?.averages ?? {
                        pace: 0, attacking: 0, passing: 0, dribbling: 0, defending: 0, physical: 0, morale: 0
                    }}
                    stats={selectedPlayer.stats}
                />
            )}
        </div>
    );
};

export default PlayerStatsRankings;