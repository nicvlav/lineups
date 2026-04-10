import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import PlayerCard from "@/components/players/player-card";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlayers } from "@/hooks/use-players";
import { calculateArchetypeScores, getTopArchetypes, TOP_ARCHETYPE_THRESHOLD } from "@/lib/positions/calculator";
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
                const archetypeScores = calculateArchetypeScores(player.traits);
                const topScores = getTopPositions(archetypeScores, 3);
                const topArchetypes = getTopArchetypes(archetypeScores);

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
                const threshold = p.overall - TOP_ARCHETYPE_THRESHOLD;
                return zonePositions.some((pos: Position) => (p.archetypeScores[pos]?.bestScore ?? 0) >= threshold);
            });
        }

        return [...result].sort((a, b) => b.overall - a.overall);
    }, [allPlayers, searchQuery, zoneFilter]);

    return (
        <div className={cn("flex flex-col h-full w-full px-4 pt-2 pb-4 space-y-1.5")}>
            {/* Search + zone filters */}
            <div className="space-y-1.5">
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
                    {ZONE_FILTERS.map((filter) => {
                        const isActive = zoneFilter === filter.value;
                        return (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => setZoneFilter(filter.value)}
                                className="relative text-xs font-medium px-3 py-1 rounded-lg transition-colors duration-200 active:scale-[0.97]"
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="zone-filter"
                                        className="absolute inset-0 rounded-lg bg-primary/15"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span
                                    className={cn(
                                        "relative z-10",
                                        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {filter.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Player Cards Grid */}
            <Card className="flex-1 flex flex-col min-h-0 bg-card overflow-hidden py-2 gap-0">
                <CardContent className="flex-1 h-full p-0">
                    <div className="h-full overflow-y-auto px-2 custom-scrollbar">
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
                                            stats={item.player.traits}
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
                            "relative flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors duration-200",
                            cardViewMode === mode ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {cardViewMode === mode && (
                            <motion.span
                                layoutId="card-view-mode"
                                className="absolute inset-0 rounded-lg bg-background shadow-sm"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">
                            {mode === "face-stats" ? "Stats" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
export default PlayerCards;
