import { useState } from "react";
import PlayerCard from "@/components/players/player-card";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlayers } from "@/context/players-provider";
import { calculateArchetypeScores } from "@/lib/positions/calculator";
import { cn } from "@/lib/utils";
import { getTopPositions, getZoneAverages } from "@/types/players";

export type CardViewMode = "minimal" | "archetypes" | "face-stats";

const PlayerCards = () => {
    const { players } = usePlayers();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [cardViewMode, setCardViewMode] = useState<CardViewMode>("archetypes");

    const filteredPlayers = Object.values(players)
        .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((player) => {
            const archetypeScores = calculateArchetypeScores(player.stats);
            const topScores = getTopPositions(archetypeScores, 3);

            // Convert to ZoneScores for backward compatibility
            const zoneFit = Object.entries(archetypeScores).reduce(
                (acc, [pos, data]) => {
                    acc[pos as keyof typeof acc] = data.bestScore;
                    return acc;
                },
                { GK: 0, CB: 0, FB: 0, DM: 0, CM: 0, WM: 0, AM: 0, ST: 0, WR: 0 }
            );

            return {
                player,
                overall: Math.max(...topScores.map((t) => t.score)),
                zoneFit,
                topPositions: topScores
                    .slice(0, 3)
                    .map((t) => t.position)
                    .join(", "),
                topScoresWithArchetypes: topScores, // Pass full archetype data
                archetypeScores, // Pass full archetype breakdown
                averages: getZoneAverages(player),
            };
        });

    // Sort by overall descending (no sorting controls)
    const sortedPlayers = [...filteredPlayers].sort((a, b) => b.overall - a.overall);

    return (
        <div className={cn("flex flex-col h-full w-full p-4 space-y-4")}>
            {/* Section Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Player Cards</h1>
                <p className="text-muted-foreground">View player strengths and profiles based on voted ratings</p>
            </div>

            {/* Search + Card View Selector */}
            <ActionBarSingle className="h-15">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search players..."
                            className="w-full"
                        />
                    </div>

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
                </div>
            </ActionBarSingle>

            {/* Player Cards Grid */}
            <Card className="flex-1 flex flex-col min-h-0 bg-linear-to-r from-card to-muted/20 overflow-hidden">
                <CardContent className="flex-1 h-full p-0">
                    <div className="h-full overflow-y-auto pl-4 pr-4 custom-scrollbar">
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
export default PlayerCards;
