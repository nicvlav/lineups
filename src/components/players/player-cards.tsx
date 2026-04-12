import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import PlayerCard from "@/components/players/player-card";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlayers } from "@/hooks/use-players";
import { cn } from "@/lib/utils";
import type { ZoneKey } from "@/types/traits";

export type CardViewMode = "minimal" | "capabilities" | "zones";

type ZoneFilter = "all" | ZoneKey;

const ZONE_FILTERS: { value: ZoneFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "att", label: "Attackers" },
    { value: "mid", label: "Midfielders" },
    { value: "def", label: "Defenders" },
];

const PlayerCards = () => {
    const { data: players = {} } = usePlayers();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");

    const allPlayers = useMemo(
        () =>
            Object.values(players)
                .map((player) => ({
                    player,
                    overall: player.overall,
                    bestZone: (["def", "mid", "att"] as const).reduce(
                        (best, z) => (player.zoneEffectiveness[z] > player.zoneEffectiveness[best] ? z : best),
                        "mid" as ZoneKey
                    ),
                }))
                .sort((a, b) => b.overall - a.overall),
        [players]
    );

    const filteredPlayers = useMemo(() => {
        let result = allPlayers;

        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter((p) => p.player.name.toLowerCase().includes(lower));
        }

        if (zoneFilter !== "all") {
            result = result.filter((p) => p.bestZone === zoneFilter);
        }

        return result;
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
                                            overall={item.overall}
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
        </div>
    );
};
export default PlayerCards;
