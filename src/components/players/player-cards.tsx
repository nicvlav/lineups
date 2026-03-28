import { motion } from "framer-motion";
import { useState } from "react";
import PlayerCard from "@/components/players/player-card";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlayers } from "@/hooks/use-players";
import { calculateArchetypeScores } from "@/lib/positions/calculator";
import { cn } from "@/lib/utils";
import { getTopPositions, getZoneAverages } from "@/types/players";

export type CardViewMode = "minimal" | "archetypes" | "face-stats";

const PlayerCards = () => {
    const { data: players = {} } = usePlayers();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [cardViewMode, setCardViewMode] = useState<CardViewMode>("archetypes");

    const filteredPlayers = Object.values(players)
        .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((player) => {
            const archetypeScores = calculateArchetypeScores(player.stats);
            const topScores = getTopPositions(archetypeScores, 3);

            return {
                player,
                overall: Math.max(...topScores.map((t) => t.score)),
                archetypeScores,
                averages: getZoneAverages(player),
            };
        });

    // Sort by overall descending (no sorting controls)
    const sortedPlayers = [...filteredPlayers].sort((a, b) => b.overall - a.overall);

    return (
        <div className={cn("flex flex-col h-full w-full p-4 space-y-3")}>
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
                            {sortedPlayers.map((item, index) => (
                                <motion.div
                                    key={item.player.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.2,
                                        delay: Math.min(index * 0.03, 0.3),
                                    }}
                                >
                                    <PlayerCard
                                        player={item.player}
                                        playerName={item.player.name}
                                        stats={item.player.stats}
                                        overall={item.overall}
                                        archetypeScores={item.archetypeScores}
                                        averages={item.averages}
                                        viewMode={cardViewMode}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
export default PlayerCards;
