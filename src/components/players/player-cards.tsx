import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import PlayerCard from "@/components/players/player-card";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlayers } from "@/hooks/use-players";
import { calculateArchetypeScores, getTopArchetypes } from "@/lib/positions/calculator";
import { cn } from "@/lib/utils";
import { getTopPositions, getZoneAverages } from "@/types/players";
import type { Position, Zone } from "@/types/positions";
import { ZONE_POSITIONS } from "@/types/positions";

export type CardViewMode = "minimal" | "archetypes" | "face-stats";

type ZoneFilter = "all" | Zone;

const ZONE_FILTERS: { value: ZoneFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "attack", label: "Attackers" },
    { value: "midfield", label: "Midfielders" },
    { value: "defense", label: "Defenders" },
];

const PlayerCards = () => {
    const { data: players = {} } = usePlayers();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [cardViewMode, setCardViewMode] = useState<CardViewMode>("archetypes");
    const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");

    const allPlayers = useMemo(
        () =>
            Object.values(players).map((player) => {
                const archetypeScores = calculateArchetypeScores(player.stats);
                const topScores = getTopPositions(archetypeScores, 3);
                const topArchetypes = getTopArchetypes(archetypeScores, 5, 3);

                return {
                    player,
                    overall: Math.max(...topScores.map((t) => t.score)),
                    archetypeScores,
                    averages: getZoneAverages(player),
                    topArchetypes,
                };
            }),
        [players]
    );

    const filteredPlayers = useMemo(() => {
        let result = allPlayers;

        // Text search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter((p) => p.player.name.toLowerCase().includes(lower));
        }

        // Zone filter — show player if their best score for any position in this zone
        // is within the threshold (3 points) of their overall best
        if (zoneFilter !== "all") {
            const zonePositions = ZONE_POSITIONS[zoneFilter];
            result = result.filter((p) => {
                const threshold = p.overall - 3;
                return zonePositions.some((pos: Position) => (p.archetypeScores[pos]?.bestScore ?? 0) >= threshold);
            });
        }

        return [...result].sort((a, b) => b.overall - a.overall);
    }, [allPlayers, searchQuery, zoneFilter]);

    return (
        <div className={cn("flex flex-col h-full w-full px-4 pt-2 pb-4 space-y-2")}>
            {/* Search + zone filters */}
            <div className="space-y-2">
                <ActionBarSingle>
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search players..."
                        className="w-full"
                    />
                </ActionBarSingle>

                <div className="flex gap-1.5">
                    {ZONE_FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => setZoneFilter(filter.value)}
                            className={cn(
                                "text-xs font-medium px-3 py-1 rounded-lg transition-all duration-200",
                                zoneFilter === filter.value
                                    ? "bg-foreground/10 text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Player Cards Grid */}
            <Card className="flex-1 flex flex-col min-h-0 bg-card overflow-hidden">
                <CardContent className="flex-1 h-full p-0">
                    <div className="h-full overflow-y-auto px-4 custom-scrollbar">
                        {filteredPlayers.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                {filteredPlayers.map((item, index) => (
                                    <motion.div
                                        key={item.player.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.2,
                                            delay: Math.min(index * 0.03, 0.3),
                                        }}
                                        className="h-full"
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
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery ? `No players matching "${searchQuery}"` : "No players in this role"}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* View mode selector — bottom */}
            <div className="flex items-center justify-center gap-1 bg-muted/30 rounded-xl p-1">
                {(["minimal", "archetypes", "face-stats"] as const).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => setCardViewMode(mode)}
                        className={cn(
                            "flex-1 text-xs font-medium py-1.5 rounded-lg transition-all duration-200",
                            cardViewMode === mode
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {mode === "face-stats" ? "Stats" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};
export default PlayerCards;
